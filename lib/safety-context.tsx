import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { addDirectSmsDeliveryListener } from "@/lib/direct-sms";
import { EmergencyDecisionEngine } from "@/lib/emergency-decision-engine";
import { captureCurrentSafetyLocation, checkInternetAtTriggerTime, openOfflineSmsFallback } from "@/lib/native-emergency";
import { trpc } from "@/lib/trpc";
import type { EmergencyContact, EmergencyIncident, EvidenceType, PrivacySettings, SafetyAppState, SafetyLocation, SafetyProfile, TriggerType } from "@/shared/safety-types";

const STORAGE_KEY = "phase1-safety-state";

const defaultState: SafetyAppState = {
  onboardingCompleted: false,
  profile: { displayName: "", email: "", phone: "" },
  contacts: [],
  privacy: { audioRecordingEnabled: false, photoCaptureEnabled: false, liveLocationEnabled: false, emergencyInputsEnabled: true },
  voicePhrase: "help me now",
  voiceSosEnabled: false,
  shakeSosEnabled: false,
  recentIncidents: [],
};

type SafetyContextValue = SafetyAppState & {
  hydrated: boolean;
  completeOnboarding: () => void;
  updateProfile: (profile: SafetyProfile) => void;
  addContact: (contact: Omit<EmergencyContact, "id">) => Promise<boolean>;
  updateContact: (contact: EmergencyContact) => void;
  removeContact: (id: string) => void;
  updatePrivacy: (updates: Partial<PrivacySettings>) => void;
  updateVoicePhrase: (value: string) => void;
  setVoiceSosEnabled: (value: boolean) => void;
  setShakeSosEnabled: (value: boolean) => void;
  startEmergency: (triggerType: TriggerType, options?: { shakePatternCount?: number }) => Promise<EmergencyIncident>;
  updateActiveLocation: (location: SafetyLocation) => void;
  attachEvidence: (evidence: { audioUri?: string; photoUri?: string }) => void;
  attachInputNote: (note: string) => void;
  completeEmergency: () => void;
};

const SafetyContext = createContext<SafetyContextValue | null>(null);

function createIncident(triggerType: TriggerType): EmergencyIncident {
  return {
    id: `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    triggerType,
    createdAt: new Date().toISOString(),
    status: "capturing_context",
    evidence: { liveLocationUpdates: 0, locationTrail: [] },
  };
}

function mapContact(contact: { id: number; name: string; phone: string; relationship: string; source: "device_linked" | "manual"; confirmed: boolean; pushToken: string | null }): EmergencyContact {
  return { id: String(contact.id), name: contact.name, phone: contact.phone, relationship: contact.relationship, source: contact.source, confirmed: contact.confirmed, pushToken: contact.pushToken ?? undefined };
}

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SafetyAppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const { isAuthenticated } = useAuth();
  const contactsQuery = trpc.safety.contacts.list.useQuery(undefined, { enabled: isAuthenticated });
  const preferencesQuery = trpc.safety.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const dispatchMutation = trpc.emergency.dispatch.useMutation();
  const updateIncidentMutation = trpc.emergency.update.useMutation();
  const createContactMutation = trpc.safety.contacts.create.useMutation();
  const updateContactMutation = trpc.safety.contacts.update.useMutation();
  const deleteContactMutation = trpc.safety.contacts.delete.useMutation();
  const savePreferencesMutation = trpc.safety.preferences.save.useMutation();
  const createEvidenceMutation = trpc.safety.evidence.create.useMutation();
  const uploadEvidenceMutation = trpc.safety.evidence.upload.useMutation();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Partial<SafetyAppState>;
        setState((current) => ({ ...current, ...stored, privacy: { ...current.privacy, ...stored.privacy } }));
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !contactsQuery.data) return;
    setState((current) => ({ ...current, contacts: contactsQuery.data.map(mapContact) }));
  }, [contactsQuery.data, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !preferencesQuery.data) return;
    setState((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        audioRecordingEnabled: Boolean(preferencesQuery.data?.audioRecordingEnabled),
        photoCaptureEnabled: Boolean(preferencesQuery.data?.photoCaptureEnabled),
        liveLocationEnabled: Boolean(preferencesQuery.data?.liveLocationEnabled),
        emergencyInputsEnabled: Boolean(preferencesQuery.data?.emergencyInputsEnabled ?? 1),
      },
      profile: { ...current.profile, phone: preferencesQuery.data?.phone ?? current.profile.phone },
    }));
  }, [isAuthenticated, preferencesQuery.data]);

  useEffect(() => {
    const subscription = addDirectSmsDeliveryListener((event) => {
      setState((current) => {
        const incident = current.currentIncident;
        if (!incident || incident.smsMessageId !== event.messageId) return current;
        const sent = event.status === "sent";
        return { ...current, currentIncident: { ...incident, status: sent ? "sms_sent" : "sms_failed", smsDelivery: event, deliveryDetail: sent ? `SMS sent successfully to ${event.recipient}.` : `SMS failed for ${event.recipient}. Check SIM service and SMS permission.` } };
      });
    });
    return () => subscription.remove();
  }, []);

  const commit = useCallback((updater: (current: SafetyAppState) => SafetyAppState) => {
    setState((current) => {
      const next = updater(current);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => commit((current) => ({ ...current, onboardingCompleted: true })), [commit]);
  const updateProfile = useCallback((profile: SafetyProfile) => commit((current) => ({ ...current, profile })), [commit]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, "id">) => {
    const local: EmergencyContact = { ...contact, id: `local-${Date.now()}`, confirmed: contact.confirmed ?? true, source: contact.source ?? "manual" };
    commit((current) => ({ ...current, contacts: [...current.contacts, local] }));
    if (!isAuthenticated) return true;
    try {
      await createContactMutation.mutateAsync({ ...contact, relationship: contact.relationship || "Trusted contact", source: contact.source ?? "manual", confirmed: contact.confirmed ?? true });
      await contactsQuery.refetch();
      return true;
    } catch {
      commit((current) => ({ ...current, contacts: current.contacts.filter((item) => item.id !== local.id) }));
      return false;
    }
  }, [commit, contactsQuery, createContactMutation, isAuthenticated]);

  const updateContact = useCallback((contact: EmergencyContact) => {
    commit((current) => ({ ...current, contacts: current.contacts.map((item) => (item.id === contact.id ? contact : item)) }));
    const id = Number(contact.id);
    if (isAuthenticated && Number.isInteger(id)) {
      void updateContactMutation.mutateAsync({ id, name: contact.name, phone: contact.phone, relationship: contact.relationship, source: contact.source, confirmed: contact.confirmed, pushToken: contact.pushToken }).catch(() => undefined);
    }
  }, [commit, isAuthenticated, updateContactMutation]);

  const removeContact = useCallback((id: string) => {
    commit((current) => ({ ...current, contacts: current.contacts.filter((item) => item.id !== id) }));
    const numericId = Number(id);
    if (isAuthenticated && Number.isInteger(numericId)) void deleteContactMutation.mutateAsync({ id: numericId }).catch(() => undefined);
  }, [commit, deleteContactMutation, isAuthenticated]);

  const updatePrivacy = useCallback((updates: Partial<PrivacySettings>) => {
    commit((current) => ({ ...current, privacy: { ...current.privacy, ...updates } }));
    if (isAuthenticated) {
      const next = { ...state.privacy, ...updates };
      void savePreferencesMutation.mutateAsync({ phone: state.profile.phone, audioRecordingEnabled: next.audioRecordingEnabled, photoCaptureEnabled: next.photoCaptureEnabled, liveLocationEnabled: next.liveLocationEnabled, emergencyInputsEnabled: next.emergencyInputsEnabled }).catch(() => undefined);
    }
  }, [commit, isAuthenticated, savePreferencesMutation, state.profile.phone, state.privacy]);

  const updateVoicePhrase = useCallback((voicePhrase: string) => commit((current) => ({ ...current, voicePhrase })), [commit]);
  const setVoiceSosEnabled = useCallback((voiceSosEnabled: boolean) => commit((current) => ({ ...current, voiceSosEnabled })), [commit]);
  const setShakeSosEnabled = useCallback((shakeSosEnabled: boolean) => commit((current) => ({ ...current, shakeSosEnabled })), [commit]);

  const startEmergency = useCallback(async (triggerType: TriggerType, options?: { shakePatternCount?: number }) => {
    const base = createIncident(triggerType);
    const trustedContacts = state.contacts.filter((contact) => contact.confirmed !== false);
    commit((current) => ({ ...current, currentIncident: base }));
    const [location, internetAvailable] = await Promise.all([captureCurrentSafetyLocation(), checkInternetAtTriggerTime()]);
    const decision = EmergencyDecisionEngine.evaluate({ triggerType, occurredAt: new Date(base.createdAt), location, shakePatternCount: options?.shakePatternCount });
    let incident: EmergencyIncident = { ...base, location, decision, status: "evaluating", contactsNotified: trustedContacts.map((contact) => contact.id), locationLinkSent: Boolean(location) };
    commit((current) => ({ ...current, currentIncident: incident }));

    if (internetAvailable) {
      incident = { ...incident, status: "dispatching_online" };
      commit((current) => ({ ...current, currentIncident: incident }));
      try {
        const response = await dispatchMutation.mutateAsync({
          incidentId: incident.id,
          triggerType: incident.triggerType,
          occurredAt: incident.createdAt,
          riskBand: decision.riskBand,
          riskScore: decision.riskScore,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracyMeters: location?.accuracyMeters ?? undefined,
          resolvedDistrict: location?.district,
          resolvedTaluk: location?.taluk,
          resolvedVillage: location?.village,
          resolvedStreet: location?.street,
          contacts: trustedContacts.map(({ id, name, phone, pushToken }) => ({ id, name, phone, pushToken })),
        });
        incident = response.notificationAttempts > 0
          ? { ...incident, status: "online_dispatched", deliveryChannel: "online", locationLinkSent: response.locationLinkSent, deliveryDetail: `Online alert dispatched to ${response.notificationAttempts} configured contact device(s), with a tappable map link.` }
          : { ...incident, status: "opening_sms_fallback", deliveryDetail: "No trusted contact app device is registered, so the phone SMS fallback is being opened." };
      } catch {
        incident = { ...incident, status: "opening_sms_fallback" };
      }
    } else {
      incident = { ...incident, status: "opening_sms_fallback" };
    }

    if (incident.status === "opening_sms_fallback") {
      const fallback = await openOfflineSmsFallback(trustedContacts, incident);
      incident = { ...incident, status: fallback.opened ? "sms_fallback_opened" : "sms_unavailable", deliveryChannel: fallback.opened ? "sms" : undefined, deliveryDetail: fallback.opened ? "SMS composer opened with the alert and GPS link. Tap Send to deliver it." : "SMS fallback could not open. Add a trusted contact and use a device with SMS capability." };
    }
    commit((current) => ({ ...current, currentIncident: incident }));
    return incident;
  }, [commit, dispatchMutation, state.contacts]);

  const updateActiveLocation = useCallback((location: SafetyLocation) => commit((current) => {
    if (!current.currentIncident) return current;
    const trail = [...(current.currentIncident.evidence?.locationTrail ?? []), location].slice(-120);
    return { ...current, currentIncident: { ...current.currentIncident, location, evidence: { ...current.currentIncident.evidence, locationTrail: trail, liveLocationUpdates: trail.length } } };
  }), [commit]);

  const attachEvidence = useCallback((nextEvidence: { audioUri?: string; photoUri?: string }) => {
    const incidentId = state.currentIncident?.id;
    commit((current) => current.currentIncident ? { ...current, currentIncident: { ...current.currentIncident, evidence: { ...current.currentIncident.evidence, ...nextEvidence } } } : current);
    if (isAuthenticated && incidentId) {
      const capturedAt = new Date().toISOString();
      for (const [type, fileRef] of Object.entries(nextEvidence)) {
        if (fileRef) {
          void (async () => {
            try {
              const base64 = await FileSystem.readAsStringAsync(fileRef, { encoding: FileSystem.EncodingType.Base64 });
              await uploadEvidenceMutation.mutateAsync({ id: `evidence-${Date.now()}-${type}`, incidentId, type: type === "audioUri" ? "audio" : "photo", base64, contentType: type === "audioUri" ? "audio/m4a" : "image/jpeg", capturedAt });
            } catch {
              await createEvidenceMutation.mutateAsync({ id: `evidence-${Date.now()}-${type}-local`, incidentId, type: type === "audioUri" ? "audio" : "photo", fileRef, capturedAt });
            }
          })().catch(() => undefined);
        }
      }
    }
  }, [commit, createEvidenceMutation, isAuthenticated, state.currentIncident?.id, uploadEvidenceMutation]);

  const attachInputNote = useCallback((note: string) => commit((current) => current.currentIncident ? { ...current, currentIncident: { ...current.currentIncident, note, evidence: { ...current.currentIncident.evidence, inputNote: note } } } : current), [commit]);

  const completeEmergency = useCallback(() => {
    const incident = state.currentIncident;
    if (!incident) return;
    if (isAuthenticated) {
      const capturedAt = new Date().toISOString();
      void updateIncidentMutation.mutateAsync({ incidentId: incident.id, note: incident.note, latitude: incident.location?.latitude, longitude: incident.location?.longitude, resolvedDistrict: incident.location?.district, resolvedTaluk: incident.location?.taluk, resolvedVillage: incident.location?.village, resolvedStreet: incident.location?.street, deliveryStatus: incident.status }).catch(() => undefined);
      const trail = incident.evidence?.locationTrail ?? [];
      if (trail.length) void createEvidenceMutation.mutateAsync({ id: `evidence-${Date.now()}-trail`, incidentId: incident.id, type: "location_trail", fileRef: JSON.stringify(trail), capturedAt }).catch(() => undefined);
      if (incident.note) void createEvidenceMutation.mutateAsync({ id: `evidence-${Date.now()}-input`, incidentId: incident.id, type: "input", fileRef: incident.note, capturedAt }).catch(() => undefined);
    }
    commit((current) => current.currentIncident ? { ...current, currentIncident: undefined, recentIncidents: [{ ...current.currentIncident, status: "completed" as const }, ...current.recentIncidents].slice(0, 10) } : current);
  }, [commit, createEvidenceMutation, isAuthenticated, state.currentIncident, updateIncidentMutation]);

  const value = useMemo<SafetyContextValue>(() => ({ ...state, hydrated, completeOnboarding, updateProfile, addContact, updateContact, removeContact, updatePrivacy, updateVoicePhrase, setVoiceSosEnabled, setShakeSosEnabled, startEmergency, updateActiveLocation, attachEvidence, attachInputNote, completeEmergency }), [state, hydrated, completeOnboarding, updateProfile, addContact, updateContact, removeContact, updatePrivacy, updateVoicePhrase, setVoiceSosEnabled, setShakeSosEnabled, startEmergency, updateActiveLocation, attachEvidence, attachInputNote, completeEmergency]);
  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const value = useContext(SafetyContext);
  if (!value) throw new Error("useSafety must be used within SafetyProvider");
  return value;
}
