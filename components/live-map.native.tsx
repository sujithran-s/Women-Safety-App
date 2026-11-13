import MapView, { Marker, Polyline, type Region } from "react-native-maps";

import type { RouteRiskSegment } from "@/lib/route-advisor";

const riskColors: Record<RouteRiskSegment["severity"], string> = {
  low: "#168A73",
  medium: "#C98215",
  high: "#C83C4B",
};

export default function LiveMap({ region, riskSegments = [] }: { region: Region; coordinate?: { latitude: number; longitude: number }; riskSegments?: RouteRiskSegment[] }) {
  return <MapView style={{ height: 260, borderRadius: 18, overflow: "hidden" }} region={region} showsUserLocation showsMyLocationButton>
    <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="You are here" description="Current safety location" />
    {riskSegments.map((segment) => <Polyline key={segment.id} coordinates={segment.points} strokeColor={riskColors[segment.severity]} strokeWidth={7} lineCap="round" lineJoin="round" />)}
  </MapView>;
}
