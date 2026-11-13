export type MotionSample = { x: number; y: number; z: number; timestamp: number };

/**
 * Requires multiple energetic motion deltas in a short rolling window. A single bump,
 * pocket movement, or walking spike is insufficient to generate a shake emergency.
 */
export class ShakePatternDetector {
  private recentPeaks: number[] = [];
  private lastPeakAt = 0;
  private lastTriggeredAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly options = {
      deltaThreshold: 1.2,
      minimumPeakCount: 3,
      peakWindowMs: 1600,
      minimumPeakGapMs: 140,
      cooldownMs: 8000,
    },
  ) {}

  ingest(sample: MotionSample): boolean {
    const magnitude = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2);
    const deltaFromGravity = Math.abs(magnitude - 1);
    this.recentPeaks = this.recentPeaks.filter((time) => sample.timestamp - time <= this.options.peakWindowMs);

    if (deltaFromGravity < this.options.deltaThreshold) return false;
    if (sample.timestamp - this.lastPeakAt < this.options.minimumPeakGapMs) return false;

    this.lastPeakAt = sample.timestamp;
    this.recentPeaks.push(sample.timestamp);
    const isInCooldown = sample.timestamp - this.lastTriggeredAt < this.options.cooldownMs;
    if (isInCooldown || this.recentPeaks.length < this.options.minimumPeakCount) return false;

    this.lastTriggeredAt = sample.timestamp;
    this.recentPeaks = [];
    return true;
  }
}
