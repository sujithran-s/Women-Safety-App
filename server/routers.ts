import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  cleanExpiredEvidence,
  createContact,
  createEvidence,
  deleteContact,
  dispatchExpoPush,
  getEvidenceForDownload,
  getRetentionDays,
  getSafetyPreferences,
  listContacts,
  listEvidence,
  listIncidents,
  persistIncident,
  saveRetentionDays,
  saveSafetyPreferences,
  updateContact,
  updateIncident,
} from "./safety-db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getAuthorityProfile, listAuthorityIncidents } from "./authority-db";
import { adminProcedure } from "./_core/trpc";

const incidentInput = z.object({
  incidentId: z.string().min(8).max(80),
  triggerType: z.enum(["manual", "voice", "shake"]),
  occurredAt: z.string().datetime(),
  riskBand: z.enum(["Low", "Medium", "High", "Critical"]),
  riskScore: z.number().int().min(0).max(100),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  accuracyMeters: z.number().finite().nonnegative().optional(),
  resolvedDistrict: z.string().max(160).optional(),
  resolvedTaluk: z.string().max(160).optional(),
  resolvedVillage: z.string().max(160).optional(),
  resolvedStreet: z.string().max(255).optional(),
  note: z.string().max(2000).optional(),
  contacts: z.array(z.object({ id: z.string().optional(), name: z.string().min(1).max(120), phone: z.string().min(3).max(32), pushToken: z.string().max(255).optional() })).max(20),
});

const contactInput = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^\+?[0-9][0-9\s().-]{6,30}$/, "Enter a valid mobile number"),
  relationship: z.string().trim().max(80).optional(),
  source: z.enum(["device_linked", "manual"]).default("manual"),
  confirmed: z.boolean().default(false),
  pushToken: z.string().trim().max(255).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  safety: router({
    contacts: router({
      list: protectedProcedure.query(({ ctx }) => listContacts(ctx.user.id)),
      create: protectedProcedure.input(contactInput).mutation(({ ctx, input }) => createContact(ctx.user.id, input)),
      update: protectedProcedure.input(contactInput.partial().extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => {
        const { id, ...updates } = input;
        return updateContact(ctx.user.id, id, updates);
      }),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteContact(ctx.user.id, input.id)),
    }),
    preferences: router({
      get: protectedProcedure.query(({ ctx }) => getSafetyPreferences(ctx.user.id)),
      save: protectedProcedure.input(z.object({ phone: z.string().max(32).optional(), audioRecordingEnabled: z.boolean(), photoCaptureEnabled: z.boolean(), liveLocationEnabled: z.boolean(), emergencyInputsEnabled: z.boolean().optional() })).mutation(({ ctx, input }) => saveSafetyPreferences(ctx.user.id, input)),
    }),
    incidents: router({
      list: protectedProcedure.query(({ ctx }) => listIncidents(ctx.user.id)),
    }),
    evidence: router({
      list: protectedProcedure.query(({ ctx }) => listEvidence(ctx.user.id)),
      create: protectedProcedure.input(z.object({ id: z.string().min(8).max(96), incidentId: z.string().min(8).max(80), type: z.enum(["photo", "audio", "location_trail", "input"]), fileRef: z.string().max(200000).optional(), capturedAt: z.string().datetime() })).mutation(async ({ ctx, input }) => createEvidence({ ...input, userId: ctx.user.id, retentionDays: await getRetentionDays(ctx.user.id) })),
      upload: protectedProcedure.input(z.object({ id: z.string().min(8).max(96), incidentId: z.string().min(8).max(80), type: z.enum(["photo", "audio"]), base64: z.string().min(1).max(50_000_000), contentType: z.string().max(120), capturedAt: z.string().datetime() })).mutation(async ({ ctx, input }) => {
        const stored = await storagePut(`safety/${ctx.user.id}/${input.incidentId}/${input.type}`, Buffer.from(input.base64, "base64"), input.contentType);
        return createEvidence({ id: input.id, incidentId: input.incidentId, userId: ctx.user.id, type: input.type, fileRef: stored.url, capturedAt: input.capturedAt, retentionDays: await getRetentionDays(ctx.user.id) });
      }),
      download: protectedProcedure.input(z.object({ id: z.string().min(8).max(96) })).query(async ({ ctx, input }) => {
        const item = await getEvidenceForDownload(ctx.user.id, input.id);
        if (!item) throw new Error("Evidence is unavailable or has expired");
        const fileRef = item.fileRef?.startsWith("/manus-storage/") ? await storageGetSignedUrl(item.fileRef.slice("/manus-storage/".length)) : item.fileRef;
        return { id: item.id, type: item.type, fileRef, expiresAt: item.expiresAt.toISOString(), downloadCount: item.downloadCount };
      }),
    }),
    retention: router({
      get: protectedProcedure.query(({ ctx }) => getRetentionDays(ctx.user.id)),
      save: protectedProcedure.input(z.object({ retentionDays: z.number().int().min(1).max(365) })).mutation(({ ctx, input }) => saveRetentionDays(ctx.user.id, input.retentionDays)),
    }),
    cleanup: protectedProcedure.mutation(() => cleanExpiredEvidence()),
  }),
  emergency: router({
    dispatch: protectedProcedure.input(incidentInput).mutation(async ({ ctx, input }) => {
      const contactsNotified = input.contacts.map((contact) => contact.id ?? contact.phone);
      const locationLink = input.latitude !== undefined && input.longitude !== undefined ? `https://maps.google.com/?q=${input.latitude},${input.longitude}` : undefined;
      await persistIncident({
        id: input.incidentId,
        userId: ctx.user.id,
        triggerType: input.triggerType,
        riskBand: input.riskBand,
        riskScore: input.riskScore,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        resolvedDistrict: input.resolvedDistrict,
        resolvedTaluk: input.resolvedTaluk,
        resolvedVillage: input.resolvedVillage,
        resolvedStreet: input.resolvedStreet,
        contactsNotified,
        locationLinkSent: Boolean(locationLink),
        note: input.note,
        occurredAt: input.occurredAt,
        deliveryStatus: "online_dispatch_requested",
      });
      const pushTokens = input.contacts.flatMap((contact) => (contact.pushToken ? [contact.pushToken] : []));
      const notificationAttempts = await dispatchExpoPush(pushTokens, input.incidentId, input.riskBand, locationLink).catch(() => 0);
      return { accepted: true, incidentId: input.incidentId, notificationAttempts, locationLinkSent: Boolean(locationLink) };
    }),
    update: protectedProcedure.input(z.object({ incidentId: z.string().min(8).max(80), note: z.string().max(2000).optional(), latitude: z.number().finite().optional(), longitude: z.number().finite().optional(), resolvedDistrict: z.string().max(160).optional(), resolvedTaluk: z.string().max(160).optional(), resolvedVillage: z.string().max(160).optional(), resolvedStreet: z.string().max(255).optional(), deliveryStatus: z.string().max(64).optional() })).mutation(({ ctx, input }) => {
      const { incidentId, ...updates } = input;
      return updateIncident(ctx.user.id, incidentId, updates);
    }),
  }),
  authority: router({
    profile: adminProcedure.query(({ ctx }) => getAuthorityProfile(ctx.user.id)),
    incidents: adminProcedure.input(z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() }).optional()).query(({ input }) => listAuthorityIncidents({ from: input?.from ? new Date(input.from) : undefined, to: input?.to ? new Date(input.to) : undefined })),
  }),
});

export type AppRouter = typeof appRouter;
