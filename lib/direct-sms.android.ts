import { addDirectSmsDeliveryListener as addNativeListener, sendDirectSms as sendNativeDirectSms } from "direct-sms";

export const addDirectSmsDeliveryListener = addNativeListener;
export const sendDirectSms = sendNativeDirectSms;
