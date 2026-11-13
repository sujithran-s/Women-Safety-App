import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";

export default function AuthScreen() {
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5" containerClassName="bg-background">
      <View style={styles.content}>
        <View style={styles.icon}><MaterialIcons name="verified-user" size={42} color={palette.white} /></View>
        <SectionHeading eyebrow="Protected safety account" title="Sign in before sharing sensitive safety data." detail="Your trusted contacts, incident audit history, and temporary evidence are tied to your authenticated account." />
        <View style={styles.card}><Text style={styles.cardTitle}>One account, one source of truth</Text><Text style={styles.cardText}>Sign in or create an account through the secure Manus authentication flow. Contacts and Safety & Privacy remain locked until your session is active.</Text></View>
        {loading ? <ActivityIndicator color={palette.teal} /> : <PrimaryButton label="Sign in / Sign up securely" tone="navy" icon="login" onPress={() => void startOAuthLogin()} />}
        <PrimaryButton label="Authority / Admin login" tone="outline" icon="admin-panel-settings" onPress={() => router.push("/authority-auth")} />
        <PrimaryButton label="Back to dashboard" tone="outline" onPress={() => router.replace("/(tabs)")} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: "center", gap: 20 }, icon: { width: 82, height: 82, borderRadius: 27, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, card: { padding: 16, borderRadius: 18, backgroundColor: "#EFF5FA", gap: 6 }, cardTitle: { color: palette.navy, fontSize: 16, fontWeight: "800" }, cardText: { color: palette.ink, fontSize: 14, lineHeight: 21 },
});
