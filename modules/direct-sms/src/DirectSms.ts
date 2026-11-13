import { EventEmitter, requireNativeModule, type EventSubscription } from "expo-modules-core";

type SmsDeliveryEvent = {
  messageId: string;
  recipient: string;
  status: "sent" | "failed";
  timestamp: string;
};

type DirectSmsEvents = {
  onSmsDelivery: (event: SmsDeliveryEvent) => void;
};

type DirectSmsNative = {
  requestPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  sendAsync: (recipients: string[], message: string) => Promise<string>;
};

const nativeModule = requireNativeModule<DirectSmsNative>("DirectSms");
const emitter = new EventEmitter<DirectSmsEvents>(nativeModule as never);

export function addDirectSmsDeliveryListener(listener: (event: SmsDeliveryEvent) => void): EventSubscription {
  return emitter.addListener("onSmsDelivery", listener);
}

export async function sendDirectSms(recipients: string[], message: string): Promise<{ sent: boolean; reason?: string; messageId?: string }> {
  try {
    const permission = await nativeModule.requestPermissionsAsync();
    if (!permission.granted && permission.status !== "granted") return { sent: false, reason: "permission_denied" };
    const messageId = await nativeModule.sendAsync(recipients, message);
    return { sent: true, messageId };
  } catch {
    return { sent: false, reason: "native_sms_unavailable" };
  }
}
