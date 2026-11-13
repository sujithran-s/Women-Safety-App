import * as Location from "expo-location";
import * as Network from "expo-network";
import * as SMS from "expo-sms";

import { sendDirectSms } from "./direct-sms";
import type { EmergencyContact, EmergencyIncident, SafetyLocation } from "@/shared/safety-types";

export async function captureCurrentSafetyLocation(): Promise<SafetyLocation | undefined> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) return undefined;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return undefined;
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const result: SafetyLocation = { latitude: current.coords.latitude, longitude: current.coords.longitude, accuracyMeters: current.coords.accuracy, capturedAt: new Date(current.timestamp).toISOString() };
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: result.latitude, longitude: result.longitude });
      const place = places[0];
      if (place) {
        result.district = place.district ?? place.subregion ?? undefined;
        result.taluk = place.subregion ?? undefined;
        result.village = place.city ?? place.district ?? undefined;
        result.street = [place.street, place.name].filter(Boolean).join(" ") || undefined;
      }
    } catch {
      // Preserve the exact coordinates if reverse geocoding is unavailable.
    }
    return result;
  } catch {
    return undefined;
  }
}

export async function checkInternetAtTriggerTime(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (typeof state.isInternetReachable === "boolean") return state.isInternetReachable;
    return Boolean(state.isConnected);
  } catch {
    return false;
  }
}

export function emergencySmsMessage(incident: EmergencyIncident) {
  const locationText = incident.location ? ` Location: https://maps.google.com/?q=${incident.location.latitude},${incident.location.longitude}` : " Location could not be captured.";
  const address = incident.location ? [incident.location.street, incident.location.village, incident.location.taluk, incident.location.district].filter(Boolean).join(", ") : "";
  const addressText = address ? ` Address: ${address}.` : "";
  const risk = incident.decision ? ` Risk band: ${incident.decision.riskBand}.` : "";
  const note = incident.note ? ` Note: ${incident.note}` : "";
  return `SAFETY ALERT: I triggered an emergency alert via ${incident.triggerType} SOS.${risk}${addressText}${locationText}${note}`;
}

export async function openOfflineSmsFallback(contacts: EmergencyContact[], incident: EmergencyIncident): Promise<{ opened: boolean; result?: string; messageId?: string }> {
  const recipients = contacts.map((contact) => contact.phone.trim()).filter(Boolean);
  if (recipients.length === 0) return { opened: false };
  const direct = await sendDirectSms(recipients, emergencySmsMessage(incident));
  if (direct.sent) return { opened: true, result: "queued", messageId: direct.messageId };
  if (direct.reason === "permission_denied") return { opened: false, result: "permission_denied" };
  try {
    const available = await SMS.isAvailableAsync();
    if (!available) return { opened: false };
    const response = await SMS.sendSMSAsync(recipients, emergencySmsMessage(incident));
    return { opened: true, result: response.result };
  } catch {
    return { opened: false };
  }
}
