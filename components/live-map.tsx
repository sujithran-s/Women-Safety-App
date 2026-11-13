import { StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/safety-ui";
import type { Region } from "react-native-maps";
import type { RouteRiskSegment } from "@/lib/route-advisor";

export default function LiveMap({ region, coordinate, riskSegments = [] }: { region: Region; coordinate?: { latitude: number; longitude: number }; riskSegments?: RouteRiskSegment[] }) {
  return <View style={styles.map}><Text style={styles.title}>{coordinate ? "Live location acquired" : "Waiting for location permission"}</Text><Text style={styles.text}>{coordinate ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}` : "Native devices render the live map surface."}</Text></View>;
}

const styles = StyleSheet.create({ map: { height: 180, borderRadius: 18, backgroundColor: "#E5F5F3", alignItems: "center", justifyContent: "center", padding: 20, gap: 6 }, title: { color: palette.navy, fontSize: 16, fontWeight: "800" }, text: { color: palette.ink, textAlign: "center", lineHeight: 19 } });
