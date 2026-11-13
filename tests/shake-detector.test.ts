import { describe, expect, it } from "vitest";

import { ShakePatternDetector } from "../lib/shake-detector";

describe("ShakePatternDetector", () => {
  it("does not trigger for a single acceleration spike", () => {
    const detector = new ShakePatternDetector();
    expect(detector.ingest({ x: 1.8, y: 0, z: 1, timestamp: 1000 })).toBe(false);
  });

  it("requires multiple energetic, spaced peaks inside a rolling window", () => {
    const detector = new ShakePatternDetector();
    expect(detector.ingest({ x: 2.2, y: 0, z: 1, timestamp: 1000 })).toBe(false);
    expect(detector.ingest({ x: 0, y: -2.2, z: 1, timestamp: 1250 })).toBe(false);
    expect(detector.ingest({ x: 2.2, y: 0, z: 1, timestamp: 1500 })).toBe(true);
  });

  it("uses a cooldown to avoid repeat alert storms", () => {
    const detector = new ShakePatternDetector();
    [1000, 1250, 1500].forEach((timestamp) => detector.ingest({ x: 2.2, y: 0, z: 1, timestamp }));
    expect(detector.ingest({ x: 2.2, y: 0, z: 1, timestamp: 2000 })).toBe(false);
    expect(detector.ingest({ x: 0, y: -2.2, z: 1, timestamp: 2250 })).toBe(false);
    expect(detector.ingest({ x: 2.2, y: 0, z: 1, timestamp: 2500 })).toBe(false);
  });
});
