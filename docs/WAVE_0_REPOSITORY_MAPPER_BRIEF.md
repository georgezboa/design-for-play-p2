# Wave 0 — Kimi Repository Mapper 只读任务简报

状态：**READY**
执行者：Kimi K2.7 Code，角色 `repository-mapper`
总师：Claude / Codex
工作方式：只读调查；不得修改、创建、删除、格式化任何项目文件；不得 commit、push 或开 PR。

## 目标

为已锁定的序章 Phase II–VI 重构建立可信的当前代码地图。报告必须回答“现在哪条运行路径真正生效”，不能只复述设计文档或注释。

## 必读材料

1. `docs/PROLOGUE_PHASE_II_VI_RESEARCH_AUDIT.md`
2. `docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md`
3. `docs/PROLOGUE_INNOVATION_DIRECTIONS.md`
4. `docs/GAME_DESIGN_MASTER.md`
5. `docs/MDA_REDESIGN_III_VI.md`
6. `docs/III_VI_IMPLEMENTATION_SPEC.md`
7. `progress.md`
8. `src/level.js`
9. `src/tutorial/TimetablePuzzle.js`
10. `src/tutorial/airLock.js`
11. `src/scenes/GameScene.js`
12. `src/main.js`
13. `src/art/tutorialTrainRoomsArt.js`
14. `src/art/tutorialCarArt.js`
15. 所有 Phase II–VI QA 路由、测试、相关音效和状态导出代码。

## 必须完成的调查

### A. 运行调用图

对 Phase II、III、IV、V、VI 分别列出：

- 关卡数据定义入口。
- interactable 创建入口。
- `canInteract` / prompt / interaction 路由。
- 状态初始化、每帧更新、成功、失败、reset、destroy。
- 视觉绘制与 refresh 入口。
- 门打开和进入下一 Phase 的入口。
- `render_game_to_text` / QA 状态输出。

每项必须提供真实文件和行号。

### B. 字段读写审计

至少覆盖：

- `guideSequence`
- `solution`
- `airLock`
- `manualWindowMs` / `manualUntil`
- `pressureHold`
- `pressureHintCommand`
- `echoGates` / `echoGateIndex` / `echoGatesCleared`
- `physicalSequence`
- `underfloor`
- `lesson` / `guidance`
- 所有旧 `drum` 字段

对每个字段标记：

- 写点。
- 读点。
- 是否影响当前运行时。
- 是否只有注释/文档声明、没有消费。
- 是否与 Design Lock 判废内容冲突。

### C. 旧逻辑残留

明确列出仍可执行或仍影响画面的旧分支：

- Phase II 的 FIRST / THEN 引导与错误预拒绝。
- Phase III 的旧 drum/slot/旧 air-lock 分支。
- Phase IV 的 3500ms manual window。
- Phase V 的 30–62 pressure band 和文字报答案。
- Phase VI 的三道 `gate.command` 与无限等待。

不得仅根据变量名判断；必须追到调用入口。

### D. QA 与测试地图

逐个列出 Phase II–VI 的 query route：

- URL。
- 跳转位置。
- 自动执行逻辑。
- 是否仍调用已删除/替代的旧 API。
- 是否能覆盖 entry、correct、wrong、reset、repeat。
- 当前明显失效或会产生假阳性的路线。

### E. 文件所有权建议

输出建议矩阵：

- 共享热点文件：只能由 `integration-owner` 修改。
- 每段可独立抽出的纯逻辑文件。
- 每段可独立修改的 art 文件或建议新建的 art module。
- QA/tests 可独立拥有的文件。
- 任何无法安全并行的交叉依赖。

### F. Wave 2 轨迹契约接入点

只调查，不设计新格式。根据 Design Lock 已冻结的 IV → VI trace contract，指出：

- IV 目前哪里最适合采集 trolley 位置。
- 跨 Phase 状态目前存在哪里。
- QA / 旧存档 / reload 如何注入 canonical fallback。
- `render_game_to_text` 应从哪里暴露 trace 摘要。
- 哪些现有 reset 会意外清除 trace。

## 输出格式

只返回一份 Markdown 报告，严格按以下标题：

1. `Executive Summary`
2. `Runtime Call Graph by Phase`
3. `Field Read/Write Matrix`
4. `Legacy Branches Still Live`
5. `QA Route Audit`
6. `Recommended File Ownership`
7. `IV→VI Trace Integration Points`
8. `Top 10 Integration Risks`
9. `Wave 2 Preconditions`

## 通过标准

- 所有关键判断均有文件与行号。
- 区分“文档说了”“注释说了”“代码实际消费了”。
- 至少发现一个当前文档与运行代码不一致之处；如果认为没有，必须给出逐项证据。
- 不提出完整新玩法，不改 Design Lock。
- 不修改工作区。
- 不读取 `.env`、Keychain、SSH、云凭证或任何无关敏感文件。

## 超时规则

如果任务接近 300 秒：

1. 先返回已完成的 A–C 与未完成清单，不得空结果。
2. 总师将 D–F 拆为第二个只读任务。
3. 不得因为超时修改代码或生成未经核实的结论。
