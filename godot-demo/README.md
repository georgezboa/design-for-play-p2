# NIGHTFALL: Ghost Protocol

## Current demo — black-and-white net architecture (2026-09-07)

Launch `Play.command`, or open `project.godot` and press F5. Main scene is now `blackwhite.tscn`. The previous `ward.tscn` stays available as a legacy prototype.

Enter begins. Approach the cyan terminal near the starting point, then E or Q to connect. In the net, walk right to node 01 and press E to raise the bridge; cross right, then move up to node 02. E reconnects the final bridge and starts a 55-second trace. Cross right to the core and press E to extract. Back in the street, evade the Warden and reach the gate on the right; E escapes. Shift runs, Space jumps, Esc pauses, R restarts. Falls restore the last activated node without resetting progress. Q disconnects only near the entry anchor (not a free escape during the trace).

`blackwhite.gd` inherits city movement/encounter support from `ward.gd`, but owns a separate net layout and puzzle state. `build_net()` authors the platforms, binary massing and wire grids. Bridge collision geometry rises together with its rendered deck. Net progression unlocks the real gate. No downloaded anime assets are used.

Tests: `godot --headless --path . --script test_blackwhite.gd`; omit headless to render `preview-net-new.png`. Tests walk the net route using held movement inputs, plus controlled checks for entry gating, fall recovery, return, win, trace loss and pause. This is a short linear mechanics/visual demo, not yet a branching maze or full chapter. The trace enemy is currently a countdown with a visible approaching wireform, not a pathfinding AI. Actors remain prototype models; the two supplied recordings have not been motion-matched.

## Legacy prototype notes (superseded)

2026-09-07 revision: the clinic has been replaced by an outdoor cyberpunk market. Q switches between rain-soaked realspace and the red/black Blackwall interpretation of the same street. Position, collisions, objective progression and enemy state persist across switches. This is a visual world-switch prototype, not yet two different puzzle campaigns or simultaneous split-screen rendering. Neon pavement streaks are stylized geometry rather than planar reflections. `city.gd` authors the new editable streetscape; running `bake.gd` intentionally regenerates `ward.tscn`. Former treatment tables are now market stalls, and the caretaker is the armored Warden.

Standalone Godot 4.4.1 3D horror prototype. Open `project.godot`, then press F6 with `ward.tscn` selected, or F5.

## Play

Enter begins. WASD / arrows move on the room floor; Shift runs; C / Ctrl crouches; Space jumps; E interacts; Esc pauses; R restarts; F toggles fullscreen.

Collect the amber power cell behind the treatment tables, carry it to the right-hand lift console, restore power, and escape through the lift. Crouch under either treatment table or the cart to hide. The caretaker patrols, investigates nearby running, builds suspicion through line of sight, and chases. Restoring power triggers the final alarm. Capture and escape both have restart screens.

## Continue development

`ward.tscn` contains editable architecture, furniture, collision bodies, lights and signs. Move these directly in the Godot editor. `ward.gd` contains runtime actors, input, UI, audio and encounter logic; exported speed/detection settings appear in the inspector. `bake.gd` regenerates the architecture from the initial procedural design: **running it overwrites scene edits**, so use it only intentionally.

The prototype uses original procedural geometry and generated sound, no external art assets. It demonstrates room scale, concealment, detection, an objective loop and escape. Characters are deliberately rough models; there is no claim of finished character art or animation. Next steps are authored character meshes/rigs, robust navigation over a larger level, climb interactions, contextual camera framing, more varied audio, and three connected rooms with checkpoints.

Smoke tests: `godot --headless --path . --script tests.gd`. Visual capture: run the same command without `--headless`; it writes `preview.png`.

## Reference workflow

Reference: https://www.douyin.com/video/7681934597160062271 (selected segments inspected, not a full transcript).

Applied sequence: establish one room's composition and lighting; introduce the controllable character; add the antagonist; inspect gameplay and revise. For this project, interaction and capture/escape validation are added before extending the room into a full chapter. This standalone project does not yet integrate with the Phaser game's progression.
