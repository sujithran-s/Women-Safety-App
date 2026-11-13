import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { InfoCard, PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useSafety } from "@/lib/safety-context";
import { trpc } from "@/lib/trpc";
import type { EvidenceType } from "@/shared/safety-types";

export default function SafetySettingsScreen() {
  const { isAuthenticated, loading } = useAuth();
  const { privacy, updatePrivacy, voicePhrase, updateVoicePhrase, voiceSosEnabled, setVoiceSosEnabled, shakeSosEnabled, setShakeSosEnabled } = useSafety();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const evidenceQuery = trpc.safety.evidence.list.useQuery(undefined, { enabled: isAuthenticated });
  const downloadQuery = trpc.safety.evidence.download.useQuery({ id: selectedEvidenceId ?? "evidence-unselected" }, { enabled: Boolean(selectedEvidenceId && isAuthenticated) });

  useEffect(() => {
    if (downloadQuery.data?.fileRef) {
      void Linking.openURL(downloadQuery.data.fileRef).catch(() => Alert.alert("Download unavailable", "This evidence is still retained, but its file reference could not be opened on this device."));
      setSelectedEvidenceId(null);
    }
  }, [downloadQuery.data]);

  if (loading) return <ScreenContainer />;
  if (!isAuthenticated) {
    router.replace("/auth");
    return <ScreenContainer />;
  }

  const enablePrivacy = (key: keyof typeof privacy, value: boolean) => {
    if (value) Alert.alert("Permission required", "The corresponding device permission will be requested only when an emergency capture starts. You can turn this choice off at any time.", [{ text: "Not now", style: "cancel" }, { text: "Continue", onPress: () => updatePrivacy({ [key]: true }) }]);
    else updatePrivacy({ [key]: false });
  };
  const evidenceLabel = (type: EvidenceType) => type === "location_trail" ? "Live-location trail" : type === "input" ? "Emergency input" : type === "photo" ? "Photo" : "Audio";
  const formatExpiry = (value: string | Date) => new Date(value).toLocaleDateString();

  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <SectionHeading eyebrow="Protected safety & privacy" title="You decide what is shared." detail="Optional evidence and live location are separate, off-by-default choices. Captured evidence is retained for 30 days by default and expires server-side." />
    <View style={styles.group}><Text style={styles.groupLabel}>OPTIONAL EMERGENCY EVIDENCE</Text><SettingRow icon="mic-none" title="Audio recording" detail="Record a real microphone clip during an emergency." value={privacy.audioRecordingEnabled} onValueChange={(value) => enablePrivacy("audioRecordingEnabled", value)} /><SettingRow icon="camera-alt" title="Photo capture" detail="Capture a real camera image during an emergency." value={privacy.photoCaptureEnabled} onValueChange={(value) => enablePrivacy("photoCaptureEnabled", value)} /><SettingRow icon="my-location" title="Live location sharing" detail="Stream a location trail while the emergency screen is open." value={privacy.liveLocationEnabled} onValueChange={(value) => enablePrivacy("liveLocationEnabled", value)} /></View>
    <View style={styles.group}><Text style={styles.groupLabel}>EMERGENCY INPUTS</Text><SettingRow icon="notes" title="Emergency notes and inputs" detail="Store the note entered during an active emergency with the incident." value={privacy.emergencyInputsEnabled} onValueChange={(value) => updatePrivacy({ emergencyInputsEnabled: value })} /><InfoCard><View style={styles.rowTop}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Voice SOS</Text><Text style={styles.rowDetail}>Recognizes your predefined phrase when native services and permissions allow.</Text></View><Switch value={voiceSosEnabled} onValueChange={setVoiceSosEnabled} trackColor={{ false: "#D6DFE7", true: "#80C5C0" }} thumbColor={voiceSosEnabled ? palette.teal : "#FFFFFF"} /></View><Text style={styles.inputLabel}>EMERGENCY PHRASE</Text><TextInput value={voicePhrase} onChangeText={updateVoicePhrase} style={styles.phraseInput} placeholder="help me now" placeholderTextColor="#5F6F80" returnKeyType="done" /></InfoCard><SettingRow icon="vibration" title="Shake-to-alert" detail="Requires multiple high-energy movement peaks within a short window." value={shakeSosEnabled} onValueChange={setShakeSosEnabled} /></View>
    <InfoCard><View style={styles.rowTop}><MaterialIcons name="schedule" size={21} color={palette.navy} /><View style={styles.rowCopy}><Text style={styles.rowTitle}>Retention window</Text><Text style={styles.rowDetail}>The backend default is 30 days. Expired evidence is not downloadable and is removed by scheduled cleanup.</Text></View></View></InfoCard>
    <View style={styles.group}><Text style={styles.groupLabel}>RETAINED EVIDENCE</Text>{evidenceQuery.isLoading ? <Text style={styles.rowDetail}>Loading retained evidence…</Text> : evidenceQuery.data?.length ? evidenceQuery.data.map((item) => <View key={item.id} style={styles.evidenceRow}><View style={styles.evidenceIcon}><MaterialIcons name={item.type === "photo" ? "photo" : item.type === "audio" ? "audiotrack" : item.type === "location_trail" ? "timeline" : "notes"} size={19} color={palette.teal} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{evidenceLabel(item.type)}</Text><Text style={styles.rowDetail}>Captured {formatExpiry(item.capturedAt)} · Expires {formatExpiry(item.expiresAt)}</Text></View><PrimaryButton label="Download" tone="outline" onPress={() => setSelectedEvidenceId(item.id)} style={styles.downloadButton} /></View>) : <Text style={styles.rowDetail}>No retained evidence yet. It will appear here after an authenticated emergency capture.</Text>}</View>
    <View style={styles.privacyNote}><MaterialIcons name="lock-outline" size={18} color={palette.navy} /><Text style={styles.privacyNoteText}>No wearable, BLE, ML/LLM, authority dashboard, fake-call, locator, or community-alert function is included in this Phase 1 update.</Text></View>
  </ScrollView></ScreenContainer>;
}

function SettingRow({ icon, title, detail, value, onValueChange }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) { return <View style={styles.setting}><View style={styles.settingIcon}><MaterialIcons name={icon} size={20} color={palette.navy} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#D6DFE7", true: "#80C5C0" }} thumbColor={value ? palette.teal : "#FFFFFF"} /></View>; }

const styles = StyleSheet.create({ content: { paddingTop: 16, paddingBottom: 28, gap: 20 }, group: { gap: 10 }, groupLabel: { color: palette.muted, fontWeight: "800", letterSpacing: 0.8, fontSize: 11, marginLeft: 2 }, setting: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 17, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, padding: 14 }, settingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#EFF5FA", alignItems: "center", justifyContent: "center" }, rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 }, rowCopy: { flex: 1, gap: 3 }, rowTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" }, rowDetail: { color: palette.ink, fontSize: 12, lineHeight: 18 }, inputLabel: { color: palette.navy, fontSize: 11, fontWeight: "800", letterSpacing: 0.7, marginTop: 4 }, phraseInput: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, color: palette.ink, fontSize: 16 }, evidenceRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border }, evidenceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.paleTeal, alignItems: "center", justifyContent: "center" }, downloadButton: { minHeight: 38, paddingHorizontal: 10 }, privacyNote: { flexDirection: "row", gap: 9, backgroundColor: "#EFF5FA", borderRadius: 16, padding: 14 }, privacyNoteText: { flex: 1, color: palette.navy, lineHeight: 19, fontSize: 12 },
});
