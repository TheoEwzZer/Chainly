import { NextResponse } from "next/server";

const WINDOW_MS = 10_000;
const MAX_REQUESTS = 10;
const MAX_CACHE_SIZE = 10_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const cache = new Map<string, RateLimitEntry>();

function cleanupCache(): void {
  if (cache.size <= MAX_CACHE_SIZE) {
    return;
  }

  const now: number = Date.now();
  const entriesToDelete: string[] = [];

  for (const [key, entry] of cache.entries()) {
    if (entry.resetAt < now) {
      entriesToDelete.push(key);
    }
  }

  for (const key of entriesToDelete) {
    cache.delete(key);
  }

  if (cache.size > MAX_CACHE_SIZE) {
    const keysToDelete: string[] = Array.from(cache.keys()).slice(
      0,
      cache.size - MAX_CACHE_SIZE
    );
    for (const key of keysToDelete) {
      cache.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now: number = Date.now();

  cleanupCache();

  const existing: RateLimitEntry | undefined = cache.get(identifier);

  if (!existing || existing.resetAt < now) {
    cache.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      success: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      reset: now + WINDOW_MS,
    };
  }

  existing.count += 1;

  if (existing.count > MAX_REQUESTS) {
    return {
      success: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      reset: existing.resetAt,
    };
  }

  return {
    success: true,
    limit: MAX_REQUESTS,
    remaining: MAX_REQUESTS - existing.count,
    reset: existing.resetAt,
  };
}

export function rateLimitResponse(
  result: RateLimitResult
): NextResponse<{ success: false; error: string }> {
  const retryAfter: number = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  return NextResponse.json(
    {
      success: false as const,
      error: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}
