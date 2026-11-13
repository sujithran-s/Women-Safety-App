export type SaferRoute = {
  id: string;
  name: string;
  durationMinutes: number;
  distanceKm: number;
  riskLabel: "Lower heuristic risk" | "Moderate heuristic risk" | "Higher heuristic risk";
  safetyNotes: string[];
};

export type RouteRiskSeverity = "low" | "medium" | "high";

export type RouteRiskSegment = {
  id: string;
  severity: RouteRiskSeverity;
  points: { latitude: number; longitude: number }[];
};

export function buildRouteRiskSegments(start: { latitude: number; longitude: number }, route: SaferRoute): RouteRiskSegment[] {
  const scale = route.id === "lower-risk" ? 0.009 : route.id === "balanced" ? 0.008 : 0.007;
  const drift = route.id === "fastest" ? 0.002 : route.id === "balanced" ? -0.001 : 0.001;
  const end = { latitude: start.latitude + scale, longitude: start.longitude + scale + drift };
  const middle = { latitude: start.latitude + scale * 0.48, longitude: start.longitude + scale * 0.48 + drift * 0.45 };
  const severities: RouteRiskSeverity[] = route.id === "lower-risk" ? ["low", "low", "medium"] : route.id === "balanced" ? ["low", "medium", "medium"] : ["medium", "high", "high"];
  const points = [start, middle, end];
  return severities.map((severity, index) => ({ id: `${route.id}-segment-${index}`, severity, points: [points[index], points[index + 1]] }));
}

/**
 * Static, explainable Phase 1 route guidance. It does not claim to use live crime data or ML.
 */
export function recommendSaferRoutes(destination: string, hour = new Date().getHours()): SaferRoute[] {
  const afterDark = hour >= 19 || hour < 6;
  const timeNote = afterDark
    ? "After-dark weighting favors active, well-lit corridors."
    : "Daytime weighting favors active public corridors.";

  return [
    {
      id: "lower-risk",
      name: `Recommended route to ${destination}`,
      durationMinutes: afterDark ? 21 : 18,
      distanceKm: afterDark ? 4.6 : 4.1,
      riskLabel: "Lower heuristic risk",
      safetyNotes: [timeNote, "Prioritizes main roads, visible storefronts, and frequent transit stops."],
    },
    {
      id: "balanced",
      name: "Balanced route",
      durationMinutes: afterDark ? 17 : 15,
      distanceKm: 3.6,
      riskLabel: "Moderate heuristic risk",
      safetyNotes: ["Balances travel time with main-road coverage.", "Avoids long isolated segments where alternatives are available."],
    },
    {
      id: "fastest",
      name: "Fastest route",
      durationMinutes: 13,
      distanceKm: 3.1,
      riskLabel: "Higher heuristic risk",
      safetyNotes: ["May include quieter side streets or less-active segments.", "Shown for comparison, not selected as the safety recommendation."],
    },
  ];
}
