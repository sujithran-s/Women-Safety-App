import type { EmergencyDecision, SafetyLocation, TriggerType } from "@/shared/safety-types";

export type EmergencyDecisionContext = {
  triggerType: TriggerType;
  occurredAt: Date;
  location?: SafetyLocation;
  shakePatternCount?: number;
};

/**
 * Phase 1's self-contained, rule-based emergency decision module.
 * It intentionally contains no model inference, wearable interfaces, or Phase 2 extension hooks.
 */
export class EmergencyDecisionEngine {
  static evaluate(context: EmergencyDecisionContext): EmergencyDecision {
    let score = this.triggerScore(context.triggerType);
    const reasons = [this.triggerReason(context.triggerType)];
    const hour = context.occurredAt.getHours();

    if (hour >= 23 || hour < 5) {
      score += 18;
      reasons.push("Late-night context increases the response band.");
    } else if (hour >= 19) {
      score += 9;
      reasons.push("Evening context increases the response band.");
    } else {
      reasons.push("Daytime context recorded for the response decision.");
    }

    if (context.location) {
      reasons.push("Current GPS location was captured and attached to the incident.");
    } else {
      score += 8;
      reasons.push("Location was unavailable, increasing response priority because recovery context is limited.");
    }

    if (context.triggerType === "shake" && (context.shakePatternCount ?? 0) >= 3) {
      score += 14;
      reasons.push("A repeated shake pattern, rather than a single spike, satisfied the motion threshold.");
    }

    const riskBand = this.toRiskBand(score);
    return {
      riskBand,
      riskScore: score,
      reasons,
      dispatchImmediately: true,
    };
  }

  private static triggerScore(triggerType: TriggerType) {
    if (triggerType === "voice") return 78;
    if (triggerType === "manual") return 70;
    return 48;
  }

  private static triggerReason(triggerType: TriggerType) {
    if (triggerType === "voice") return "A predefined voice emergency command was recognized.";
    if (triggerType === "manual") return "The user deliberately activated the press-and-hold SOS control.";
    return "A calibrated repeated shake pattern was detected.";
  }

  private static toRiskBand(score: number): EmergencyDecision["riskBand"] {
    if (score >= 85) return "Critical";
    if (score >= 65) return "High";
    if (score >= 45) return "Medium";
    return "Low";
  }
}
