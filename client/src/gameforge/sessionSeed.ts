/**
 * Per-mount session seed so identical modules / prompts can yield different
 * layouts, spawns, and tuning (not only palette swaps).
 */

export function createSessionSeed(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint8Array(12)
    crypto.getRandomValues(a)
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

export function hashStringToUint32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export function rngFromString(label: string): () => number {
  return mulberry32(hashStringToUint32(label))
}

export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function floatBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}
