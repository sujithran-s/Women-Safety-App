import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

export const palette = {
  navy: "#12355B",
  teal: "#0B6B68",
  red: "#A92A3C",
  mist: "#F4F7FA",
  ink: "#18212B",
  muted: "#5F6F80",
  amber: "#8A5A00",
  border: "#DDE5EC",
  white: "#FFFFFF",
  paleTeal: "#E5F5F3",
  paleRed: "#FCE9EC",
  paleAmber: "#FFF4DF",
};

export function PrimaryButton({
  label,
  onPress,
  tone = "teal",
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: "teal" | "red" | "navy" | "outline";
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  style?: StyleProp<ViewStyle>;
}) {
  const colors = tone === "red" ? [palette.red, palette.white] : tone === "navy" ? [palette.navy, palette.white] : tone === "outline" ? [palette.white, palette.navy] : [palette.teal, palette.white];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, tone === "outline" && styles.outline, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      {icon ? <MaterialIcons name={icon} size={20} color={colors[1]} /> : null}
      <Text style={[styles.buttonText, { color: colors[1] }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <View style={styles.heading}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

export function InfoCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusDot({ tone = "teal" }: { tone?: "teal" | "amber" | "red" | "gray" }) {
  const color = tone === "amber" ? palette.amber : tone === "red" ? palette.red : tone === "gray" ? "#9BA8B5" : palette.teal;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 14, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 18 },
  outline: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.navy },
  buttonText: { fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  heading: { gap: 6 },
  eyebrow: { color: palette.teal, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "800" },
  detail: { color: palette.muted, fontSize: 15, lineHeight: 21 },
  card: { borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, padding: 16, gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
