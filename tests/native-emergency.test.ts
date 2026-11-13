import { beforeEach, describe, expect, it, vi } from "vitest";

const locationMocks = vi.hoisted(() => ({
  hasServicesEnabledAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  reverseGeocodeAsync: vi.fn(),
}));
const networkMocks = vi.hoisted(() => ({ getNetworkStateAsync: vi.fn() }));
const smsMocks = vi.hoisted(() => ({ isAvailableAsync: vi.fn(), sendSMSAsync: vi.fn() }));

vi.mock("expo-location", () => ({ ...locationMocks, Accuracy: { High: 6 } }));
vi.mock("expo-network", () => networkMocks);
vi.mock("expo-sms", () => smsMocks);

import { captureCurrentSafetyLocation, checkInternetAtTriggerTime, emergencySmsMessage, openOfflineSmsFallback } from "../lib/native-emergency";
import { dispatchExpoPush } from "../server/safety-db";
import type { EmergencyIncident } from "../shared/safety-types";

const incident: EmergencyIncident = {
  id: "incident-test-123",
  triggerType: "manual",
  createdAt: "2026-08-24T10:00:00.000Z",
  status: "opening_sms_fallback",
  decision: { riskBand: "High", riskScore: 70, reasons: ["Test"], dispatchImmediately: true },
  location: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 8, capturedAt: "2026-08-24T10:00:00.000Z" },
};

describe("native emergency delivery adapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("captures a precise GPS payload when location services and permission are available", async () => {
    locationMocks.hasServicesEnabledAsync.mockResolvedValue(true);
    locationMocks.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    locationMocks.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 19.076, longitude: 72.8777, accuracy: 8 }, timestamp: 1724493600000 });
    await expect(captureCurrentSafetyLocation()).resolves.toEqual({ latitude: 19.076, longitude: 72.8777, accuracyMeters: 8, capturedAt: "2024-08-24T10:00:00.000Z" });
  });

  it("adds the available Indian address hierarchy without losing the GPS point", async () => {
    locationMocks.hasServicesEnabledAsync.mockResolvedValue(true);
    locationMocks.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    locationMocks.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 11.0168, longitude: 76.9558, accuracy: 7 }, timestamp: 1724493600000 });
    locationMocks.reverseGeocodeAsync.mockResolvedValue([{ district: "Coimbatore", subregion: "Coimbatore South", city: "Coimbatore", street: "Avinashi Road", name: "Gandhipuram" }]);
    await expect(captureCurrentSafetyLocation()).resolves.toMatchObject({ latitude: 11.0168, longitude: 76.9558, district: "Coimbatore", taluk: "Coimbatore South", village: "Coimbatore", street: "Avinashi Road Gandhipuram" });
  });

  it("checks reachability at the trigger moment and opens an SMS fallback with a GPS link", async () => {
    networkMocks.getNetworkStateAsync.mockResolvedValue({ isInternetReachable: false, isConnected: true });
    smsMocks.isAvailableAsync.mockResolvedValue(true);
    smsMocks.sendSMSAsync.mockResolvedValue({ result: "sent" });
    await expect(checkInternetAtTriggerTime()).resolves.toBe(false);
    await expect(openOfflineSmsFallback([{ id: "c1", name: "Asha", phone: "+15550000000", relationship: "Friend" }], incident)).resolves.toEqual({ opened: true, result: "sent" });
    expect(smsMocks.sendSMSAsync).toHaveBeenCalledWith(["+15550000000"], expect.stringContaining("maps.google.com"));
    expect(emergencySmsMessage(incident)).toContain("High");
  });

  it("sends online alert payloads only to valid Expo notification endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await expect(dispatchExpoPush(["ExpoPushToken[contact-device]", "not-a-push-token"], incident.id, "High")).resolves.toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)[0]).toMatchObject({ title: "Safety emergency alert", data: { incidentId: incident.id } });
  });

  it("includes the same direct map link in online notification data and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const link = "https://maps.google.com/?q=11.0168,76.9558";
    await expect(dispatchExpoPush(["ExpoPushToken[contact-device]"], incident.id, "High", link)).resolves.toBe(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)[0]).toMatchObject({ data: { incidentId: incident.id, locationLink: link } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)[0].body).toContain(link);
  });
});
