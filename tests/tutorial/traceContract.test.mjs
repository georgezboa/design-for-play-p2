import {
  describe,
  it,
} from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACE_VERSION,
  TRACE_MARKERS,
  createCanonicalTrace,
  validateTrace,
  normalizeTrace,
  summarizeTrace,
} from '../../src/tutorial/phases/traceContract.js';

describe('traceContract', () => {
  describe('createCanonicalTrace', () => {
    it('returns a valid trace with all four required markers', () => {
      const trace = createCanonicalTrace();
      const validation = validateTrace(trace);
      assert.equal(validation.valid, true, validation.errors.join('; '));

      const markers = trace.samples.map((s) => s.marker).filter(Boolean);
      assert.ok(markers.includes(TRACE_MARKERS.LEFT_EXTREME));
      assert.ok(markers.includes(TRACE_MARKERS.CENTER_CROSS));
      assert.ok(markers.includes(TRACE_MARKERS.RIGHT_EXTREME));
      assert.ok(markers.includes(TRACE_MARKERS.SETTLED));
    });

    it('returns a deep copy on each call', () => {
      const a = createCanonicalTrace();
      const b = createCanonicalTrace();
      assert.notStrictEqual(a, b);
      assert.notStrictEqual(a.samples, b.samples);
      a.samples[0].normalizedX = 0.99;
      assert.notEqual(b.samples[0].normalizedX, 0.99);
    });
  });

  describe('validateTrace', () => {
    it('rejects non-object traces', () => {
      for (const bad of [null, undefined, 'string', 123, []]) {
        const result = validateTrace(bad);
        assert.equal(result.valid, false);
        assert.ok(result.errors.length > 0);
      }
    });

    it('rejects wrong version', () => {
      const trace = createCanonicalTrace();
      trace.version = 2;
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('version')));
    });

    it('rejects invalid durationMs', () => {
      const trace = createCanonicalTrace();
      trace.durationMs = 0;
      assert.equal(validateTrace(trace).valid, false);
      trace.durationMs = -10;
      assert.equal(validateTrace(trace).valid, false);
      trace.durationMs = NaN;
      assert.equal(validateTrace(trace).valid, false);
      trace.durationMs = Infinity;
      assert.equal(validateTrace(trace).valid, false);
    });

    it('rejects fewer than two samples', () => {
      const trace = createCanonicalTrace();
      trace.samples = trace.samples.slice(0, 1);
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('samples')));
    });

    it('rejects non-monotonic sample times', () => {
      const trace = createCanonicalTrace();
      trace.samples[2].tMs = trace.samples[1].tMs;
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('strictly greater')));
    });

    it('rejects sample times exceeding durationMs', () => {
      const trace = createCanonicalTrace();
      trace.samples[trace.samples.length - 1].tMs = trace.durationMs + 1;
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('durationMs')));
    });

    it('rejects out-of-bounds normalizedX', () => {
      const trace = createCanonicalTrace();
      trace.samples[1].normalizedX = 1.5;
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('[0, 1]')));
    });

    it('rejects unknown markers', () => {
      const trace = createCanonicalTrace();
      trace.samples[1].marker = 'unknown-marker';
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('marker')));
    });

    it('rejects missing required markers', () => {
      const trace = createCanonicalTrace();
      trace.samples = trace.samples.filter((s) => s.marker !== TRACE_MARKERS.LEFT_EXTREME);
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('left-extreme')));
    });

    it('rejects invalid settledX', () => {
      const trace = createCanonicalTrace();
      trace.settledX = NaN;
      assert.equal(validateTrace(trace).valid, false);
      trace.settledX = -0.1;
      assert.equal(validateTrace(trace).valid, false);
      trace.settledX = 1.1;
      assert.equal(validateTrace(trace).valid, false);
    });

    it('rejects invalid source', () => {
      const trace = createCanonicalTrace();
      trace.source = 'hacker';
      const result = validateTrace(trace);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('source')));
    });
  });

  describe('normalizeTrace', () => {
    it('keeps source: player for a full valid player trace', () => {
      const raw = createCanonicalTrace();
      raw.source = 'player';
      raw.samples[0].marker = TRACE_MARKERS.SETTLED;

      const normalized = normalizeTrace(raw);
      assert.equal(normalized.source, 'player');
      assert.equal(validateTrace(normalized).valid, true);
    });

    it('does not mutate the input array or samples', () => {
      const raw = createCanonicalTrace();
      raw.source = 'player';
      const sampleCopy = raw.samples.map((s) => ({ ...s }));
      const before = JSON.stringify(raw);

      normalizeTrace(raw);

      assert.equal(JSON.stringify(raw), before);
      assert.deepStrictEqual(raw.samples, sampleCopy);
    });

    it('sorts samples by tMs and removes duplicate timestamps', () => {
      const raw = {
        version: TRACE_VERSION,
        durationMs: 5000,
        samples: [
          { tMs: 1000, normalizedX: 0.2, marker: TRACE_MARKERS.RIGHT_EXTREME },
          { tMs: 0, normalizedX: 0.5, marker: TRACE_MARKERS.SETTLED },
          { tMs: 500, normalizedX: 0.1, marker: TRACE_MARKERS.LEFT_EXTREME },
          { tMs: 500, normalizedX: 0.99, marker: null },
          { tMs: 750, normalizedX: 0.5, marker: TRACE_MARKERS.CENTER_CROSS },
        ],
        settledX: 0.5,
        source: 'player',
      };

      const normalized = normalizeTrace(raw);
      const times = normalized.samples.map((s) => s.tMs);
      assert.deepStrictEqual(times, [0, 500, 750, 1000]);
      assert.equal(normalized.samples[1].normalizedX, 0.1);
    });

    it('clamps normalizedX to [0, 1]', () => {
      const raw = createCanonicalTrace();
      raw.samples[1].normalizedX = -0.5;
      raw.samples[2].normalizedX = 1.5;

      const normalized = normalizeTrace(raw);
      assert.equal(normalized.samples[1].normalizedX, 0);
      assert.equal(normalized.samples[2].normalizedX, 1);
    });

    it('filters non-object samples, NaN, and Infinity', () => {
      const raw = createCanonicalTrace();
      raw.samples = [
        { tMs: 0, normalizedX: 0.5, marker: TRACE_MARKERS.SETTLED },
        null,
        { tMs: 1000, normalizedX: NaN, marker: TRACE_MARKERS.LEFT_EXTREME },
        { tMs: 2000, normalizedX: 0.2, marker: TRACE_MARKERS.LEFT_EXTREME },
        { tMs: 3000, normalizedX: Infinity, marker: TRACE_MARKERS.CENTER_CROSS },
        { tMs: 4000, normalizedX: 0.85, marker: TRACE_MARKERS.RIGHT_EXTREME },
        { tMs: 5000, normalizedX: 0.5, marker: TRACE_MARKERS.SETTLED },
      ];

      const normalized = normalizeTrace(raw);
      assert.equal(validateTrace(normalized).valid, true);
      assert.equal(normalized.samples.length, 5);
    });

    it('filters Symbol values in sample.tMs without throwing', () => {
      const raw = createCanonicalTrace();
      raw.samples[1].tMs = Symbol('bad-time');
      assert.doesNotThrow(() => {
        const normalized = normalizeTrace(raw);
        assert.equal(normalized.source, 'canonical');
        assert.equal(validateTrace(normalized).valid, true);
      });
    });

    it('filters Symbol values in sample.normalizedX without throwing', () => {
      const raw = createCanonicalTrace();
      raw.samples[1].normalizedX = Symbol('bad-position');
      assert.doesNotThrow(() => {
        const normalized = normalizeTrace(raw);
        assert.equal(normalized.source, 'canonical');
        assert.equal(validateTrace(normalized).valid, true);
      });
    });

    it('filters objects with throwing valueOf/toString without throwing', () => {
      const raw = createCanonicalTrace();
      raw.samples[1].tMs = Object.create(null);
      raw.samples[1].tMs.valueOf = () => { throw new Error('valueOf boom'); };
      raw.samples[1].normalizedX = Object.create(null);
      raw.samples[1].normalizedX.toString = () => { throw new Error('toString boom'); };

      assert.doesNotThrow(() => {
        const normalized = normalizeTrace(raw);
        assert.equal(normalized.source, 'canonical');
        assert.equal(validateTrace(normalized).valid, true);
      });
    });

    it('falls back to canonical for empty trace', () => {
      const result = normalizeTrace({});
      assert.equal(result.source, 'canonical');
      assert.equal(validateTrace(result).valid, true);
    });

    it('falls back to canonical for missing marker', () => {
      const raw = createCanonicalTrace();
      raw.samples = raw.samples.filter((s) => s.marker !== TRACE_MARKERS.RIGHT_EXTREME);
      const normalized = normalizeTrace(raw);
      assert.equal(normalized.source, 'canonical');
      assert.equal(validateTrace(normalized).valid, true);
    });

    it('falls back to canonical for unknown version', () => {
      const raw = createCanonicalTrace();
      raw.version = 999;
      const normalized = normalizeTrace(raw);
      assert.equal(normalized.source, 'canonical');
      assert.equal(validateTrace(normalized).valid, true);
    });

    it('normalizes illegal source to a safe result', () => {
      const raw = createCanonicalTrace();
      raw.source = 'hacker';
      const normalized = normalizeTrace(raw);
      assert.equal(validateTrace(normalized).valid, true);
      assert.ok(['player', 'canonical'].includes(normalized.source));
    });

    it('keeps only the first occurrence of each marker', () => {
      const raw = createCanonicalTrace();
      raw.samples.push(
        { tMs: 7000, normalizedX: 0.5, marker: TRACE_MARKERS.CENTER_CROSS },
        { tMs: 8000, normalizedX: 0.5, marker: TRACE_MARKERS.SETTLED },
      );
      raw.durationMs = 8000;

      const normalized = normalizeTrace(raw);
      const markers = normalized.samples.map((s) => s.marker);
      const markerCounts = markers.reduce((acc, m) => {
        if (m) acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {});

      assert.equal(markerCounts[TRACE_MARKERS.CENTER_CROSS], 1);
      assert.equal(markerCounts[TRACE_MARKERS.SETTLED], 1);
    });

    it('always returns a trace that passes validateTrace', () => {
      const inputs = [
        null,
        undefined,
        'bad',
        42,
        [],
        {},
        { version: TRACE_VERSION },
        createCanonicalTrace(),
      ];

      for (const input of inputs) {
        const normalized = normalizeTrace(input);
        const validation = validateTrace(normalized);
        assert.equal(validation.valid, true, `input ${JSON.stringify(input)}: ${validation.errors.join('; ')}`);
      }
    });
  });

  describe('summarizeTrace', () => {
    it('does not leak the full samples array', () => {
      const trace = createCanonicalTrace();
      const summary = summarizeTrace(trace);
      assert.ok(!Object.prototype.hasOwnProperty.call(summary, 'samples'));
      assert.equal(summary.sampleCount, trace.samples.length);
    });

    it('reports version, source, duration, marker order, settledX, and validity', () => {
      const trace = createCanonicalTrace();
      trace.source = 'player';
      const summary = summarizeTrace(trace);
      assert.equal(summary.version, TRACE_VERSION);
      assert.equal(summary.source, 'player');
      assert.equal(summary.durationMs, trace.durationMs);
      assert.equal(summary.settledX, trace.settledX);
      assert.equal(summary.valid, true);
      assert.ok(Array.isArray(summary.markerOrder));
      assert.ok(summary.markerOrder.includes(TRACE_MARKERS.LEFT_EXTREME));
    });

    it('reports invalid for broken traces', () => {
      const summary = summarizeTrace({ version: 2 });
      assert.equal(summary.valid, false);
    });
  });
});
