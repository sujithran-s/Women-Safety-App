import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { InfoCard, SectionHeading, StatusDot, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { ShakeSosListener, VoiceSosListener } from "@/components/trigger-listeners";
import { useSafety } from "@/lib/safety-context";

export default function HomeScreen() {
  const { hydrated, onboardingCompleted, contacts, voiceSosEnabled, shakeSosEnabled, voicePhrase, startEmergency } = useSafety();
  const [holding, setHolding] = useState(false);
  useEffect(() => {
    if (hydrated && !onboardingCompleted) router.replace("/onboarding");
  }, [hydrated, onboardingCompleted]);
  const trigger = async (type: "manual" | "voice" | "shake") => {
    await startEmergency(type, type === "shake" ? { shakePatternCount: 3 } : undefined);
    router.push("/emergency");
  };
  if (!hydrated) return <ScreenContainer />;
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <VoiceSosListener enabled={voiceSosEnabled} phrase={voicePhrase} onMatch={() => void trigger("voice")} />
      <ShakeSosListener enabled={shakeSosEnabled} onPattern={() => void trigger("shake")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}><View><Text style={styles.overline}>SAFETY DASHBOARD</Text><Text style={styles.greeting}>Ready when you need it.</Text></View><View style={styles.readyPill}><StatusDot /><Text style={styles.readyText}>System ready</Text></View></View>
        <View style={styles.sosArea}>
          <Text style={styles.sosHint}>Press and hold to start an emergency response</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Press and hold emergency SOS"
            delayLongPress={800}
            onLongPress={() => void trigger("manual")}
            onPressIn={() => setHolding(true)}
            onPressOut={() => setHolding(false)}
            style={[styles.sosButton, holding && styles.sosHolding]}
          ><MaterialIcons name="emergency" size={41} color={palette.white} /><Text style={styles.sosText}>SOS</Text><Text style={styles.sosSubtext}>HOLD</Text></Pressable>
          <Text style={styles.sosFootnote}>Your trigger, current time, and GPS location are evaluated before alert delivery.</Text>
        </View>
        <View style={styles.statusGrid}>
          <StatusCard icon="people-alt" title="Trusted contacts" value={contacts.length ? `${contacts.length} ready` : "Needs setup"} tone={contacts.length ? "teal" : "amber"} onPress={() => router.push("/contacts")} />
          <StatusCard icon="record-voice-over" title="Voice SOS" value={voiceSosEnabled ? "Listening" : "Off"} tone={voiceSosEnabled ? "teal" : "gray"} onPress={() => router.push("/settings")} />
          <StatusCard icon="vibration" title="Shake alert" value={shakeSosEnabled ? "Calibrated" : "Off"} tone={shakeSosEnabled ? "teal" : "gray"} onPress={() => router.push("/settings")} />
          <StatusCard icon="alt-route" title="Safer route" value="Plan ahead" tone="teal" onPress={() => router.push("/routes")} />
        </View>
        <InfoCard style={styles.engineCard}><View style={styles.engineIcon}><MaterialIcons name="account-tree" size={20} color={palette.navy} /></View><View style={styles.engineCopy}><Text style={styles.engineTitle}>Context-aware response engine</Text><Text style={styles.engineText}>Every SOS, voice, and shake event is classified with trigger, time, and available location context.</Text></View></InfoCard>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatusCard({ icon, title, value, tone, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; value: string; tone: "teal" | "amber" | "gray"; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.statusCard, pressed && styles.cardPressed]}><MaterialIcons name={icon} size={21} color={palette.navy} /><Text style={styles.statusTitle}>{title}</Text><View style={styles.statusValue}><StatusDot tone={tone} /><Text style={styles.statusValueText}>{value}</Text></View></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 28, gap: 22 },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  overline: { color: palette.teal, fontWeight: "800", fontSize: 11, letterSpacing: 0.9 },
  greeting: { color: palette.ink, fontSize: 25, fontWeight: "800", marginTop: 4 },
  readyPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, backgroundColor: palette.paleTeal },
  readyText: { fontSize: 12, color: palette.teal, fontWeight: "700" },
  sosArea: { alignItems: "center", gap: 12, paddingVertical: 8 },
  sosHint: { color: palette.muted, fontSize: 14, textAlign: "center" },
  sosButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: palette.red, borderWidth: 10, borderColor: palette.paleRed, alignItems: "center", justifyContent: "center", shadowColor: palette.red, shadowOpacity: 0.22, shadowRadius: 16, elevation: 5 },
  sosHolding: { transform: [{ scale: 0.96 }], backgroundColor: "#AB2639" },
  sosText: { color: palette.white, fontWeight: "900", fontSize: 36, letterSpacing: 1 },
  sosSubtext: { color: "#FFE4E7", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  sosFootnote: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 310 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statusCard: { width: "48.4%", minHeight: 116, borderRadius: 17, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, padding: 13, gap: 6 },
  cardPressed: { opacity: 0.72 },
  statusTitle: { color: palette.ink, fontWeight: "700", fontSize: 13 },
  statusValue: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusValueText: { color: palette.muted, fontSize: 12 },
  engineCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#EFF5FA" },
  engineIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAF7" },
  engineCopy: { flex: 1, gap: 3 },
  engineTitle: { color: palette.navy, fontWeight: "800", fontSize: 14 },
  engineText: { color: palette.muted, fontSize: 13, lineHeight: 18 },
});
