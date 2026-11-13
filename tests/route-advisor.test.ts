import { describe, expect, it } from "vitest";

import { buildRouteRiskSegments, recommendSaferRoutes } from "../lib/route-advisor";

describe("recommendSaferRoutes", () => {
  it("returns an explainable lower-risk recommendation ahead of faster alternatives", () => {
    const routes = recommendSaferRoutes("Central Station", 22);
    expect(routes).toHaveLength(3);
    expect(routes[0].riskLabel).toBe("Lower heuristic risk");
    expect(routes[0].safetyNotes.join(" ")).toContain("After-dark");
    expect(routes[2].riskLabel).toBe("Higher heuristic risk");
  });

  it("builds low, medium, and high severity segments for the selected route", () => {
    const route = recommendSaferRoutes("Central Station")[2];
    const segments = buildRouteRiskSegments({ latitude: 11.0168, longitude: 76.9558 }, route);
    expect(segments.map((segment) => segment.severity)).toEqual(["medium", "high", "high"]);
    expect(segments.every((segment) => segment.points.length === 2)).toBe(true);
  });
});
