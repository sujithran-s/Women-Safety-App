import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";

import { PrimaryButton, SectionHeading, palette } from "@/components/safety-ui";
import { ScreenContainer } from "@/components/screen-container";
import LiveMap from "@/components/live-map";
import { useSafety } from "@/lib/safety-context";
import { buildRouteRiskSegments, recommendSaferRoutes, type SaferRoute, type RouteRiskSeverity } from "@/lib/route-advisor";
import type { SafetyLocation } from "@/shared/safety-types";

export default function RoutesScreen() {
  const { updateActiveLocation } = useSafety();
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState<SaferRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [location, setLocation] = useState<SafetyLocation | null>(null);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [watching, setWatching] = useState(false);

  const resolveLocation = useCallback(async (coords: Location.LocationObjectCoords, timestamp = Date.now()) => {
    const next: SafetyLocation = { latitude: coords.latitude, longitude: coords.longitude, accuracyMeters: coords.accuracy, capturedAt: new Date(timestamp).toISOString() };
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: next.latitude, longitude: next.longitude });
      const place = places[0];
      if (place) {
        next.district = place.district ?? place.subregion ?? undefined;
        next.taluk = place.subregion ?? undefined;
        next.village = place.city ?? place.district ?? undefined;
        next.street = [place.street, place.name].filter(Boolean).join(" ") || undefined;
      }
    } catch {
      // The GPS point remains useful when the geocoder is unavailable.
    }
    setLocation(next);
    updateActiveLocation(next);
  }, [updateActiveLocation]);

  const requestLocation = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) { setPermissionMessage("Location services are turned off. Enable them to show the live safety map."); return; }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setPermissionMessage("Location permission was denied. The live map and address hierarchy remain unavailable until permission is granted."); return; }
      setPermissionMessage("");
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await resolveLocation(current.coords, current.timestamp);
      setWatching(true);
    } catch {
      setPermissionMessage("The current location could not be read. Check device location settings and try again.");
    }
  }, [resolveLocation]);

  useEffect(() => { void requestLocation(); }, [requestLocation]);
  useEffect(() => {
    if (!watching) return;
    let subscription: Location.LocationSubscription | undefined;
    let active = true;
    void Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 10 }, (next) => { if (active) void resolveLocation(next.coords, next.timestamp); }).then((value) => { subscription = value; }).catch(() => setPermissionMessage("Live location updates are unavailable on this device."));
    return () => { active = false; subscription?.remove(); };
  }, [resolveLocation, watching]);

  const region: Region | undefined = location ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 } : undefined;
  const mapLink = location ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : "";
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  const riskSegments = location && selectedRoute ? buildRouteRiskSegments({ latitude: location.latitude, longitude: location.longitude }, selectedRoute) : [];
  const chooseRoutes = () => {
    const next = recommendSaferRoutes(destination.trim());
    setRoutes(next);
    setSelectedRouteId(next[0]?.id ?? null);
  };

  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <SectionHeading eyebrow="Live location layer" title="Your current safety map" detail="GPS and reverse geocoding are device-based. The route recommendation below remains the transparent Phase 1 heuristic, not AI/ML prediction." />
    {region ? <LiveMap region={region} coordinate={location ? { latitude: location.latitude, longitude: location.longitude } : undefined} riskSegments={riskSegments} /> : <View style={styles.webMap}><MaterialIcons name="map" size={36} color={palette.teal} /><Text style={styles.webMapTitle}>Waiting for location permission</Text><Text style={styles.webMapText}>The live map will appear after location access is granted.</Text></View>}
    <View style={styles.locationCard}><View style={styles.locationHeader}><MaterialIcons name="my-location" size={21} color={palette.teal} /><Text style={styles.locationTitle}>Resolved address</Text></View>{location ? <><AddressRow label="District" value={location.district} /><AddressRow label="Taluk / subregion" value={location.taluk} /><AddressRow label="Village / town" value={location.village} /><AddressRow label="Street" value={location.street} /><AddressRow label="Coordinates" value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`} /></> : <Text style={styles.locationUnavailable}>{permissionMessage || "Requesting current location…"}</Text>}{permissionMessage ? <Text style={styles.permissionMessage}>{permissionMessage}</Text> : null}{location ? <PrimaryButton label="Open current location in Maps" tone="outline" icon="open-in-new" onPress={() => void Linking.openURL(mapLink)} /> : <PrimaryButton label="Request location permission" icon="my-location" onPress={() => void requestLocation()} />}</View>
    <View style={styles.search}><MaterialIcons name="place" size={21} color={palette.teal} /><TextInput value={destination} onChangeText={setDestination} placeholder="Enter a destination" placeholderTextColor="#5F6F80" style={styles.input} returnKeyType="done" onSubmitEditing={chooseRoutes} /></View><PrimaryButton label="Compare heuristic route options" icon="alt-route" onPress={chooseRoutes} disabled={!destination.trim()} />{routes.length ? <View style={styles.legendCard}><Text style={styles.legendTitle}>Live route risk legend</Text><Text style={styles.legendHelp}>Selected route segments are shown on the map using transparent heuristic severity colors.</Text><View style={styles.legendRow}>{(["low", "medium", "high"] as RouteRiskSeverity[]).map((severity) => <View key={severity} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: severity === "low" ? palette.teal : severity === "medium" ? palette.amber : palette.red }]} /><Text style={styles.legendText}>{severity === "low" ? "Low risk" : severity === "medium" ? "Medium risk" : "High risk"}</Text></View>)}</View></View> : null}{routes.map((route, index) => { const selected = route.id === selectedRoute?.id; return <Pressable key={route.id} onPress={() => setSelectedRouteId(route.id)} style={({ pressed }) => [styles.routeCard, index === 0 && styles.recommended, selected && styles.selectedRoute, pressed && styles.pressed]}><View style={styles.routeHeader}>{index === 0 ? <View style={styles.recommendPill}><Text style={styles.recommendText}>RECOMMENDED</Text></View> : null}<View style={styles.routeIcon}><MaterialIcons name={selected ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={selected ? palette.teal : palette.navy} /></View><View style={styles.routeCopy}><Text style={styles.routeName}>{route.name}</Text><Text style={[styles.riskLabel, { color: route.riskLabel.startsWith("Lower") ? palette.teal : route.riskLabel.startsWith("Higher") ? palette.red : palette.amber }]}>{route.riskLabel}</Text></View></View><Text style={styles.duration}>{route.durationMinutes} min · {route.distanceKm.toFixed(1)} km</Text>{route.safetyNotes.map((note) => <View style={styles.note} key={note}><MaterialIcons name="check-circle" size={15} color={palette.teal} /><Text style={styles.noteText}>{note}</Text></View>)}</Pressable>; })}</ScrollView></ScreenContainer>;
}

function AddressRow({ label, value }: { label: string; value?: string }) { return value ? <View style={styles.addressRow}><Text style={styles.addressLabel}>{label}</Text><Text style={styles.addressValue}>{value}</Text></View> : null; }

const styles = StyleSheet.create({ content: { paddingTop: 16, paddingBottom: 25, gap: 15 }, map: { height: 230, borderRadius: 18, overflow: "hidden" }, webMap: { height: 180, borderRadius: 18, backgroundColor: "#E5F5F3", alignItems: "center", justifyContent: "center", padding: 20, gap: 6 }, webMapTitle: { color: palette.navy, fontSize: 16, fontWeight: "800" }, webMapText: { color: palette.ink, textAlign: "center", lineHeight: 19 }, locationCard: { borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, padding: 16, gap: 9 }, locationHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }, locationTitle: { color: palette.ink, fontWeight: "800", fontSize: 16 }, addressRow: { flexDirection: "row", gap: 10 }, addressLabel: { width: 118, color: palette.muted, fontSize: 12, fontWeight: "700" }, addressValue: { flex: 1, color: palette.ink, fontSize: 13, lineHeight: 18 }, locationUnavailable: { color: palette.muted, lineHeight: 19 }, permissionMessage: { color: palette.red, fontSize: 12, lineHeight: 18 }, search: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, minHeight: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 14, backgroundColor: palette.white }, input: { flex: 1, fontSize: 16, color: palette.ink }, legendCard: { borderRadius: 16, backgroundColor: "#EFF5FA", padding: 14, gap: 8 }, legendTitle: { color: palette.navy, fontSize: 14, fontWeight: "800" }, legendHelp: { color: palette.ink, fontSize: 12, lineHeight: 18 }, legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 6 }, swatch: { width: 24, height: 6, borderRadius: 3 }, legendText: { color: palette.ink, fontSize: 12, fontWeight: "700" }, routeCard: { borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, padding: 16, gap: 10 }, selectedRoute: { borderColor: palette.teal, borderWidth: 2 }, pressed: { opacity: 0.78 }, recommended: { borderColor: palette.teal, borderWidth: 1.5 }, recommendPill: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: palette.paleTeal }, recommendText: { fontSize: 10, color: palette.teal, letterSpacing: 0.7, fontWeight: "900" }, routeHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, routeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF5FA" }, routeCopy: { flex: 1, gap: 3 }, routeName: { color: palette.ink, fontSize: 16, fontWeight: "800" }, riskLabel: { fontSize: 12, fontWeight: "700" }, duration: { color: palette.navy, fontWeight: "800", fontSize: 14 }, note: { flexDirection: "row", alignItems: "flex-start", gap: 7 }, noteText: { flex: 1, color: palette.ink, fontSize: 13, lineHeight: 19 },
});
