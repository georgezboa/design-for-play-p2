# Chapter 6 Integration Pipeline

Status: `CONTRACT LOCKED — CHAPTERS MAY CONNECT IN ANY ORDER`
Owner: Codex
Runtime module: `src/chapters/allWorlds/chapterOutputRegistry.js`

The accepted visual, camera, and model contract is `docs/CHAPTER_06_ART_CAMERA_MODEL_SPEC.md`; its shared runtime/production manifest is `src/chapters/allWorlds/finaleArtDirection.js`.

## Purpose

Chapter 6 can be built before Chapters 1–5 are finished. It does not import their scenes, models, or art. Each earlier chapter owns one named output slot and replaces its placeholder only after its ending is playable.

The finale therefore depends on five small, serializable meanings—not on five large implementations.

## The five input slots

| Chapter | Slot ID | Required carry kind | What the ending must publish |
|---|---|---|---|
| 1 — Night Service | `night-service` | `held-action` | The action Butch learned to sustain while a machine or Mara answers. |
| 2 — Borrowed Grid | `borrowed-grid` | `power-link` | A visible source → relationship → receiver link. |
| 3 — Echo City | `echo-city` | `behavior-cycle` | A semantic behavior cycle such as MOVE / WAIT / RETURN. |
| 4 — Painted Country | `painted-country` | `world-rule` | A kept property plus the creative action that makes it physical. |
| 5 — Museum of One Answer | `museum-of-one-answer` | `interpretation` | The evidence relationship that makes one disputed route real. |

## Required packet

Every chapter adapter sends the same outer shape:

```js
{
  schemaVersion: 1,
  chapterId: 'echo-city',
  status: 'ready',
  carry: {
    kind: 'behavior-cycle',
    verb: 'transplant',
    sourceId: 'courier-loop',
    relationshipId: 'move-wait-return',
    resultId: 'shared-crossing',
    visualToken: 'cyan-motion-trace',
    payload: { steps: ['MOVE', 'WAIT', 'RETURN'] }
  },
  provenance: {
    checkpointId: 'echo-city-reunion',
    chapterComplete: true
  }
}
```

`payload` may contain chapter-specific data, but the five named relationship fields must remain readable and non-empty. The registry rejects wrong chapter IDs, wrong carry kinds, unfinished chapters, and non-serializable data.

## Connection rule for other agents

1. Finish and test the chapter ending locally.
2. Write a tiny adapter inside that chapter's own folder; do not edit Chapter 6.
3. Produce the packet from a read-only ending snapshot.
4. Ask Codex to connect the adapter to the named slot.
5. Chapter 6 tests the packet, then chooses where its meaning appears in a pairwise or three-world beat.

Until then the slot remains `placeholder`. A placeholder is explicit pipeline state, not fake gameplay and not permission for Chapter 6 to invent another chapter's result.

At runtime, the integration owner calls `AllWorldsScene.connectChapterOutput(chapterId, packet)`. `window.render_game_to_text()` includes `chapterInputs`, so automated and human QA can see exactly which of the five slots are real, missing, or invalid.

## Finale build order

1. **Now:** isolated Grid ↔ Painted Country proof, already playable.
2. **As chapters land:** connect real packets in any order; keep their source scenes independent.
3. **Second pair:** Museum ↔ Night Service, using interpretation to change a mechanical route.
4. **Three-world overlap:** add Echo City's behavior cycle to a pair already proven readable.
5. **Final continuity beat:** controlled and authored automatic cuts share the same five registered packets.
6. **Compression Engine boss:** use those packets in three checkpointed sweeps
   (expose anchors → sustain contradiction → shared witness circuit). A failed
   sweep resets only itself; packet readiness and exposed anchors persist.
7. **Main-route integration:** only after all five slots report `readyForFinale: true` and the full run, boss, and ending have human keyboard QA.

## Ownership boundary

- Kimi/Qwen/chapter owners may edit their chapter and its adapter.
- Codex owns this registry, the finale composition, world-transition continuity, and main-route integration.
- Jason may replace visual tokens with final art, but their semantic names remain stable.
- No one should import a whole earlier Scene into Chapter 6.
