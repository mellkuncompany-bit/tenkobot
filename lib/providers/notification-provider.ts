/**
 * Notification Provider Interface
 * SMS/Call providers can be swapped (Stub -> Twilio -> other providers)
 */

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface CallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

export interface NotificationProvider {
  /**
   * Send SMS to the specified phone number
   */
  sendSMS(to: string, message: string): Promise<SMSResult>;

  /**
   * Make a call to the specified phone number
   */
  makeCall(to: string, message: string): Promise<CallResult>;
}

/**
 * Get the notification provider instance
 * Can be configured via environment variable
 */
export function getNotificationProvider(): NotificationProvider {
  const providerType = process.env.NOTIFICATION_PROVIDER || "stub";

  switch (providerType) {
    case "twilio":
      // Future implementation
      throw new Error("Twilio provider not implemented yet");
    case "stub":
    default:
      return new StubNotificationProvider();
  }
}

/**
 * Stub Notification Provider (for development)
 * Logs notifications instead of actually sending them
 */
export class StubNotificationProvider implements NotificationProvider {
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    console.log("[STUB SMS]", {
      to,
      message,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: `stub-sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async makeCall(to: string, message: string): Promise<CallResult> {
    console.log("[STUB CALL]", {
      to,
      message,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      callId: `stub-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}
