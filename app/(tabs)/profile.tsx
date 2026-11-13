import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { InfoCard, PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { useSafety } from "@/lib/safety-context";
import { trpc } from "@/lib/trpc";

export default function ProfileScreen() {
  const { profile, updateProfile } = useSafety();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [draft, setDraft] = useState(profile);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const incidentsQuery = trpc.safety.incidents.list.useQuery(undefined, { enabled: isAuthenticated });
  const evidenceQuery = trpc.safety.evidence.list.useQuery(undefined, { enabled: isAuthenticated });
  const downloadQuery = trpc.safety.evidence.download.useQuery({ id: selectedEvidenceId ?? "evidence-unselected" }, { enabled: Boolean(selectedEvidenceId && isAuthenticated) });

  useEffect(() => {
    if (downloadQuery.data?.fileRef) {
      void Linking.openURL(downloadQuery.data.fileRef).catch(() => Alert.alert("Download unavailable", "This retained evidence could not be opened on the device."));
      setSelectedEvidenceId(null);
    }
  }, [downloadQuery.data]);

  if (loading) return <ScreenContainer />;
  if (!isAuthenticated) return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.signedOut}><MaterialIcons name="account-circle" size={56} color={palette.navy} /><SectionHeading eyebrow="Account" title="Sign in to view your safety history." detail="Your profile, emergency audit log, and re-downloadable evidence belong to your authenticated account." /><PrimaryButton label="Sign in / Sign up securely" tone="navy" icon="login" onPress={() => void startOAuthLogin()} /></View></ScreenContainer>;

  const save = () => { updateProfile(draft); Alert.alert("Profile saved", "Your local display preferences were updated. Account identity remains managed by your authenticated account."); };
  const formatDate = (value: string | Date) => new Date(value).toLocaleString();
  const evidenceLabel = (type: string) => type === "location_trail" ? "Location trail" : type === "input" ? "Emergency input" : type === "photo" ? "Photo" : "Audio";

  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <SectionHeading eyebrow="Authenticated account" title="Your safety profile" detail="Real account identity and activity history are read from the protected session and server records." />
    <InfoCard style={styles.accountCard}><View style={styles.accountIcon}><MaterialIcons name="person" size={25} color={palette.white} /></View><View style={styles.accountCopy}><Text style={styles.accountTitle}>{user?.name || "Signed-in user"}</Text><Text style={styles.accountDetail}>{user?.email || "Authenticated safety account"}</Text><Text style={styles.accountDetail}>Account ID: {user?.id}</Text></View></InfoCard>
    <PrimaryButton label="Sign out" tone="outline" onPress={() => void logout()} icon="logout" />
    <View style={styles.form}><Field label="Display name preference" value={draft.displayName || user?.name || ""} onChangeText={(displayName) => setDraft((current) => ({ ...current, displayName }))} placeholder="Your name" /><Field label="Phone" value={draft.phone} onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))} placeholder="+91 98765 43210" keyboardType="phone-pad" /><PrimaryButton label="Save profile preference" onPress={save} icon="save" /></View>
    <DropdownSection title="Emergency audit log" open={auditOpen} onPress={() => setAuditOpen((value) => !value)}><View style={styles.group}>{incidentsQuery.isLoading ? <Text style={styles.muted}>Loading incident history…</Text> : incidentsQuery.data?.length ? incidentsQuery.data.map((incident) => <InfoCard key={incident.id} style={styles.historyCard}><View style={styles.historyHeader}><MaterialIcons name="history" size={20} color={palette.teal} /><Text style={styles.historyTitle}>{incident.triggerType.toUpperCase()} · {incident.riskBand}</Text></View><Text style={styles.historyText}>Triggered {formatDate(incident.occurredAt)}</Text><Text style={styles.historyText}>Location: {incident.resolvedAddress}</Text><Text style={styles.historyText}>Signal sent to: {incident.contactsNotified.length ? incident.contactsNotified.join(", ") : "No contact identifier recorded"}</Text><Text style={styles.historyStatus}>{incident.locationLinkSent ? "Tappable map link included" : "Map link unavailable"}</Text></InfoCard>) : <Text style={styles.muted}>No authenticated emergency incidents recorded yet.</Text>}</View></DropdownSection>
    <DropdownSection title="Evidence history" open={evidenceOpen} onPress={() => setEvidenceOpen((value) => !value)}><View style={styles.group}>{evidenceQuery.isLoading ? <Text style={styles.muted}>Loading evidence history…</Text> : evidenceQuery.data?.length ? evidenceQuery.data.map((item) => <View key={item.id} style={styles.evidenceRow}><View style={styles.evidenceIcon}><MaterialIcons name={item.type === "photo" ? "photo" : item.type === "audio" ? "audiotrack" : item.type === "location_trail" ? "timeline" : "notes"} size={19} color={palette.teal} /></View><View style={styles.accountCopy}><Text style={styles.historyTitle}>{evidenceLabel(item.type)}</Text><Text style={styles.muted}>Incident {item.incidentId.slice(-12)}</Text><Text style={styles.muted}>Expires {formatDate(item.expiresAt)} · Downloads {item.downloadCount}</Text></View><PrimaryButton label="Re-download" tone="outline" onPress={() => setSelectedEvidenceId(item.id)} style={styles.downloadButton} /></View>) : <Text style={styles.muted}>No evidence history recorded yet.</Text>}</View></DropdownSection>
  </ScrollView></ScreenContainer>;
}

function DropdownSection({ title, open, onPress, children }: { title: string; open: boolean; onPress: () => void; children: React.ReactNode }) {
  return <View style={styles.dropdown}><Pressable onPress={onPress} style={styles.dropdownHeader}><Text style={styles.groupLabel}>{title.toUpperCase()}</Text><MaterialIcons name={open ? "expand-less" : "expand-more"} size={23} color={palette.navy} /></Pressable>{open ? children : null}</View>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#5F6F80" /></View>; }

const styles = StyleSheet.create({ content: { paddingTop: 16, paddingBottom: 28, gap: 18 }, signedOut: { flex: 1, justifyContent: "center", gap: 20 }, accountCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#EFF5FA" }, accountIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, accountCopy: { flex: 1, gap: 3 }, accountTitle: { color: palette.navy, fontWeight: "800", fontSize: 16 }, accountDetail: { color: palette.ink, fontSize: 13, lineHeight: 18 }, form: { gap: 14 }, field: { gap: 6 }, label: { color: palette.navy, fontSize: 13, fontWeight: "700" }, input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.white, paddingHorizontal: 13, color: palette.ink, fontSize: 16 }, dropdown: { gap: 10 }, dropdownHeader: { minHeight: 46, paddingHorizontal: 12, borderRadius: 13, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, group: { gap: 10 }, groupLabel: { color: palette.muted, fontWeight: "800", letterSpacing: 0.8, fontSize: 11, marginLeft: 2 }, historyCard: { gap: 6 }, historyHeader: { flexDirection: "row", alignItems: "center", gap: 8 }, historyTitle: { color: palette.navy, fontWeight: "800", fontSize: 14 }, historyText: { color: palette.ink, fontSize: 13, lineHeight: 19 }, historyStatus: { color: palette.teal, fontSize: 12, fontWeight: "700" }, muted: { color: palette.ink, fontSize: 12, lineHeight: 18 }, evidenceRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border }, evidenceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.paleTeal, alignItems: "center", justifyContent: "center" }, downloadButton: { minHeight: 38, paddingHorizontal: 10 },
});
