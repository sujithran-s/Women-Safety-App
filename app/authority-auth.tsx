import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";

export default function AuthorityAuthScreen() {
  const { isAuthenticated, loading, user } = useAuth();
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") router.replace("/authority");
  }, [isAuthenticated, user?.role]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5" containerClassName="bg-background"><View style={styles.content}>
    <View style={styles.icon}><MaterialIcons name="admin-panel-settings" size={42} color={palette.white} /></View>
    <SectionHeading eyebrow="Authority / admin access" title="Sign in to the safety monitoring dashboard." detail="Use the same secure Manus login or sign-up flow as the user app. Only accounts provisioned with the admin role can access authority records." />
    <View style={styles.card}><Text style={styles.cardTitle}>Protected authority workspace</Text><Text style={styles.cardText}>User identity, SOS location, incident history, and evidence permissions are visible only to authorized authority accounts.</Text></View>
    {loading ? <ActivityIndicator color={palette.teal} /> : <PrimaryButton label="Authority sign in / sign up securely" tone="navy" icon="login" onPress={() => void startOAuthLogin()} />}
    {isAuthenticated && user?.role !== "admin" ? <Text style={styles.denied}>This signed-in account is a user account. Ask an administrator to provision authority access.</Text> : null}
    <PrimaryButton label="Back to user login" tone="outline" onPress={() => router.replace("/auth")} />
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: "center", gap: 20 }, icon: { width: 82, height: 82, borderRadius: 27, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, card: { padding: 16, borderRadius: 18, backgroundColor: "#EFF5FA", gap: 6 }, cardTitle: { color: palette.navy, fontSize: 16, fontWeight: "800" }, cardText: { color: palette.ink, fontSize: 14, lineHeight: 21 }, denied: { color: palette.red, lineHeight: 19, fontSize: 13 },
});
