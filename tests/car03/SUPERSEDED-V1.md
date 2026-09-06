# Car 03 V1 tests — SUPERSEDED

The following V1 test files were deleted when the Car 03 V2 readable rebuild
landed. They enforced V1 gameplay rules that `docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md`
explicitly supersedes (see also `docs/CAR_03_QWEN_V2_READABLE_REBUILD_WORK_PACKAGE.md`).

| Deleted file | Why it is superseded |
|---|---|
| `socialStealthModel.test.mjs` | Tested the V1 anchoring/exposure model: `anchoredGroupId`, `cadenceLockMs`, `exposureMs`, drone cones + scan-cycle gating, overlap `group-transfer`, companion `rescue`, QA warp fixtures, and the V1 snapshot shape. None of those mechanics exist in V2 (no anchors, no drones, no exposure decay, no priority chain, no QA warps). |
| `duoEstablishment.test.mjs` | Tested the V1 hidden-alignment duo: `duo.established` armed by a special final-section E press, `duo.alignment >= 3` completion gate. V2 has no establishment/alignment state — the companion is an ordinary match target and the visible three-step duo test replaces the hidden check. |
| `presentCityQa.test.mjs` | Asserted the V1 QA-warp fixture snapshots (`applyQaWarp('entry'|'duo-sync'|...)`) and the V1 diagnostic shape (`crowds`, `drones`, `duo`, `qaState`). V2 forbids model mutation from QA scripts and exposes the §10 V2 diagnostic surface instead (asserted by `car03v2-behavior.test.mjs`). |
| `scanCoordinates.test.mjs` | Bound the V1 drone scan cone (`pointInDroneCone`) to `presentCityArt.js` drawing code. V2 has fixed ceiling-gate scanners with a simple ±90 px volume and no drone cone; the art-side cone test no longer describes any gameplay region. |

Replacement: `tests/car03/car03v2-behavior.test.mjs` proves the 16 required
V2 behaviors from the work package against `createCar03V2Model`.

V1 documentation under `docs/` is intentionally preserved (work package:
"Do not delete V1 documentation").
