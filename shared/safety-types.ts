export type TriggerType = "manual" | "voice" | "shake";
export type RiskBand = "Low" | "Medium" | "High" | "Critical";
export type IncidentStatus =
  | "capturing_context"
  | "evaluating"
  | "dispatching_online"
  | "online_dispatched"
  | "opening_sms_fallback"
  | "sms_fallback_opened"
  | "sms_sent"
  | "sms_failed"
  | "sms_unavailable"
  | "completed";

export type SafetyLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  district?: string;
  taluk?: string;
  village?: string;
  street?: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  source?: "device_linked" | "manual";
  confirmed?: boolean;
  pushToken?: string;
};

export type PrivacySettings = {
  audioRecordingEnabled: boolean;
  photoCaptureEnabled: boolean;
  liveLocationEnabled: boolean;
  emergencyInputsEnabled: boolean;
};

export type EmergencyDecision = {
  riskBand: RiskBand;
  riskScore: number;
  reasons: string[];
  dispatchImmediately: boolean;
};

export type EvidenceType = "photo" | "audio" | "location_trail" | "input";

export type EvidenceRecord = {
  id: string;
  incidentId: string;
  type: EvidenceType;
  fileRef?: string;
  capturedAt: string;
  expiresAt: string;
  downloadCount: number;
};

export type EmergencyIncident = {
  id: string;
  triggerType: TriggerType;
  createdAt: string;
  location?: SafetyLocation;
  decision?: EmergencyDecision;
  status: IncidentStatus;
  deliveryChannel?: "online" | "sms";
  deliveryDetail?: string;
  smsMessageId?: string;
  smsDelivery?: { messageId: string; recipient: string; status: "sent" | "failed"; timestamp: string };
  note?: string;
  contactsNotified?: string[];
  locationLinkSent?: boolean;
  evidence?: {
    audioUri?: string;
    photoUri?: string;
    liveLocationUpdates?: number;
    locationTrail?: SafetyLocation[];
    inputNote?: string;
  };
};

export type AuditIncident = {
  id: string;
  triggerType: TriggerType;
  occurredAt: string;
  resolvedAddress: string;
  contactsNotified: string[];
  locationLinkSent: boolean;
};

export type SafetyProfile = {
  displayName: string;
  email: string;
  phone: string;
};

export type SafetyAppState = {
  onboardingCompleted: boolean;
  profile: SafetyProfile;
  contacts: EmergencyContact[];
  privacy: PrivacySettings;
  voicePhrase: string;
  voiceSosEnabled: boolean;
  shakeSosEnabled: boolean;
  currentIncident?: EmergencyIncident;
  recentIncidents: EmergencyIncident[];
};
