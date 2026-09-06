/**
 * Wave 2A — IV→VI Trace Contract
 *
 * Frozen data contract for trolley trajectory exchange between
 * Phase IV (production) and Phase VI (playback).
 *
 * Allowed modifications: this file only.
 */

const TRACE_VERSION = 1;

const TRACE_MARKERS = Object.freeze({
  LEFT_EXTREME: 'left-extreme',
  CENTER_CROSS: 'center-cross',
  RIGHT_EXTREME: 'right-extreme',
  SETTLED: 'settled',
});

const REQUIRED_MARKERS = Object.freeze([
  TRACE_MARKERS.LEFT_EXTREME,
  TRACE_MARKERS.CENTER_CROSS,
  TRACE_MARKERS.RIGHT_EXTREME,
  TRACE_MARKERS.SETTLED,
]);

const ALLOWED_SOURCES = Object.freeze(['player', 'canonical']);

const CANONICAL_DURATION_MS = 6000;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Safely coerce a value to a number. Returns NaN (never throws) for Symbols,
 * BigInts, and objects whose valueOf/toString throws.
 */
function toSafeNumber(value) {
  try {
    return Number(value);
  } catch {
    return NaN;
  }
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function deepCopyTrace(trace) {
  return {
    version: trace.version,
    durationMs: trace.durationMs,
    samples: trace.samples.map((s) => ({
      tMs: s.tMs,
      normalizedX: s.normalizedX,
      marker: s.marker,
    })),
    settledX: trace.settledX,
    source: trace.source,
  };
}

/**
 * Returns a fresh canonical trace suitable for Phase VI first observation
 * and subsequent playback. Duration is chosen to be readable without dragging.
 *
 * @returns {object} deep-copied canonical trace
 */
function createCanonicalTrace() {
  const samples = [
    { tMs: 0, normalizedX: 0.5, marker: TRACE_MARKERS.SETTLED },
    { tMs: 800, normalizedX: 0.15, marker: TRACE_MARKERS.LEFT_EXTREME },
    { tMs: 2000, normalizedX: 0.5, marker: TRACE_MARKERS.CENTER_CROSS },
    { tMs: 3200, normalizedX: 0.85, marker: TRACE_MARKERS.RIGHT_EXTREME },
    { tMs: 5000, normalizedX: 0.5, marker: TRACE_MARKERS.CENTER_CROSS },
    { tMs: 6000, normalizedX: 0.5, marker: TRACE_MARKERS.SETTLED },
  ];

  return deepCopyTrace({
    version: TRACE_VERSION,
    durationMs: CANONICAL_DURATION_MS,
    samples,
    settledX: 0.5,
    source: 'canonical',
  });
}

/**
 * Validates a trace against the frozen contract.
 *
 * @param {object} trace
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateTrace(trace) {
  const errors = [];

  if (trace === null || typeof trace !== 'object' || Array.isArray(trace)) {
    errors.push('trace must be an object');
    return { valid: false, errors };
  }

  if (trace.version !== TRACE_VERSION) {
    errors.push(`version must be ${TRACE_VERSION}`);
  }

  if (!isFiniteNumber(trace.durationMs) || trace.durationMs <= 0) {
    errors.push('durationMs must be finite and greater than 0');
  }

  if (!Array.isArray(trace.samples)) {
    errors.push('samples must be an array');
  } else if (trace.samples.length < 2) {
    errors.push('samples must contain at least two entries');
  } else {
    let previousTime = -Infinity;
    const seenMarkers = new Set();

    for (let i = 0; i < trace.samples.length; i += 1) {
      const sample = trace.samples[i];
      const prefix = `samples[${i}]`;

      if (sample === null || typeof sample !== 'object' || Array.isArray(sample)) {
        errors.push(`${prefix} must be an object`);
        continue;
      }

      if (!isFiniteNumber(sample.tMs) || sample.tMs < 0) {
        errors.push(`${prefix}.tMs must be finite and non-negative`);
      } else if (sample.tMs > trace.durationMs) {
        errors.push(`${prefix}.tMs must not exceed durationMs`);
      } else if (sample.tMs <= previousTime) {
        errors.push(`${prefix}.tMs must be strictly greater than previous sample time`);
      }
      previousTime = sample.tMs;

      if (!isFiniteNumber(sample.normalizedX)) {
        errors.push(`${prefix}.normalizedX must be finite`);
      } else if (sample.normalizedX < 0 || sample.normalizedX > 1) {
        errors.push(`${prefix}.normalizedX must be within [0, 1]`);
      }

      if (sample.marker !== null && !REQUIRED_MARKERS.includes(sample.marker)) {
        errors.push(`${prefix}.marker is not a recognized marker`);
      } else if (sample.marker !== null) {
        seenMarkers.add(sample.marker);
      }
    }

    for (const marker of REQUIRED_MARKERS) {
      if (!seenMarkers.has(marker)) {
        errors.push(`missing required marker: ${marker}`);
      }
    }
  }

  if (!isFiniteNumber(trace.settledX) || trace.settledX < 0 || trace.settledX > 1) {
    errors.push('settledX must be finite and within [0, 1]');
  }

  if (!ALLOWED_SOURCES.includes(trace.source)) {
    errors.push('source must be "player" or "canonical"');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Accepts an untrusted raw trace and returns a normalized, valid trace.
 * Never throws. Falls back to a canonical trace when the input cannot be
 * safely repaired.
 *
 * @param {object|Array|unknown} rawTrace
 * @returns {object} valid trace
 */
function normalizeTrace(rawTrace) {
  // Defensive: anything that isn't a trace-shaped object falls back immediately.
  if (rawTrace === null || typeof rawTrace !== 'object' || Array.isArray(rawTrace)) {
    return createCanonicalTrace();
  }

  // Unknown version cannot be interpreted under this contract.
  if (rawTrace.version !== TRACE_VERSION) {
    return createCanonicalTrace();
  }

  const rawSource = rawTrace.source;
  const intendedSource = rawSource === 'player' ? 'player' : 'canonical';

  const rawDurationMs = toSafeNumber(rawTrace.durationMs);
  let durationMs = isFiniteNumber(rawDurationMs) ? rawDurationMs : CANONICAL_DURATION_MS;
  durationMs = Math.max(1, durationMs);

  const cleaned = [];

  if (Array.isArray(rawTrace.samples)) {
    for (const rawSample of rawTrace.samples) {
      if (rawSample === null || typeof rawSample !== 'object' || Array.isArray(rawSample)) {
        continue;
      }

      const tMs = toSafeNumber(rawSample.tMs);
      if (!isFiniteNumber(tMs) || tMs < 0 || tMs > durationMs) {
        continue;
      }

      const normalizedX = clamp01(toSafeNumber(rawSample.normalizedX));
      if (!isFiniteNumber(normalizedX)) {
        continue;
      }

      const marker = rawSample.marker === null || REQUIRED_MARKERS.includes(rawSample.marker)
        ? rawSample.marker
        : null;

      cleaned.push({ tMs, normalizedX, marker });
    }
  }

  // Sort by time and remove duplicate timestamps, keeping the first occurrence.
  cleaned.sort((a, b) => a.tMs - b.tMs);
  const deduplicated = [];
  for (const sample of cleaned) {
    if (deduplicated.length === 0 || sample.tMs !== deduplicated[deduplicated.length - 1].tMs) {
      deduplicated.push(sample);
    }
  }

  // Keep only the first occurrence of each required marker.
  const seenMarkers = new Set();
  const normalizedSamples = [];
  for (const sample of deduplicated) {
    if (sample.marker !== null && seenMarkers.has(sample.marker)) {
      normalizedSamples.push({ tMs: sample.tMs, normalizedX: sample.normalizedX, marker: null });
    } else {
      if (sample.marker !== null) {
        seenMarkers.add(sample.marker);
      }
      normalizedSamples.push({ tMs: sample.tMs, normalizedX: sample.normalizedX, marker: sample.marker });
    }
  }

  // If any required marker is missing, the contract demands a fallback.
  for (const marker of REQUIRED_MARKERS) {
    if (!seenMarkers.has(marker)) {
      return createCanonicalTrace();
    }
  }

  if (normalizedSamples.length < 2) {
    return createCanonicalTrace();
  }

  const rawSettledX = toSafeNumber(rawTrace.settledX);
  const settledX = isFiniteNumber(rawSettledX)
    ? clamp01(rawSettledX)
    : normalizedSamples[normalizedSamples.length - 1].normalizedX;

  const normalized = deepCopyTrace({
    version: TRACE_VERSION,
    durationMs,
    samples: normalizedSamples,
    settledX,
    source: intendedSource,
  });

  const validation = validateTrace(normalized);
  if (!validation.valid) {
    return createCanonicalTrace();
  }

  return normalized;
}

/**
 * Returns a short, QA-friendly summary of a trace without exposing the
 * full sample history.
 *
 * @param {object} trace
 * @returns {object}
 */
function summarizeTrace(trace) {
  const validation = validateTrace(trace);
  const markerOrder = trace && Array.isArray(trace.samples)
    ? trace.samples
      .filter((s) => s && s.marker !== null)
      .map((s) => s.marker)
    : [];

  return {
    version: trace && trace.version,
    source: trace && trace.source,
    durationMs: trace && trace.durationMs,
    sampleCount: trace && Array.isArray(trace.samples) ? trace.samples.length : 0,
    markerOrder,
    settledX: trace && trace.settledX,
    valid: validation.valid,
  };
}

export {
  TRACE_VERSION,
  TRACE_MARKERS,
  createCanonicalTrace,
  validateTrace,
  normalizeTrace,
  summarizeTrace,
};
