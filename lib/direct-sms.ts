export type SmsDeliveryEvent = { messageId: string; recipient: string; status: "sent" | "failed"; timestamp: string };

export function addDirectSmsDeliveryListener(_listener: (event: SmsDeliveryEvent) => void): { remove: () => void } {
  return { remove: () => undefined };
}

export async function sendDirectSms(_recipients: string[], _message: string): Promise<{ sent: boolean; reason?: string; messageId?: string }> {
  return { sent: false, reason: "android_only" };
}
