import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { InfoCard, PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { buildAuthorityExportHtml, type AuthorityExportRow } from "@/lib/authority-export";
import { trpc } from "@/lib/trpc";

type RangeKey = "today" | "yesterday" | "week" | "month" | "year" | "all";
type AuthorityIncident = {
  id: string; userId: number; userName: string; userEmail: string; userPhone: string; triggerType: "manual" | "voice" | "shake";
  riskBand: "Low" | "Medium" | "High" | "Critical"; riskScore: number; occurredAt: string | Date; exactLocation: string;
  latitude: string | null; longitude: string | null; resolvedDistrict: string | null; resolvedTaluk: string | null;
  resolvedVillage: string | null; resolvedStreet: string | null; deliveryStatus: string; note: string | null;
  locationLinkSent: boolean; locationEvidenceAuthorized: boolean; audioEvidenceAuthorized: boolean; photoEvidenceAuthorized: boolean;
};

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" }, { key: "week", label: "Last week" },
  { key: "month", label: "Last month" }, { key: "year", label: "Last year" }, { key: "all", label: "All records" },
];

function rangeDates(key: RangeKey) {
  if (key === "all") return {};
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  if (key === "yesterday") { start.setDate(start.getDate() - 1); end.setTime(start.getTime() + 86400000 - 1); }
  if (key === "week") start.setDate(start.getDate() - 7);
  if (key === "month") start.setMonth(start.getMonth() - 1);
  if (key === "year") start.setFullYear(start.getFullYear() - 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function fileDownload(content: string, filename: string, type: string) {
  if (Platform.OS !== "web") { Alert.alert("Export available on web", "Open the authority dashboard in a browser to download formatted files."); return; }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportRows(rows: AuthorityIncident[], format: "doc" | "excel" | "pdf", title: string) {
  const html = buildAuthorityExportHtml(rows as AuthorityExportRow[], title);
  if (format === "pdf" && Platform.OS === "web") { const printWindow = window.open("", "_blank", "width=1100,height=800"); if (printWindow) { printWindow.document.write(html); printWindow.document.close(); printWindow.focus(); printWindow.print(); } return; }
  if (format === "doc") fileDownload(html, `${title.replace(/\s+/g, "-").toLowerCase()}.doc`, "application/msword");
  if (format === "excel") fileDownload(html, `${title.replace(/\s+/g, "-").toLowerCase()}.xls`, "application/vnd.ms-excel");
}

export default function AuthorityDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [range, setRange] = useState<RangeKey>("today");
  const [rangeOpen, setRangeOpen] = useState(false);
  const query = trpc.authority.incidents.useQuery(rangeDates(range), { enabled: isAuthenticated && user?.role === "admin" });
  const profileQuery = trpc.authority.profile.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const rows = (query.data ?? []) as AuthorityIncident[];
  const stats = useMemo(() => ({ total: rows.length, high: rows.filter((row) => row.riskBand === "High" || row.riskBand === "Critical").length, locations: rows.filter((row) => row.latitude && row.longitude).length }), [rows]);

  if (loading) return <ScreenContainer />;
  if (!isAuthenticated) return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.center}><SectionHeading eyebrow="Authority access" title="Sign in to continue." detail="The authority dashboard requires an authenticated admin account." /><PrimaryButton label="Authority sign in / sign up" tone="navy" icon="login" onPress={() => router.replace("/authority-auth")} /></View></ScreenContainer>;
  if (user?.role !== "admin") return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.center}><MaterialIcons name="lock" size={52} color={palette.red} /><SectionHeading eyebrow="Access restricted" title="Admin authorization required." detail="This account is authenticated but is not provisioned as an authority/admin. User records and SOS locations remain protected." /><PrimaryButton label="Back to user app" tone="outline" onPress={() => router.replace("/(tabs)")} /><PrimaryButton label="Sign out" tone="navy" onPress={() => void logout()} /></View></ScreenContainer>;

  const profile = profileQuery.data ?? user;
  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topRow}><View style={styles.brand}><View style={styles.brandIcon}><MaterialIcons name="admin-panel-settings" size={23} color={palette.white} /></View><View><Text style={styles.eyebrow}>Authority intelligence</Text><Text style={styles.title}>Safety Response Dashboard</Text></View></View><Pressable onPress={() => void logout()} style={styles.logout}><MaterialIcons name="logout" size={18} color={palette.navy} /><Text style={styles.logoutText}>Sign out</Text></Pressable></View>
    <SectionHeading title="Incident monitoring" detail="Observed SOS records are shown by time range. Risk scores and bands are modeled context and must not be treated as confirmed crime data." />
    <InfoCard style={styles.profileCard}><View style={styles.avatar}><MaterialIcons name="verified-user" size={25} color={palette.white} /></View><View style={styles.profileCopy}><Text style={styles.profileName}>{profile?.name || "Authority administrator"}</Text><Text style={styles.profileText}>{profile?.email || "No email available"}</Text><Text style={styles.profileText}>Role: {profile?.role === "admin" ? "Administrator / Authority" : profile?.role}</Text><Text style={styles.profileText}>Signed in: {profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleString() : "Current session"}</Text></View></InfoCard>
    <View style={styles.statGrid}><Stat label="Records" value={String(stats.total)} icon="description" /><Stat label="High / critical" value={String(stats.high)} icon="warning" tone="red" /><Stat label="With GPS" value={String(stats.locations)} icon="location-on" /></View>
    <View style={styles.dropdown}><Pressable onPress={() => setRangeOpen((open) => !open)} style={styles.dropdownHeader}><View><Text style={styles.dropdownLabel}>TIME RANGE</Text><Text style={styles.dropdownValue}>{ranges.find((item) => item.key === range)?.label}</Text></View><MaterialIcons name={rangeOpen ? "expand-less" : "expand-more"} size={24} color={palette.navy} /></Pressable>{rangeOpen ? <View style={styles.options}>{ranges.map((item) => <Pressable key={item.key} onPress={() => { setRange(item.key); setRangeOpen(false); }} style={[styles.option, range === item.key && styles.selectedOption]}><Text style={[styles.optionText, range === item.key && styles.selectedOptionText]}>{item.label}</Text></Pressable>)}</View> : null}</View>
    <View style={styles.exportCard}><View style={styles.exportHeader}><View><Text style={styles.cardTitle}>Formatted exports</Text><Text style={styles.cardText}>Export the filtered collective or any individual user incident as DOC, PDF, or Excel.</Text></View><MaterialIcons name="file-download" size={24} color={palette.teal} /></View><View style={styles.exportButtons}><SmallButton label="All DOC" onPress={() => exportRows(rows, "doc", `authority-${range}`)} /><SmallButton label="All PDF" onPress={() => exportRows(rows, "pdf", `authority-${range}`)} /><SmallButton label="All Excel" onPress={() => exportRows(rows, "excel", `authority-${range}`)} /></View></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>User SOS records</Text><Text style={styles.sectionHint}>User identity and exact trigger location</Text></View>
    {query.isLoading ? <Text style={styles.muted}>Loading authority records…</Text> : rows.length ? rows.map((row) => <IncidentCard key={row.id} row={row} />) : <InfoCard><Text style={styles.muted}>No SOS records found for this time range.</Text></InfoCard>}
  </ScrollView></ScreenContainer>;
}

function IncidentCard({ row }: { row: AuthorityIncident }) { const [open, setOpen] = useState(false); return <InfoCard style={styles.incidentCard}><Pressable onPress={() => setOpen((value) => !value)} style={styles.incidentHeader}><View style={[styles.riskIcon, { backgroundColor: row.riskBand === "Low" ? palette.paleTeal : row.riskBand === "Medium" ? palette.paleAmber : palette.paleRed }]}><MaterialIcons name="priority-high" size={20} color={row.riskBand === "Low" ? palette.teal : row.riskBand === "Medium" ? palette.amber : palette.red} /></View><View style={styles.incidentCopy}><Text style={styles.incidentName}>{row.userName}</Text><Text style={styles.incidentMeta}>{new Date(row.occurredAt).toLocaleString()} · {row.triggerType.toUpperCase()}</Text><Text style={styles.riskText}>{row.riskBand} risk · modeled score {row.riskScore}/100</Text></View><MaterialIcons name={open ? "expand-less" : "expand-more"} size={23} color={palette.navy} /></Pressable>{open ? <View style={styles.details}><Detail label="User email" value={row.userEmail} /><Detail label="User phone" value={row.userPhone} /><Detail label="Exact SOS location" value={row.exactLocation} /><Detail label="Delivery status" value={row.deliveryStatus} /><Detail label="Evidence access" value={`Location ${row.locationEvidenceAuthorized ? "authorized" : "not authorized"} · Photo ${row.photoEvidenceAuthorized ? "authorized" : "not authorized"} · Audio ${row.audioEvidenceAuthorized ? "authorized" : "not authorized"}`} />{row.note ? <Detail label="User note" value={row.note} /> : null}<View style={styles.rowButtons}><SmallButton label="DOC" onPress={() => exportRows([row], "doc", `incident-${row.id}`)} /><SmallButton label="PDF" onPress={() => exportRows([row], "pdf", `incident-${row.id}`)} /><SmallButton label="Excel" onPress={() => exportRows([row], "excel", `incident-${row.id}`)} /></View></View> : null}</InfoCard>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function Stat({ label, value, icon, tone = "teal" }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; tone?: "teal" | "red" }) { return <View style={styles.stat}><MaterialIcons name={icon} size={19} color={tone === "red" ? palette.red : palette.teal} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function SmallButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}><Text style={styles.smallButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({ content: { paddingTop: 16, paddingBottom: 32, gap: 16 }, center: { flex: 1, justifyContent: "center", gap: 20 }, topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }, brandIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, eyebrow: { color: palette.teal, fontSize: 10, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" }, title: { color: palette.navy, fontSize: 18, fontWeight: "900" }, logout: { flexDirection: "row", alignItems: "center", gap: 5, padding: 8 }, logoutText: { color: palette.navy, fontWeight: "800", fontSize: 12 }, profileCard: { flexDirection: "row", gap: 12, backgroundColor: "#EFF5FA" }, avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, profileCopy: { flex: 1, gap: 3 }, profileName: { color: palette.navy, fontSize: 16, fontWeight: "900" }, profileText: { color: palette.ink, fontSize: 12, lineHeight: 17 }, statGrid: { flexDirection: "row", gap: 9 }, stat: { flex: 1, borderRadius: 15, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, padding: 11, gap: 4 }, statValue: { color: palette.navy, fontSize: 22, fontWeight: "900" }, statLabel: { color: palette.muted, fontSize: 11, fontWeight: "700" }, dropdown: { gap: 7 }, dropdownHeader: { minHeight: 58, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.white, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dropdownLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }, dropdownValue: { color: palette.navy, fontSize: 16, fontWeight: "800", marginTop: 3 }, options: { borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.white, overflow: "hidden" }, option: { padding: 13, borderBottomWidth: 1, borderBottomColor: palette.border }, selectedOption: { backgroundColor: palette.paleTeal }, optionText: { color: palette.ink, fontWeight: "700" }, selectedOptionText: { color: palette.teal }, exportCard: { borderRadius: 17, backgroundColor: palette.paleTeal, padding: 14, gap: 12 }, exportHeader: { flexDirection: "row", gap: 10 }, cardTitle: { color: palette.navy, fontSize: 15, fontWeight: "900" }, cardText: { color: palette.ink, fontSize: 12, lineHeight: 18, flex: 1 }, exportButtons: { flexDirection: "row", gap: 7 }, smallButton: { minHeight: 34, borderRadius: 10, paddingHorizontal: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.teal, alignItems: "center", justifyContent: "center" }, smallButtonText: { color: palette.teal, fontSize: 11, fontWeight: "900" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, sectionHeader: { gap: 2 }, sectionTitle: { color: palette.navy, fontSize: 18, fontWeight: "900" }, sectionHint: { color: palette.muted, fontSize: 12 }, incidentCard: { gap: 10 }, incidentHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, riskIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" }, incidentCopy: { flex: 1, gap: 2 }, incidentName: { color: palette.navy, fontSize: 15, fontWeight: "900" }, incidentMeta: { color: palette.muted, fontSize: 11 }, riskText: { color: palette.teal, fontSize: 12, fontWeight: "800" }, details: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 10, gap: 8 }, detail: { gap: 2 }, detailLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }, detailValue: { color: palette.ink, fontSize: 13, lineHeight: 18 }, rowButtons: { flexDirection: "row", gap: 7, marginTop: 4 }, muted: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
