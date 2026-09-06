# NIGHTFALL Course Build — Team Assignments

Final deadline: August 14, 2026.

We are building the most complete six-chapter course version we can deliver. We are not cutting chapters now. If schedule pressure appears later, George makes the final scope decision.

## Team

- **George — Creative and Integration Lead:** owns the final game direction, daily playtest decisions, Mara/Butch story, and final acceptance. Codex supports George with shared architecture, integration, and Chapter 6.
- **Jason — Visual and Cinematic Lead:** owns the shared painterly look, AE compositing, Seedance chapter films, transition assets, color treatment, paper/paint overlays, and final trailer capture. Jason does not need to implement gameplay code.
- **Jack — Chapter 2 Builder:** owns the playable Cyber City chapter using the existing `retroCyberpunk` slice. Jack works from the detailed repository brief and uses Vibe Coding plus Qwen support. The goal is a readable, complete Grid Link chapter, not a generic platformer.
- **Carl — Chapter 4 Owner:** owns the Paper World chapter, including its product decisions and code. The core mechanic is `KEEP`: preserve an object, property, rule, and finally Mara's creative action across rewrites.

## Model support

- **Kimi:** finishes Chapter 1 feedback, then owns Chapter 5 and later engineering support.
- **Qwen:** owns Chapter 3 and supports Jack on Chapter 2.
- **Codex:** owns the Phaser technical gate, shared systems, integration, Chapter 6, and final QA.
- **Claude Code:** acts as product reviewer and converts approved decisions into bounded tasks; it does not silently rewrite shared production code.

## One rule for everyone

Do not edit shared entry, transition, save, or world-routing files unless George/Codex assigns that exact change. Work only in your owned chapter area, keep every slice playable from its standalone entry, and hand it back with a short test route.

The detailed ownership, chapter requirements, file boundaries, milestones, and handoff rules are in:

`docs/COURSE_BUILD_TEAM_EXECUTION_PLAN.md`
