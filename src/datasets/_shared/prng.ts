/**
 * Deterministic pseudo-random helpers (mulberry32). Same seed → same sequence on every
 * platform, which is what makes dataset snapshots reproducible.
 */
export class Prng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number, decimals = 2): number {
    const v = min + this.next() * (max - min);
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error("pick from empty array");
    return item;
  }

  /** Weighted pick: weights need not sum to 1. */
  weighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((a, i) => a + i.weight, 0);
    let r = this.next() * total;
    for (const i of items) {
      r -= i.weight;
      if (r <= 0) return i.value;
    }
    return items[items.length - 1]!.value;
  }

  /** Approximate normal via Box–Muller. */
  normal(mean: number, sd: number): number {
    const u = 1 - this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Power-law-ish integer ≥ 1 (Pareto with shape alpha, capped). */
  pareto(alpha: number, cap: number): number {
    const x = Math.floor(1 / Math.pow(1 - this.next(), 1 / alpha));
    return Math.min(cap, Math.max(1, x));
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }
}

/** Deterministic date helpers on epoch milliseconds (UTC). */
export const DAY_MS = 86_400_000;

export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function toDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function utc(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h, min);
}
