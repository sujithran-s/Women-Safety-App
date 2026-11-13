import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { InfoCard, PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useSafety } from "@/lib/safety-context";

export default function OnboardingScreen() {
  const { completeOnboarding } = useSafety();
  const finish = () => {
    completeOnboarding();
    router.replace("/(tabs)");
  };
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5" containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}><MaterialIcons name="shield" size={44} color={palette.white} /></View>
        <SectionHeading eyebrow="Phase 1 safety system" title="Safety support that responds to context." detail="Three phone-based triggers share one rule-based response path. Optional audio, photo, and live-location sharing start off." />
        <View style={styles.steps}>
          <InfoCard><MaterialIcons name="touch-app" size={24} color={palette.red} /><Text style={styles.stepTitle}>Intentional SOS</Text><Text style={styles.stepText}>A press-and-hold control reduces accidental activation.</Text></InfoCard>
          <InfoCard><MaterialIcons name="graphic-eq" size={24} color={palette.teal} /><Text style={styles.stepTitle}>Voice and shake inputs</Text><Text style={styles.stepText}>A phrase and repeated motion pattern route through the same decision engine.</Text></InfoCard>
          <InfoCard><MaterialIcons name="privacy-tip" size={24} color={palette.navy} /><Text style={styles.stepTitle}>Privacy stays with you</Text><Text style={styles.stepText}>You choose separately whether evidence and live location are used.</Text></InfoCard>
        </View>
        <PrimaryButton label="Set up safety controls" onPress={finish} tone="navy" icon="arrow-forward" />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 36, gap: 24, flexGrow: 1 },
  heroIcon: { width: 84, height: 84, borderRadius: 26, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" },
  steps: { gap: 12 },
  stepTitle: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  stepText: { color: palette.muted, lineHeight: 20, fontSize: 14 },
});
