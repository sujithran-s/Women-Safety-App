import { and, desc, eq, lt } from "drizzle-orm";

import { emergencyContacts, emergencyIncidents, evidence, retentionSettings, safetyProfiles } from "../drizzle/schema";
import { getDb } from "./db";

export type ContactInput = {
  name: string;
  phone: string;
  relationship?: string;
  source?: "device_linked" | "manual";
  confirmed?: boolean;
  pushToken?: string;
};

export async function listContacts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
}

export async function createContact(userId: number, input: ContactInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(emergencyContacts).values({
    userId,
    name: input.name,
    phone: input.phone,
    relationship: input.relationship ?? "Trusted contact",
    source: input.source ?? "manual",
    confirmed: input.confirmed ?? false,
    pushToken: input.pushToken,
  });
  return { id: Number(result[0].insertId) };
}

export async function updateContact(userId: number, id: number, input: Partial<ContactInput>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(emergencyContacts).set(input).where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId)));
  return { success: true };
}

export async function deleteContact(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(emergencyContacts).where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId)));
  return { success: true };
}

export async function getSafetyPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const profiles = await db.select().from(safetyProfiles).where(eq(safetyProfiles.userId, userId)).limit(1);
  return profiles[0];
}

export async function saveSafetyPreferences(userId: number, input: { phone?: string; audioRecordingEnabled: boolean; photoCaptureEnabled: boolean; liveLocationEnabled: boolean; emergencyInputsEnabled?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    userId,
    phone: input.phone,
    audioRecordingEnabled: input.audioRecordingEnabled ? 1 : 0,
    photoCaptureEnabled: input.photoCaptureEnabled ? 1 : 0,
    liveLocationEnabled: input.liveLocationEnabled ? 1 : 0,
    emergencyInputsEnabled: input.emergencyInputsEnabled === false ? 0 : 1,
  };
  await db.insert(safetyProfiles).values(values).onDuplicateKeyUpdate({ set: values });
  return { success: true };
}

export type PersistedIncidentInput = {
  id: string;
  userId: number;
  triggerType: "manual" | "voice" | "shake";
  riskBand: "Low" | "Medium" | "High" | "Critical";
  riskScore: number;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  resolvedDistrict?: string;
  resolvedTaluk?: string;
  resolvedVillage?: string;
  resolvedStreet?: string;
  contactsNotified?: string[];
  locationLinkSent?: boolean;
  note?: string;
  occurredAt: string;
  deliveryStatus: string;
};

export async function persistIncident(input: PersistedIncidentInput) {
  const db = await getDb();
  if (!db) return input.id;
  await db.insert(emergencyIncidents).values({
    id: input.id,
    userId: input.userId,
    triggerType: input.triggerType,
    riskBand: input.riskBand,
    riskScore: input.riskScore,
    latitude: input.latitude?.toFixed(6),
    longitude: input.longitude?.toFixed(6),
    accuracyMeters: input.accuracyMeters ? Math.round(input.accuracyMeters) : null,
    resolvedDistrict: input.resolvedDistrict,
    resolvedTaluk: input.resolvedTaluk,
    resolvedVillage: input.resolvedVillage,
    resolvedStreet: input.resolvedStreet,
    contactsNotified: JSON.stringify(input.contactsNotified ?? []),
    locationLinkSent: input.locationLinkSent ?? Boolean(input.latitude !== undefined && input.longitude !== undefined),
    note: input.note,
    deliveryStatus: input.deliveryStatus,
    occurredAt: new Date(input.occurredAt),
  });
  return input.id;
}

export async function updateIncident(userId: number, incidentId: string, input: { note?: string; latitude?: number; longitude?: number; resolvedDistrict?: string; resolvedTaluk?: string; resolvedVillage?: string; resolvedStreet?: string; deliveryStatus?: string }) {
  const db = await getDb();
  if (!db) return { success: true };
  await db.update(emergencyIncidents).set({
    note: input.note,
    latitude: input.latitude?.toFixed(6),
    longitude: input.longitude?.toFixed(6),
    resolvedDistrict: input.resolvedDistrict,
    resolvedTaluk: input.resolvedTaluk,
    resolvedVillage: input.resolvedVillage,
    resolvedStreet: input.resolvedStreet,
    deliveryStatus: input.deliveryStatus,
  }).where(and(eq(emergencyIncidents.id, incidentId), eq(emergencyIncidents.userId, userId)));
  return { success: true };
}

export async function listIncidents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(emergencyIncidents).where(eq(emergencyIncidents.userId, userId)).orderBy(desc(emergencyIncidents.occurredAt));
  return rows.map((row) => ({
    ...row,
    contactsNotified: parseList(row.contactsNotified),
    resolvedAddress: [row.resolvedStreet, row.resolvedVillage, row.resolvedTaluk, row.resolvedDistrict].filter(Boolean).join(", ") || (row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : "Location unavailable"),
  }));
}

export async function getRetentionDays(userId: number) {
  const db = await getDb();
  if (!db) return 30;
  const rows = await db.select().from(retentionSettings).where(eq(retentionSettings.userId, userId)).limit(1);
  return rows[0]?.retentionDays ?? 30;
}

export async function saveRetentionDays(userId: number, retentionDays: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(retentionSettings).values({ userId, retentionDays }).onDuplicateKeyUpdate({ set: { retentionDays } });
  return { retentionDays };
}

export async function createEvidence(input: { id: string; incidentId: string; userId: number; type: "photo" | "audio" | "location_trail" | "input"; fileRef?: string; capturedAt: string; retentionDays: number }) {
  const db = await getDb();
  if (!db) return { ...input, expiresAt: new Date(Date.now() + input.retentionDays * 86400000).toISOString(), downloadCount: 0 };
  const expiresAt = new Date(new Date(input.capturedAt).getTime() + input.retentionDays * 86400000);
  await db.insert(evidence).values({ ...input, capturedAt: new Date(input.capturedAt), expiresAt });
  return { id: input.id, expiresAt: expiresAt.toISOString(), downloadCount: 0 };
}

export async function listEvidence(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evidence).where(eq(evidence.userId, userId)).orderBy(desc(evidence.capturedAt));
}

export async function getEvidenceForDownload(userId: number, id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(evidence).where(and(eq(evidence.id, id), eq(evidence.userId, userId))).limit(1);
  const item = rows[0];
  if (!item || item.expiresAt.getTime() <= Date.now()) return undefined;
  await db.update(evidence).set({ downloadCount: item.downloadCount + 1 }).where(eq(evidence.id, id));
  return item;
}

export async function cleanExpiredEvidence() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.delete(evidence).where(lt(evidence.expiresAt, new Date()));
  return Number(result[0].affectedRows ?? 0);
}

export async function dispatchExpoPush(tokens: string[], incidentId: string, riskBand: string, locationLink?: string) {
  const recipients = tokens.filter((token) => token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
  if (!recipients.length) return 0;
  const locationText = locationLink ? ` Location: ${locationLink}` : "";
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipients.map((to) => ({
      to,
      title: "Safety emergency alert",
      body: `A trusted contact has triggered a ${riskBand.toLowerCase()} safety incident.${locationText}`,
      data: { incidentId, locationLink },
      sound: "default",
    }))),
  });
  if (!response.ok) throw new Error("Push dispatch provider rejected the emergency payload");
  return recipients.length;
}

function parseList(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [] as string[];
  }
}
