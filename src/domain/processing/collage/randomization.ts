/**
 * Randomization Utilities for Collage
 * Seeded random number generation and biased shuffling
 */

import type { ImageDimensions } from './types'

/**
 * Seeded random number generator using Mulberry32 algorithm
 * Provides reproducible random sequences for a given seed
 */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  /**
   * Get the current seed value
   */
  getSeed(): number {
    return this.state
  }

  /**
   * Generate a random float between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Generate a random integer in range [min, max) (max exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /**
   * Generate a random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}

/**
 * Generate a random seed from current time and Math.random
 */
export function generateSeed(): number {
  return Math.floor(Date.now() * Math.random()) & 0x7fffffff
}

/**
 * Sort images by area descending, then apply a biased shuffle
 * Larger images are more likely to stay near the front, but with randomness
 *
 * @param images - Images to sort and shuffle
 * @param rng - Seeded random number generator
 * @param biasFactor - How strongly to bias toward keeping order (0-1, higher = less shuffling)
 */
export function biasedShuffleByArea(
  images: ImageDimensions[],
  rng: SeededRandom,
  biasFactor = 0.7
): ImageDimensions[] {
  // First, sort by area descending
  const sorted = [...images].sort((a, b) => b.area - a.area)

  // Apply weighted position swaps
  // Larger items have higher chance to stay in place
  const result = [...sorted]

  for (let i = 0; i < result.length; i++) {
    // Probability of staying in place increases with position (earlier = more likely to stay)
    const stayProbability = biasFactor * (1 - i / result.length)

    if (rng.next() > stayProbability) {
      // Swap with a random position ahead (within a limited range)
      const maxSwapDistance = Math.max(1, Math.floor((result.length - i) * (1 - biasFactor)))
      const swapTarget = Math.min(result.length - 1, i + rng.nextInt(1, maxSwapDistance + 1))
      ;[result[i], result[swapTarget]] = [result[swapTarget], result[i]]
    }
  }

  return result
}
