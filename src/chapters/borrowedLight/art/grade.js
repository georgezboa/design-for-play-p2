// Chapter 2 · BORROWED LIGHT — the grade (round 6, owner G4 / G7: "too
// plastic, make it heavier, lean toward Kentucky Route Zero").
//
// A restrained colour grade over the whole picture, on the camera (WebGL
// only; the Canvas renderer keeps the plain picture): colour pulled back
// toward a limited palette, contrast around a low pivot so the blacks go
// deep while the practical lights (lamps, windows, signs) keep their value,
// shadows nudged toward deep navy, and a soft vignette that holds the frame.
// The painted world is made matte separately (paint.js setPaintLook('matte')).
//
// gradeMatrix() is pure: a Phaser ColorMatrix (5×4, row-major; the offset
// column in 0…255, as Phaser's ColorMatrix expects).

export const GRADE = Object.freeze({
  saturation: 0.84,   // 1 = as painted
  contrast: 1.14,     // around `pivot`: the darks go down, the lights hold
  pivot: 0.4,
  brightness: 0.97,
  // Added after the contrast, 0…255: the darks lean deep navy, not brown.
  shadow: Object.freeze([-2, 1, 6]),
  vignette: Object.freeze({ radius: 0.82, strength: 0.42 }),
});

const LUM = [0.2126, 0.7152, 0.0722];

// The 5×4 colour matrix for a grade.
export function gradeMatrix(grade = GRADE) {
  const { saturation: s, contrast: c, pivot, brightness: b, shadow } = grade;
  const rows = [];
  for (let r = 0; r < 3; r += 1) {
    const row = [0, 0, 0, 0, 0];
    for (let col = 0; col < 3; col += 1) {
      // Saturation: mix toward luminance; contrast and brightness scale it.
      const sat = (1 - s) * LUM[col] + (r === col ? s : 0);
      row[col] = sat * c * b;
    }
    // Contrast about the pivot, then the shadow tint (0…1 → 0…255).
    row[4] = ((pivot * (1 - c)) * b) * 255 + shadow[r];
    rows.push(row);
  }
  return [...rows[0], ...rows[1], ...rows[2], 0, 0, 0, 1, 0];
}

// What the grade does to one colour (0…1 rgb), for tests and tuning.
export function gradeColor([r, g, b], m = gradeMatrix()) {
  const out = [0, 1, 2].map((i) => m[i * 5] * r + m[i * 5 + 1] * g + m[i * 5 + 2] * b + m[i * 5 + 4] / 255);
  return out.map((v) => Math.max(0, Math.min(1, v)));
}

/**
 * Put the grade on a camera. Returns { colorMatrix, vignette } or null where
 * the renderer has no post FX (Canvas).
 */
export function applyGrade(camera, grade = GRADE) {
  const fx = camera?.postFX;
  if (!fx || typeof fx.addColorMatrix !== 'function') return null;
  const colorMatrix = fx.addColorMatrix();
  colorMatrix.set(gradeMatrix(grade));
  const vignette = fx.addVignette ? fx.addVignette(0.5, 0.5, grade.vignette.radius, grade.vignette.strength) : null;
  return { colorMatrix, vignette };
}
