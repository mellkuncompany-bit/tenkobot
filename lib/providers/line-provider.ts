/**
 * LINE Messaging API Provider
 */

import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export interface LINEMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: any;
}

export interface LINEPushResult {
  success: boolean;
  error?: string;
}

export class LINEProvider {
  private channelAccessToken: string;
  private channelSecret: string;

  constructor(channelAccessToken?: string, channelSecret?: string) {
    this.channelAccessToken = channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    this.channelSecret = channelSecret || process.env.LINE_CHANNEL_SECRET || "";
  }

  /**
   * Push message to LINE user
   */
  async pushMessage(userId: string, messages: LINEMessage[]): Promise<LINEPushResult> {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: userId,
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[LINE] Push message failed:", error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error("[LINE] Push message error:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Create clock-in message with postback action
   */
  createClockInMessage(staffId: string, shiftId: string): LINEMessage {
    return {
      type: "text",
      text: "出勤確認の時間です。下のリッチメニューから「出勤する」ボタンを押してください。",
    };
  }

  /**
   * Create work info message
   */
  createWorkInfoMessage(workName: string, description: string, notes: string): LINEMessage {
    return {
      type: "text",
      text: `【本日の作業内容】\n\n作業名: ${workName}\n\n${description}\n\n注意事項:\n${notes}`,
    };
  }

  /**
   * Verify LINE webhook signature
   */
  verifySignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac("SHA256", this.channelSecret)
      .update(body)
      .digest("base64");

    return hash === signature;
  }
}

/**
 * Get LINE provider instance with default credentials from environment variables
 */
export function getLINEProvider(): LINEProvider {
  return new LINEProvider();
}

/**
 * Get LINE provider instance for a specific organization
 * Fetches credentials from Firestore organization document
 */
export async function getLINEProviderForOrg(organizationId: string): Promise<LINEProvider> {
  try {
    const orgDoc = await adminDb
      .collection(COLLECTIONS.ORGANIZATIONS)
      .doc(organizationId)
      .get();

    if (!orgDoc.exists) {
      console.warn(`[LINE] Organization ${organizationId} not found, using environment variables`);
      return new LINEProvider();
    }

    const orgData = orgDoc.data();
    const lineConfig = orgData?.lineConfig;

    if (!lineConfig || !lineConfig.isConfigured) {
      console.warn(`[LINE] LINE config not set for organization ${organizationId}, using environment variables`);
      return new LINEProvider();
    }

    return new LINEProvider(
      lineConfig.channelAccessToken,
      lineConfig.channelSecret
    );
  } catch (error) {
    console.error(`[LINE] Error fetching LINE config for organization ${organizationId}:`, error);
    // Fallback to environment variables
    return new LINEProvider();
  }
}
