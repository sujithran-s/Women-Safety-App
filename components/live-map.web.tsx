import { StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/safety-ui";
import type { RouteRiskSegment } from "@/lib/route-advisor";

const riskColors: Record<RouteRiskSegment["severity"], string> = { low: "#168A73", medium: "#C98215", high: "#C83C4B" };
const riskLabels: Record<RouteRiskSegment["severity"], string> = { low: "Low risk", medium: "Medium risk", high: "High risk" };

export default function LiveMap({ coordinate, riskSegments = [] }: { coordinate?: { latitude: number; longitude: number }; riskSegments?: RouteRiskSegment[] }) {
  return <View style={styles.map}><Text style={styles.title}>{coordinate ? "Live location acquired" : "Waiting for location permission"}</Text><Text style={styles.text}>{coordinate ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}` : "The web preview uses the same GPS/address layer; native devices render the live map surface."}</Text>{riskSegments.length ? <View style={styles.legend}>{(["low", "medium", "high"] as RouteRiskSegment["severity"][]).map((severity) => <View key={severity} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: riskColors[severity] }]} /><Text style={styles.legendText}>{riskLabels[severity]}</Text></View>)}</View> : null}</View>;
}

const styles = StyleSheet.create({ map: { minHeight: 180, borderRadius: 18, backgroundColor: "#E5F5F3", alignItems: "center", justifyContent: "center", padding: 20, gap: 6 }, title: { color: palette.navy, fontSize: 16, fontWeight: "800" }, text: { color: palette.ink, textAlign: "center", lineHeight: 19 }, legend: { width: "100%", gap: 6, marginTop: 8 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 7 }, swatch: { width: 24, height: 6, borderRadius: 3 }, legendText: { color: palette.ink, fontSize: 12, fontWeight: "700" } });
