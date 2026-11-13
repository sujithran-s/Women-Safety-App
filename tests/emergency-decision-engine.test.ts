import { describe, expect, it } from "vitest";

import { EmergencyDecisionEngine } from "../lib/emergency-decision-engine";

describe("EmergencyDecisionEngine", () => {
  it("marks a deliberate voice command at night with location as Critical", () => {
    const decision = EmergencyDecisionEngine.evaluate({
      triggerType: "voice",
      occurredAt: new Date("2026-08-24T23:30:00"),
      location: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 12, capturedAt: "2026-08-24T23:30:00.000Z" },
    });
    expect(decision.riskBand).toBe("Critical");
    expect(decision.dispatchImmediately).toBe(true);
    expect(decision.reasons.some((reason) => reason.includes("voice"))).toBe(true);
  });

  it("keeps an ambiguous daytime shake in a graduated band rather than treating it as a direct bypass", () => {
    const decision = EmergencyDecisionEngine.evaluate({
      triggerType: "shake",
      occurredAt: new Date("2026-08-24T13:00:00"),
      location: { latitude: 19.076, longitude: 72.8777, accuracyMeters: 12, capturedAt: "2026-08-24T13:00:00.000Z" },
      shakePatternCount: 3,
    });
    expect(decision.riskBand).toBe("Medium");
    expect(decision.riskScore).toBe(62);
  });

  it("raises an incident priority when location context is unavailable", () => {
    const decision = EmergencyDecisionEngine.evaluate({
      triggerType: "manual",
      occurredAt: new Date("2026-08-24T10:00:00"),
    });
    expect(decision.riskBand).toBe("High");
    expect(decision.reasons.some((reason) => reason.includes("Location was unavailable"))).toBe(true);
  });

  it("accepts manual, voice, and shake events through the same decision interface", () => {
    const cases = ["manual", "voice", "shake"] as const;
    for (const triggerType of cases) {
      const decision = EmergencyDecisionEngine.evaluate({ triggerType, occurredAt: new Date("2026-08-24T10:00:00") });
      expect(decision.dispatchImmediately).toBe(true);
      expect(decision.reasons[0]).toBeTruthy();
    }
  });
});
