import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";

import { EmergencyEvidenceCapture } from "@/components/emergency-evidence-capture";
import { InfoCard, PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useSafety } from "@/lib/safety-context";

export default function EmergencyScreen() {
  const { currentIncident, privacy, updateActiveLocation, attachInputNote, completeEmergency } = useSafety();
  const [note, setNote] = useState(currentIncident?.note ?? "");

  useEffect(() => {
    if (!currentIncident || !privacy.liveLocationEnabled) return;
    let subscription: Location.LocationSubscription | undefined;
    let active = true;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active || !permission.granted) {
        Alert.alert("Location permission needed", "Live location sharing remains off because location permission was not granted.");
        return;
      }
      subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 }, (location) => updateActiveLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude, accuracyMeters: location.coords.accuracy, capturedAt: new Date(location.timestamp).toISOString() }));
    })().catch(() => Alert.alert("Live location unavailable", "The emergency remains active, but live location updates could not be started."));
    return () => { active = false; subscription?.remove(); };
  }, [currentIncident?.id, privacy.liveLocationEnabled, updateActiveLocation]);

  if (!currentIncident) return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.empty}><MaterialIcons name="verified-user" size={42} color={palette.teal} /><Text style={styles.emptyTitle}>No active emergency</Text><PrimaryButton label="Return to safety dashboard" onPress={() => router.replace("/(tabs)")} /></View></ScreenContainer>;

  const incident = currentIncident;
  const decision = incident.decision;
  const locationText = incident.location ? `${incident.location.latitude.toFixed(5)}, ${incident.location.longitude.toFixed(5)}` : "Location unavailable";
  const addressText = incident.location ? [incident.location.street, incident.location.village, incident.location.taluk, incident.location.district].filter(Boolean).join(", ") : "";
  const isSms = incident.deliveryChannel === "sms";
  const saveNote = (value: string) => { setNote(value); attachInputNote(value); };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.alertTop}><View style={styles.alertIcon}><MaterialIcons name="emergency" size={29} color={palette.white} /></View><View><Text style={styles.emergencyLabel}>EMERGENCY RESPONSE ACTIVE</Text><Text style={styles.triggerText}>{incident.triggerType.toUpperCase()} trigger received</Text></View></View>
    <SectionHeading title={decision ? `${decision.riskBand} response band` : "Preparing response"} detail="The rule engine evaluated trigger type, time, and available location before selecting delivery." />
    <InfoCard><StatusRow icon="my-location" label="GPS location" value={locationText} />{addressText ? <StatusRow icon="place" label="Resolved address" value={addressText} /> : null}<StatusRow icon="account-tree" label="Decision" value={decision ? `${decision.riskBand} · score ${decision.riskScore}/100` : "Evaluating"} /><StatusRow icon={isSms ? "sms" : "notifications-active"} label="Delivery" value={incident.deliveryDetail || incident.status.replace(/_/g, " ")} />{incident.smsDelivery ? <StatusRow icon={incident.smsDelivery.status === "sent" ? "check-circle" : "error"} label="SMS callback" value={`${incident.smsDelivery.status === "sent" ? "Successfully sent" : "Failed"} · ${incident.smsDelivery.recipient}`} /> : null}<StatusRow icon="link" label="Map link" value={incident.locationLinkSent ? "Included for notified contacts" : "Unavailable without GPS"} /></InfoCard>
    <InfoCard style={styles.reasonCard}><Text style={styles.reasonTitle}>Why this response was selected</Text>{decision?.reasons.map((reason) => <View style={styles.reason} key={reason}><MaterialIcons name="check-circle" size={16} color={palette.teal} /><Text style={styles.reasonText}>{reason}</Text></View>)}</InfoCard>
    {privacy.emergencyInputsEnabled ? <InfoCard style={styles.noteCard}><Text style={styles.noteTitle}>Emergency input note</Text><Text style={styles.noteHelp}>Optional context is saved with this incident when the session ends.</Text><TextInput value={note} onChangeText={saveNote} multiline placeholder="What should trusted contacts know?" placeholderTextColor="#5F6F80" style={styles.noteInput} /></InfoCard> : null}
    <EmergencyEvidenceCapture />
    {privacy.liveLocationEnabled ? <View style={styles.liveBanner}><MaterialIcons name="my-location" size={19} color={palette.teal} /><Text style={styles.liveText}>Live location is enabled for this active emergency. Updates remain on only while this screen is open and are stored as a temporary trail.</Text></View> : null}
    <PrimaryButton label="End emergency session" tone="outline" onPress={() => Alert.alert("End emergency session?", "This stops optional live location updates. Contacts may already have received the incident alert.", [{ text: "Keep active", style: "cancel" }, { text: "End session", style: "destructive", onPress: () => { completeEmergency(); router.replace("/(tabs)"); } }])} icon="stop-circle" />
  </ScrollView></ScreenContainer>;
}

function StatusRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; value: string }) { return <View style={styles.statusRow}><MaterialIcons name={icon} size={20} color={palette.navy} /><View style={styles.statusCopy}><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View></View>; }

const styles = StyleSheet.create({ content: { paddingVertical: 24, gap: 18 }, alertTop: { flexDirection: "row", alignItems: "center", gap: 12 }, alertIcon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: palette.red }, emergencyLabel: { color: palette.red, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, triggerText: { color: palette.ink, fontSize: 18, fontWeight: "800", marginTop: 3 }, statusRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }, statusCopy: { flex: 1, gap: 2 }, statusLabel: { color: palette.muted, fontSize: 12, fontWeight: "700" }, statusValue: { color: palette.ink, fontSize: 14, lineHeight: 20 }, reasonCard: { gap: 10, backgroundColor: "#EFF5FA" }, reasonTitle: { color: palette.navy, fontSize: 15, fontWeight: "800" }, reason: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, reasonText: { flex: 1, color: palette.ink, fontSize: 13, lineHeight: 19 }, noteCard: { gap: 8, backgroundColor: "#EFF5FA" }, noteTitle: { color: palette.navy, fontSize: 15, fontWeight: "800" }, noteHelp: { color: palette.ink, fontSize: 12 }, noteInput: { minHeight: 82, borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.white, padding: 12, color: palette.ink, textAlignVertical: "top" }, liveBanner: { flexDirection: "row", borderRadius: 14, gap: 9, backgroundColor: palette.paleTeal, padding: 13 }, liveText: { flex: 1, color: palette.navy, fontSize: 12, lineHeight: 18, fontWeight: "600" }, empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 }, emptyTitle: { color: palette.ink, fontSize: 20, fontWeight: "800" },
});
