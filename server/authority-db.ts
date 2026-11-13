import { and, desc, eq, gte, lte } from "drizzle-orm";

import { emergencyIncidents, safetyProfiles, users } from "../drizzle/schema";
import { getDb } from "./db";

export type AuthorityIncidentFilter = { from?: Date; to?: Date };

export async function listAuthorityIncidents(filter: AuthorityIncidentFilter = {}) {
  const db = await getDb();
  if (!db) return [];

  const predicates = [];
  if (filter.from) predicates.push(gte(emergencyIncidents.occurredAt, filter.from));
  if (filter.to) predicates.push(lte(emergencyIncidents.occurredAt, filter.to));

  const rows = await db
    .select({
      incident: emergencyIncidents,
      user: { id: users.id, name: users.name, email: users.email },
      profile: { phone: safetyProfiles.phone, audioRecordingEnabled: safetyProfiles.audioRecordingEnabled, photoCaptureEnabled: safetyProfiles.photoCaptureEnabled, liveLocationEnabled: safetyProfiles.liveLocationEnabled },
    })
    .from(emergencyIncidents)
    .leftJoin(users, eq(emergencyIncidents.userId, users.id))
    .leftJoin(safetyProfiles, eq(emergencyIncidents.userId, safetyProfiles.userId))
    .where(predicates.length ? and(...predicates) : undefined)
    .orderBy(desc(emergencyIncidents.occurredAt));

  return rows.map(({ incident, user, profile }) => ({
    id: incident.id,
    userId: incident.userId,
    userName: user?.name ?? "Unnamed user",
    userEmail: user?.email ?? "Email unavailable",
    userPhone: profile?.phone ?? "Phone unavailable",
    triggerType: incident.triggerType,
    riskBand: incident.riskBand,
    riskScore: incident.riskScore,
    occurredAt: incident.occurredAt,
    exactLocation: [incident.resolvedStreet, incident.resolvedVillage, incident.resolvedTaluk, incident.resolvedDistrict].filter(Boolean).join(", ") || (incident.latitude && incident.longitude ? `${incident.latitude}, ${incident.longitude}` : "Location unavailable"),
    latitude: incident.latitude,
    longitude: incident.longitude,
    resolvedDistrict: incident.resolvedDistrict,
    resolvedTaluk: incident.resolvedTaluk,
    resolvedVillage: incident.resolvedVillage,
    resolvedStreet: incident.resolvedStreet,
    deliveryStatus: incident.deliveryStatus,
    note: incident.note,
    locationLinkSent: incident.locationLinkSent,
    locationEvidenceAuthorized: Boolean(profile?.liveLocationEnabled),
    audioEvidenceAuthorized: Boolean(profile?.audioRecordingEnabled),
    photoEvidenceAuthorized: Boolean(profile?.photoCaptureEnabled),
  }));
}

export async function getAuthorityProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, loginMethod: users.loginMethod, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}
