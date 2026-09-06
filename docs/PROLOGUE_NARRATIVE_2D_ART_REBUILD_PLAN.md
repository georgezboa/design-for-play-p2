# Prologue Narrative 2D Art Rebuild — Design Lock

Status: ACTIVE. Phase IV–VI gameplay is frozen. This plan controls narrative
staging, asset production, composition, state art and motion only.

## Visual rule

The game does not imitate Kentucky Route Zero literally. It borrows theatrical
staging, strong negative space and a small number of meaningful light
relationships. Every runtime asset still belongs to the existing Nightfall
train: flat geometric silhouettes, charcoal/slate railway enamel, aged brass
amber, pneumatic cyan, cold off-white, hard edges and restrained paper grain.

Do not use photoreal cutouts, flattened full-scene AI paintings, glossy 3D
renders, generic control panels or red warning rectangles. AI-assisted art may
enter the game only as a separately generated and reviewed object/state sprite.

## Narrative promise carried by the art

- I: the ticket punch records an instruction.
- II: amber electricity carries a relationship through the train.
- III: cyan air stores and releases force.
- IV: weight tests whether a mechanism can carry meaning.
- V: the Archivist demands one of two incompatible R-17 records be deleted;
  the train creates a second physical place and the player preserves both.
- VI: the train replays the player's earlier conduct. When the Archivist cuts
  away the contradiction, the player abandons balance to catch it and the
  train supplies the missing counter-movement.

No room introduces a new abstract HUD language. Meaning appears in objects:
punch holes, amber cable, cyan hose, bending cradle, remembered case, crop
gate, counterweight and the train's response.

## Asset construction rule

Every family is drawn separately, exported with transparency, then assembled
in Phaser. Continuous state (beam angle, hose path, cable tension, spring
compression and travelling light) remains procedural. Identity-bearing objects
and narrative changes are sprites.

### Implemented families

- Archive records: city and country R-17 cases, each closed / open-memory /
  carried / strained; city and country memory tableaux.
- Carrying mechanisms: primary cradle empty / overloaded / stable; second
  cradle folded / cable-supported / fully supported.
- Continuity props: ticket punch, amber winch, cyan cushion, jettison hatch.
- Archivist action: crop gate and cold-white redaction strips.

### Next production families

- Carriage environment: wall rib, archive rail, service lamp, cable/hose cleat,
  floor hatch, inspection placard and one window-side shadow prop. Each needs
  dormant and narrative-reactive light states, not a new gameplay state.
- Character silhouettes: Archivist cropped torso/hands behind the gate,
  conductor listening pose, and player carry pose at the existing sprite scale.

## Phase V composition lock

At entry, two cases hang above one inadequate cradle. The fall is the inciting
event. Punching a tag opens a small memory tableau instead of explanatory text.
After both are witnessed, the train unfolds a second cradle. The player reuses
amber and cyan relationships learned earlier to support it. Completion is a
physical tableau: two memories, two places, one unbroken carriage. Only three
short narrative lines are allowed.

## Phase VI composition lock

Amber PAST and steel PRESENT occupy different rails over the same equalizer.
The crop gate is visible before it acts. Redaction uses cold-white physical
strips, never a red failure panel. The falling record uses the strained state;
catching it uses the carried state. The winch and cushion from V return
unchanged so the train's assistance is recognition, not a new rule.

## Implementation waves

1. Replace identity-bearing procedural boxes in V/VI with isolated assets.
2. Validate first glance, state silhouettes, scale and occlusion in browser.
3. Build the carriage environment from separate props without touching logic.
4. Add the minimum character staging.
5. Repaint I–III continuity props with the same rules, then perform one
   chapter-wide color/depth pass.
6. First-time-player test; remove narrative lines whose information the object
   motion already delivers.

## Acceptance gates

- Screenshot stays readable in grayscale at 32×20.
- Player, active record and active relationship are the clearest three masses.
- Every sprite has one noun and one mechanical role.
- Every new state is visible without reading a label.
- V/VI remain playable with narrative text hidden.
- No gameplay constant, transition or correct answer changes in this rebuild.
