import { NextRequest, NextResponse } from "next/server";
import { notifyDriverAssignment } from "@/lib/services/line-notification-service";
import { getShift } from "@/lib/services/shift-service";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Send LINE notification when driver is assigned to a shift
 * POST /api/notify-driver-assignment
 * Body: { shiftId: string, organizationId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shiftId, organizationId } = body;

    if (!shiftId || !organizationId) {
      return NextResponse.json(
        { error: "Missing shiftId or organizationId" },
        { status: 400 }
      );
    }

    // Get shift information
    const shift = await getShift(shiftId);
    if (!shift) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 }
      );
    }

    // Check if driver is assigned
    if (!shift.driverAssignment) {
      return NextResponse.json(
        { success: true, message: "No driver assigned, notification skipped" },
        { status: 200 }
      );
    }

    // Send LINE notification
    const result = await notifyDriverAssignment(
      organizationId,
      shift,
      shift.driverAssignment
    );

    if (!result.success) {
      console.error("[API] Notification failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Notification failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Notification sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] Error sending notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
