import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const emergencyContacts = mysqlTable("emergencyContacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  relationship: varchar("relationship", { length: 80 }).notNull().default("Trusted contact"),
  source: mysqlEnum("source", ["device_linked", "manual"]).notNull().default("manual"),
  confirmed: boolean("confirmed").notNull().default(false),
  pushToken: varchar("pushToken", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const safetyProfiles = mysqlTable("safetyProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  audioRecordingEnabled: int("audioRecordingEnabled").default(0).notNull(),
  photoCaptureEnabled: int("photoCaptureEnabled").default(0).notNull(),
  liveLocationEnabled: int("liveLocationEnabled").default(0).notNull(),
  emergencyInputsEnabled: int("emergencyInputsEnabled").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const emergencyIncidents = mysqlTable("emergencyIncidents", {
  id: varchar("id", { length: 80 }).primaryKey(),
  userId: int("userId").notNull(),
  triggerType: mysqlEnum("triggerType", ["manual", "voice", "shake"]).notNull(),
  riskBand: mysqlEnum("riskBand", ["Low", "Medium", "High", "Critical"]).notNull(),
  riskScore: int("riskScore").notNull(),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  accuracyMeters: int("accuracyMeters"),
  resolvedDistrict: varchar("resolvedDistrict", { length: 160 }),
  resolvedTaluk: varchar("resolvedTaluk", { length: 160 }),
  resolvedVillage: varchar("resolvedVillage", { length: 160 }),
  resolvedStreet: varchar("resolvedStreet", { length: 255 }),
  contactsNotified: text("contactsNotified"),
  locationLinkSent: boolean("locationLinkSent").notNull().default(false),
  note: text("note"),
  deliveryStatus: varchar("deliveryStatus", { length: 64 }).notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidence = mysqlTable("evidence", {
  id: varchar("id", { length: 96 }).primaryKey(),
  incidentId: varchar("incidentId", { length: 80 }).notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["photo", "audio", "location_trail", "input"]).notNull(),
  fileRef: text("fileRef"),
  capturedAt: timestamp("capturedAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  downloadCount: int("downloadCount").notNull().default(0),
});

export const retentionSettings = mysqlTable("retentionSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  retentionDays: int("retentionDays").notNull().default(30),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type EmergencyIncident = typeof emergencyIncidents.$inferSelect;
export type InsertEvidence = typeof evidence.$inferInsert;
