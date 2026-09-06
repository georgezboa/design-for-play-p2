# PROLOGUE PHASE III–VI SYSTEM ARC — 总 Design Lock

状态：**DESIGN LOCK（冻结）** · 2026-08-02
上游指令：「PROLOGUE PHASE III–VI SYSTEM ARC」连续工作指令（2026-08-02 附件）
本文地位：Phase III–VI 的唯一设计与施工真源。与任何旧文档冲突时以本文为准。

---

## §0 目的与范围

不再把 III、IV、V、VI 当成四个互不相关的房间分别设计。四段是**同一套铁路机械系统
逐渐展开、逐渐组合**的完整体验：玩家应当感觉自己越来越理解这列车，而不是每进一个
房间重新学习一款小游戏。

完成度基准：Phase II（门闩—牵引电气联锁 + 继电器柜，FINAL PASS，真人试玩通过）。
基线工程状态（2026-08-02 实测）：

- `node --test tests/tutorial/*.test.mjs tests/car03/*.test.mjs` → **366/366 通过**
- `npm run build` 通过；worktree dirty（本地未提交改动），**全程不 commit、不 push**
- 轨迹契约 `src/tutorial/phases/traceContract.js` 已冻结（TRACE_VERSION 1，30 测试绿）

---

## §1 统一物理骨架与总系统图

III–VI 共用同一个物理骨架。两条因果链都不是背景设定，而是玩家能看见、追踪和推理
的对象。**气路是并联拓扑**（Gate 0 纠错：早期"门气缸→悬挂→制动"的串行画法是错误
的，禁止据此制作空间管线）：

```
气路链（并联支路，共享气源、各自独立）：
              压缩机 / 主储气罐 / 总供气管
                ├─ door branch       → ISOLATE → BLEED → 门气缸
                ├─ suspension branch → 调平阀 → 空气弹簧
                └─ brake branch      → cutout / control valve → 制动执行器

电气链：  Phase II 继电器/接触器
            → 牵引电机（IV）→ 轮轴/车轮（IV→V→VI）
```

三个支路共享储气来源，但拥有独立压力、隔离阀、泄放状态和执行器；一个支路的操作
不得无理由直接串行驱动另一个支路，**只有总储气压变化才可以同时影响多个未隔离
支路**（已隔离的密封支路免疫）。

两条链在 **驱动转向架** 处汇合：电机转矩 × 轮轨黏着（轴重 × 悬挂状态）决定车轮是
空转还是咬轨；制动执行器是否真正释放决定轮轴能不能转。Phase VI 在此汇合点上做
时间协作。

空间与教学原则（对 III–VI 全部适用）：

- 所有线路优先布置在车厢地板以下、检修舱、转向架和车体结构中。
- 世界中的机械运动、管线脉冲、表针、车轮和门体承担**主要**教学责任。
- 文字只在第一次误解或连续失败后提供**一句**简短提示，不能长期盖住场景
  （沿用 `III_VI_IMPLEMENTATION_SPEC.md` Part 0.4/0.5 的上下文提示规范）。

---

## §2 共享系统状态接口

三个新共享模块 + 一个已冻结契约，构成 III–VI 的唯一状态真源。
**禁止为每一关复制一套互不相通的压力状态。** 所有模块沿用 `src/tutorial/phases/`
范式：纯逻辑、不 import Phaser、可单元测试、快照可序列化。

### 2.1 `phases/airNetwork.js`（新建）— 气路网

```
createAirNetwork(config) -> 实例 { update(dtMs, actions), snapshot(), reset() }
```

状态形状：

```js
{
  reservoir: { pressure: 0..100, supplyRatePerSec },  // 恒压气源
  branches: {
    door:       { pressure: 0..100, isolated: bool, venting: bool },
    suspension: { pressure: 0..100, isolated: bool, venting: bool },
    brake:      { pressure: 0..100, isolated: bool, venting: bool },
  },
}
```

锁定规则：

- `isolated === true` 的支路与储气罐断开：venting 只降不升，压力进入"密封"态。
- 未隔离支路在 venting 时同时受供气总管补压——**持续补压是 III 的核心机制**，
  不是调参细节；放气只能把压力压到供气平衡下限 `min(ventOpenFloor, reservoir)`，
  永远进不了释放带。
- `setReservoirPressure()` 是总储气压的唯一写点：降低总压会同时拉低所有**未隔离**
  支路（向新总压均衡），已隔离支路免疫。这是唯一允许多支路联动的操作。
- 迟滞（hysteresis）：门气缸/门闩在 `pressure < releaseThreshold` 时脱开，
  必须回升到 `reengageThreshold`（> releaseThreshold）以上才复位。
  **不要求绝对归零。**
- `snapshot()` 输出每支路 `{ pressure, isolated, venting, flow }` 与当前总压，
  供 HUD、美术脉冲、QA 与 Phase V 诊断读取。

### 2.2 `phases/motorAdhesion.js`（新建）— 电机/黏着

```js
{
  energized: bool,               // 写：Phase II 接触器链；读：IV/V/VI
  current: 0..1,                 // Gate 0 纠错：空转（卸荷）电流偏低，咬轨（牵引负载）电流升高
  wheelSpeed: 0..1,              // 空转=自由飞转(1)；咬轨=与车速耦合(crawl rate)
  axleLoad: { front: 0..1, rear: 0..1 },  // 写：悬挂调平阀 + 配重车位置；读：IV/V/VI
  adhesionLimit: 0..1,           // 咬轨所需最小驱动轴重（实现期锁定，见 §11）
  wheelState: 'idle'|'spinning'|'biting',
  carDisplacement: 0..1,         // 咬轨后车厢短距移动进度
}
```

锁定规则（Gate 0 电流语义，禁止写反）：

- `energized && axleLoad.drive < adhesionLimit` → `spinning`：车轮自由飞转、火花
  增多、车厢不动、**电流异常偏低**（卸荷电机拉力矩小）。
- `axleLoad.drive >= adhesionLimit` → `biting`：轮速与车速重新耦合、火花减弱、
  **牵引负载电流上升**、车厢短移。
- 视觉与音频事件（火花频率、电机音高）必须以 snapshot 的
  `wheelState / wheelSpeed / current` 为唯一键源，保证玩家不被错误反馈教学。
- 主反馈是**车体倾斜、弹簧压缩、空转火花、电机声、电流变化**；压力表只是辅助
  证据。禁止"把指针停进绿色区域"作为主玩法。

### 2.3 `phases/bogieSnapshot.js`（新建）— 转向架快照

```js
{
  id: 'front'|'rear',
  contactorClosed: bool,
  current: 0..1,
  linePressure: 0..100,
  axleLoad: 0..1,
  brakeReleased: bool,
  wheelTurning: bool,
  fault: null | 'brake-actuator-seized' | 'cutoff-valve-closed' | 'mechanical-pin',
  repaired: bool,
  serviceLockEngaged: bool,      // 世界可见的机械检修锁，禁止做成不可见布尔
}
```

- 制动语义（Gate 0 锁定，失气制动架构，**不允许混用**）：release line **高压 =
  缓解**，失压 = 弹簧自动夹紧。因此低压绝不等于"可以维修"——失压的制动器是
  夹紧的制动器。
- 安全维修链（Phase V 的操作序列，由空间布局教学，不用文字列出）：
  **隔离本地支路 → 泄压（< safeRepairPressure）→ 插入可见的 MECHANICAL SERVICE
  LOCK → repair() → 移除检修锁 → 恢复供气 → TEST**。
- `repair()` 的锁定条件三者缺一不可：`branchIsolated && branchPressure <
  safeRepairPressure && serviceLockEngaged`；检修锁自身也有机械联锁——支路带电
  或带压时锁销无法插入。
- 集成层必须真实画出检修锁销插入、制动连杆被机械固定的变化。
- 快照由共享系统（airNetwork + motorAdhesion）在每次 TEST 时生成，**Phase V 与
  Phase VI 读同一份**，不允许 Phase V 私造一套"看似正常"的假数据。
- `fault` 只存在于故障侧；诊断的全部乐趣来自前五个字段都正常而
  `wheelTurning === false` 的矛盾。

### 2.4 轨迹契约 — 复用 `phases/traceContract.js`（已冻结，不改）

- TRACE_VERSION 1；`{ version, durationMs, samples: [{tMs, normalizedX, marker}],
  settledX, source: 'player'|'canonical' }`。
- 必备语义标记：`left-extreme`、`center-cross`、`right-extreme`、`settled`。
- **Phase IV 是唯一生产者**（合法完成时记录配重车轨迹）；**Phase VI 是唯一消费者**
  （`normalizeTrace()` 入口，非法/缺失时自动回退 `createCanonicalTrace()`）。
- IV 的记录器必须保证四类标记全部落盘（契约校验硬性要求），缺失即视为非法轨迹。
- 会话内传递：由集成层（GameScene/TimetablePuzzle，主 Agent 所有）持有
  `runTrace`；QA 跳关/跨 session 无轨迹时 VI 用 canonical 默认轨迹，
  允许重录，**不得强迫玩家返回 Phase IV**。

### 2.5 读写者矩阵

| 字段 | 写 | 读 |
|---|---|---|
| airNetwork.branches.door | III 玩家操作 / VI 玩家操作 | III 门闩机械、V 诊断、VI 条件② |
| airNetwork.branches.suspension | IV 调平阀 / VI 回声轨迹 | IV 车体姿态、V 轴重证据、VI 条件③ |
| airNetwork.branches.brake | V 本地制动支路操作 | V 诊断、VI 条件⑤ |
| motorAdhesion.energized | II 接触器链（集成层转发） | IV/V/VI TEST |
| motorAdhesion.axleLoad | IV 配重车 + 悬挂 / VI 回声轨迹 | IV 咬轨判定、V 排除证据、VI 条件③④ |
| motorAdhesion.wheelState | 共享模块推导 | IV 火花/声音、V 矛盾证据、VI 条件④ |
| bogieSnapshot.* | 共享模块（每次 TEST） | V 诊断界面、VI 同步判定 |
| runTrace（traceContract） | IV 记录器 | VI 回放器 |

---

## §3 Phase III — LOCAL AIR CIRCUIT（junction-3，x 1600–2390）

**唯一新概念：气路分支与持续补压。** 除此之外不引入任何新机制。

空间顺序（锁定，坐标实现期定，顺序不可变）：

```
储气罐 → ISOLATE → 压力表 → BLEED → 门气缸/机械门闩
```

成功链：

1. 玩家第一次直接长按 BLEED：管路明显放气，但供气端不断补回，表针无法进入
   释放区，门闩只移动一部分又复位（Introduce — 失败但信息完整）。
2. 玩家沿可见管线回溯，关闭 ISOLATE，切断了补压源（Develop）。
3. 再长按 BLEED：压力降到阈值以下（迟滞，非归零），气缸缩回，门闩机械脱开
   （Resolve）。

锁定要求：

- 不使用隐藏倒计时；不要求泄压后跑到另一个按钮。
- 低压阈值 + 迟滞带宽，数值由实现期单元测试锁定并回写 §11 附录。
- 高压与低压必须通过**管线刚度、气流粒子/脉冲、气缸位置、表针、门闩行程**
  共同表现——五种渠道里至少四种可见，不能只靠表针。
- 教学结构 Introduce → Develop → Resolve；玩家第一次失败后**原地可修正**，
  不重置房间、不清空已理解的内容。
- ISOLATE/BLEED 是长按与拨动两类机械动作，沿用 Part 0.2 的动词规范。
- 禁止金色持续高亮下一个正确交互物。

门状态链（2026-08-02 修正，禁止 `|| complete` 伪造）：

```
LOCKED → RELEASED → OPENING → OPEN
```

- `airNetwork` 只负责物理真值：真实气压、气缸与门闩**当前**是否释放；
  `localAirCircuit` 负责解谜阶段，不得伪造 airNetwork 的物理快照。
- 压力低于阈值进入 `RELEASED`，发一次 `door-release-ready`，**此时不完成**；
  集成层收到事件后开始门体动画，门实际打开到明确阈值后调用
  `confirmDoorOpened()`（只能从 RELEASED/OPENING 成功，重复回调幂等）。
- 只有进入 `OPEN` 才允许 `stage-complete` 与下一房间通行。
- `RELEASED`/`OPENING` 阶段恢复供气：允许门闩重新咬合、回到 `LOCKED`
  （事件 `door-relocked`），房间仍可原地再解。
- 一旦 `OPEN`，机械棘爪保持门开；此后复压不关闭已打开的门。
- 快照必须分别暴露 `doorLatchReleased`（物理真值）、`doorState`、
  `stageComplete` 三个字段。

一次性提示延迟：

- 第一次持续放气必须经过一个**完整、清晰的视觉脉冲周期**后才出现文字——
  文字出现前玩家必须已经看到：排气端脉冲、供气端反向补压脉冲、表针停在
  释放阈值以上、气缸试图缩回又被顶回。
- 初值 `stallNoticeMs = 1100`（1000–1200ms 区间内由浏览器试玩校准）。
- 文案只出现一次，且不直接说"关闭 ISOLATE"：
  `STILL REFILLING — TRACE THE PIPE BACK`。

## §4 Phase IV — WEIGHT / ADHESION（junction-4，x 2400–3190）

**唯一新概念：空间载荷会改变轮轨黏着。**

叙事前提：Phase II 的接触器已经能给牵引电机送电，但电机轮轴空转，车厢无法移动。
原因：受损空气悬挂 + 服务配重让驱动转向架轴重不足。

成功链：

1. 观察：电机已通电（II 的知识），车轮高速空转（火花、声音、电流高位）；
2. 操作从 Phase III 延伸来的**悬挂调平阀**（同一 airNetwork 的 suspension 支路）；
3. 移动**检修配重车**，改变前后悬挂高度与驱动轴载荷——车体倾斜与弹簧压缩
   实时可见；
4. 载荷进入可用范围后再次 TEST：车轮从空转转为咬轨，车厢短距离移动并对齐
   下一扇门。

锁定要求：

- 不做"指针停绿区"；主反馈是车体倾斜、弹簧压缩、空转、火花、电机声、电流变化；
  压力表只是辅助证据。
- **合法完成时记录配重车轨迹**，格式 = §2.4 traceContract（实现 IV 前记录器接口
  随共享接口一起冻结）。轨迹将被 Phase VI 消费。
- 配重车位置是连续量，映射到 axleLoad；迟滞同样适用，防止阈值抖动。
- 失败（载荷不足时 TEST）只表现为空转加剧，不清空配重位置。

## §5 Phase V — READ THE BOGIE（junction-5，x 3200–3990）

**唯一新概念：根据矛盾证据定位故障。**

布置：一组正常转向架 + 一组故障转向架，接受**同一次 TEST**（同一份
bogieSnapshot，见 §2.3）：

- 正常侧：接触器闭合 → 电流上升 → 制动释放 → 轮轴转动。
- 故障侧：接触器闭合 → 电流上升 → 气路有压 → 载荷正常 → **轮轴仍不转**。

最终故障是**局部**制动执行器卡死 / 切断阀关闭 / 机械销卡死（三选一，实现期定，
写入 §11）。玩家必须依据此前学过的信号逐项排除：

- 不是 Phase II 的电路故障（接触器、电流正常）；
- 不是 Phase III 的总气源故障（支路压力正常）；
- 不是 Phase IV 的轴重不足（载荷正常）；
- 是制动力传递链中的**局部断点**。

成功链：玩家只对**故障转向架的本地制动支路**（airNetwork 的 brake 支路）执行
Gate 0 安全维修链——隔离 → 泄压 → 插入机械检修锁 → 修复 → 移除检修锁 →
恢复供气 → 重新 TEST，轮轴恢复转动。正常侧不可被误拆。

锁定要求：

- 不做固定顺序的"四个仪表检查清单"；证据沿真实机械路径布置。
- 允许玩家先形成错误假设，并通过机械反馈排除；错误假设可安全证伪。
- 错误操作不能清空整关，也不能把正确答案直接写出来；维修对象限定在故障侧
  本地支路，正常侧不可被误拆。

## §6 Phase VI — PAST RIDES THE LOAD（junction-6，x 4000–4790）

**唯一新概念：时间协作与系统综合。**

过去的玩家按 **Phase IV 真实记录的配重轨迹**重新移动（无轨迹时 canonical）。
当前玩家不能直接控制过去的自己。过去轨迹周期性改变：空气悬挂高度、驱动转向架
轴重、电机可用黏着力、检修通道/机械平台位置。

成功链（六条件，逐步成立、局部进展保留）：

1. 门的机械联锁完成（II 的继电器 TEST）；
2. 正确气路被隔离并释放（III 的 ISOLATE/BLEED）；
3. 驱动转向架获得足够载荷（IV 的载荷知识——由**回声轨迹**在语义窗口内提供）；
4. 电机从空转转为咬轨；
5. 两组转向架同步（V 的诊断知识——故障侧已被维修的本地支路保持释放）；
6. 列车启动，进入章节动画。

锁定要求：

- 不使用精确毫秒 QTE；以 `left-extreme` / `center-cross` / `settled` 等**语义标记**
  触发机会窗口，窗口宽度由实现期锁定（§11），宽到"读懂节奏"即可命中。
- 第一个循环只负责观察，不惩罚玩家。
- 后续尝试保留局部进展；失败不死亡、不重置整个房间。
- QA 跳关/跨 session 无 IV 轨迹 → canonical 默认轨迹；允许重录，不强迫返回 IV。
- **回声是机制必要条件**（条件③④离不开它提供的载荷节奏），但**不替玩家按键**——
  它不自动完成任何一步玩家操作。

---

## §7 跨阶段难度阶梯与禁止清单

严格保持（每段只引入一个新变量，但复用此前的视觉语言和机械动作）：

| 段 | 认知类型 | 玩家问题 |
|---|---|---|
| II | 离散电气拓扑 | 哪个触点正确？ |
| III | 流体拓扑 | 哪个分支仍在补压？ |
| IV | 连续空间状态 | 载荷在哪里，轮轴为什么空转？ |
| V | 矛盾诊断 | 哪个系统真的坏了？ |
| VI | 时间协作 | 什么时候让多个已学系统对齐？ |

禁止（全 arc 适用）：

- 三段都变成"按三个按钮的正确顺序"；
- 三段都变成"把指针保持在绿色带"；
- 用任务列表告诉玩家第一步、第二步、第三步；
- 用隐藏时间窗制造难度；
- 通过金色高亮持续暴露下一正确交互物；
- 为了复杂而堆叠完全不相关的小游戏；
- 为每一关复制一套互不相通的压力状态。

---

## §8 实施顺序与每段放行条件

设计一起完成（本文），代码按依赖实施：

1. ✅ 冻结 III–VI 总规格和共享系统状态接口（本文 + §2 模块的接口骨架）。
2. 实现共享 air-network、motor/adhesion、bogie snapshot（trajectory contract 已有）。
3. 完成 Phase III 并做真实浏览器验收。
4. 完成 Phase IV，同时产出可供 VI 使用的轨迹。
5. 完成 Phase V，必须读取同一个共享系统快照。
6. 完成 Phase VI，消费 IV 轨迹并综合 II–V。
7. 从 Phase II 开始连续玩到 Phase VI，检查教学、节奏和视觉连贯性。

每段放行条件（缺一不可，不以"代码能跑"为准）：

- 玩家不读文字也能指出能量/空气/力从哪里来、到哪里断；
- 失败后知道场景中什么物体发生了变化；
- 错误操作不会清空已经理解的内容；
- 新阶段确实消费前一阶段教过的知识；
- 与前一阶段在盲评中不能被描述为"同一道题换了皮"；
- 所有新增状态字段都能找到真实读点、写点和可见反馈（对照 §2.5 矩阵）；
- 完整重载后可以重新从入口完成；
- 自动测试、build、diff check 全绿；
- 真实浏览器连续完成 Phase II–当前阶段。

暂停条件（仅此四条可中断连续执行）：不可兼容冲突；不可恢复的存档/软锁风险；
付费资产或外部 API 需用户批准；同一技术阻塞连续重试两次未解决。

---

## §9 现状盘点与旧件处置表

当前仓库里 III–VI 全是**旧设计**，本 arc 实施时按下表处置：

| 对象 | 现状 | 处置 |
|---|---|---|
| `docs/PHASE_III_AIR_CIRCUIT_KIMI_WORK_PACKAGE.md` | 旧"BRAKE 时间窗→VENT→跑 LATCH"包 | ✅ 已标 `SUPERSEDED`（2026-08-02），历史保留 |
| `src/tutorial/airLock.js` + `AIR_LOCK_TUNING` | 旧 III 状态机（VENT_RATE 70/s、RECOVER 8/40、LATCH_THRESHOLD 30、MIN_HOLD 400ms），TimetablePuzzle 内约 15 处调用点 | 新 III 上线时由集成层解除接线并移除调用点；文件在 Phase III 验收全绿后删除。旧数值**不继承** |
| `level.js` junction-3 `airLock` 块 + `prompts` | 旧 III 配置 | 由新 `airCircuit` 配置替换；`solution` 字段保留（28 处无防御读取，仅供完成美术/目标文本） |
| `level.js` junction-4 `manualX/manualWindowMs` 时间窗 | 旧 IV"刹车后限时跑到配重闩" | 废止，由 WEIGHT/ADHESION 配置替换；守卫线 3178 约束继续有效 |
| `level.js` junction-5 `pressureHold` 模拟压力带 | 旧 V"把压力保持在 30–62 带内" | 废止（违反"指针绿带"禁令），由 READ THE BOGIE 配置替换 |
| `level.js` junction-6 `echoGates` 三闸门 | 旧 VI"PAST 走下层、玩家开三道闸" | 废止，由 PAST RIDES THE LOAD（轨迹驱动）替换 |
| `docs/III_VI_IMPLEMENTATION_SPEC.md` | 779 行旧施工规范 | **Part 0（共同语法 0.1–0.5）保留有效**；Part 1–4 中与本文冲突的条款（III 时间窗数值、IV 距离变量等）废止；其安装面/QA 路线/`render_game_to_text` 施工范式继续参考 |
| `docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md` | 早先集群执行计划 | 设计血统一致（五段认知阶梯），其 Wave 0–9 调度被本文 §8 取代 |
| `docs/PROLOGUE_V_VI_REDESIGN.md`、`MDA_REDESIGN_III_VI.md`、`SECTION_III_REDESIGN_AUDIT.md` | 历史研究件 | 非施工依据，保留不删 |
| `docs/NEXT_TASK.md` | 任务指针 | 实施 Phase III 时同步更新指向本文 |

---

## §10 文件所有权与多 Agent 规则

总设计、共享状态模型和跨阶段集成由**主 Agent 连续负责**，避免设计被拆碎。

| 路径 | 性质 | Owner |
|---|---|---|
| 本文 | 总规格 | 主 Agent |
| `src/tutorial/phases/airNetwork.js`、`motorAdhesion.js`、`bogieSnapshot.js` | 共享状态接口 | 主 Agent |
| `src/tutorial/phases/traceContract.js` | 冻结契约 | 主 Agent（按文件头约定，仅此文件可改契约） |
| `src/scenes/GameScene.js`、`src/tutorial/TimetablePuzzle.js`、`src/level.js` | 共享集成层 | **仅主 Agent** |
| QA 路由（`TimetablePuzzle.setupQA` 扩展 `?qa=phase3…` 等） | 集成层 | 仅主 Agent |
| `src/tutorial/phases/localAirCircuit.js`（III 逻辑） | 独立模块 | 可委派（独占所有权），集成主 Agent |
| `src/art/airCircuitArt.js` 等各段美术模块 | 独立模块 | 可委派（独占所有权） |
| `tests/tutorial/airCircuit*.test.mjs` 等测试夹具 | 独立模块 | 可委派（独占所有权） |
| 首次玩家盲评 | 只读 | 实现完成后委派未参与者 |

只有以下情况使用多 Agent：完全独立文件所有权的真并行；独立美术模块与独立测试
夹具并行；完成后的首次玩家盲评；唯一 integration owner 合并共享文件。
**不为"显示在使用集群"而开 Agent；不让多个 Agent 同时改共享集成层文件。**

---

## §11 数值待定清单（实现期锁定并回写本附录）

以下数值本文不发明，由各阶段实现期用单元测试锁定后回写（Phase II 继电器调参表
先例——数值必须有测试守护，禁止孤立重调）：

| 待定项 | 所属 | 锁定方式 |
|---|---|---|
| BLEED 排放速率、储气罐补压速率 | III | 单元测试：未隔离时放气永远无法进入释放区；隔离后可在合理长按时长内进入 |
| 释放阈值 releaseThreshold 与迟滞带宽 | III | 单元测试：阈值下方脱开、回升过 reengageThreshold 才复位，无抖动 |
| adhesionLimit、配重车位置→axleLoad 映射 | IV | 单元测试：空转/咬轨两态可达且边界稳定 |
| V 故障三选一（执行器/切断阀/机械销）及快照信号值 | V | 单元测试：矛盾证据完整且唯一指向本地制动支路 |
| VI 语义标记窗口宽度、循环周期 | VI | 单元测试 + 浏览器验收：读懂节奏即可命中，非毫秒 QTE |

锁定后回写为本文「附录 A：数值表」，并标注对应测试文件。

---

## 附录 A：数值表（实现期回写）

### A.1 气路网（III 已锁定，2026-08-02；Gate 0 并联纠错）— `src/tutorial/phases/airNetwork.js`

测试守护：`tests/tutorial/airNetwork.test.mjs`（18 项）+
`tests/tutorial/localAirCircuit.test.mjs`（14 项，门状态链 LOCKED→RELEASED→OPENING→OPEN）

| 数值 | 值 | 锁定的行为 |
|---|---|---|
| reservoirPressure | 100 | 恒压气源初值；`setReservoirPressure()` 是唯一多支路联动写点 |
| ventRatePerSec | 55 | 隔离后从满压到释放带 ≈1.27s（可读懂的长按，非点按） |
| supplyRatePerSec | 14 | 恢复供气 ≈5s 可见回填；总压下降时未隔离支路同速率均衡 |
| ventOpenFloor | 55 | 未隔离放气的平衡下限 `min(floor, reservoir)`：**永远进不了释放带**（III 核心机制） |
| releaseThreshold | 30 | 低于此值气缸缩回、门闩脱开 |
| reengageThreshold | 45 | 回升超过此值门闩才复位（迟滞带宽 30–45；不变量：55 > 45 由测试守护） |
| stallNoticeMs（localAirCircuit） | 1100 | 一次性提示前的完整视觉脉冲周期；浏览器试玩可在 1000–1200ms 校准并回写 |

并联拓扑证明（Gate 0）：泄放 door 不降 suspension/brake；隔离 suspension 不断 door；
总储气压变化同时影响多个未隔离支路、密封支路免疫——均由测试锁定。

### A.2 电机/黏着（全部已锁定，2026-08-03；Gate 0 + Phase IV 回写）— `src/tutorial/phases/motorAdhesion.js`

测试守护：`tests/tutorial/motorAdhesion.test.mjs`（12 项）。已锁定：
`adhesionLimit 0.55`、迟滞 0.08、**spinningCurrent 0.35 < bitingCurrent 0.85**
（空转卸荷低电流 / 咬轨牵引高电流，测试锁定排序）、位移 0.25/s、
wheelSpinUpPerSec 3（空转自由飞转 wheelSpeed=1；咬轨 wheelSpeed=crawl rate 0.25，
位移完成后归零）。
载荷映射常数 **已锁定（Phase IV 回写）**：loadBase **0.1** / loadSpan 0.5 /
healthFloor 0.5 / healthSpan 0.5。语义：满修复悬挂（health=1）仍需
trolleyX ≥ 0.9 才咬轨（0.1 + 0.5×0.9 = 0.55 = adhesionLimit），低于 0.74
掉转——泄漏悬挂（floor 55 → max load 0.465）永远无法硬顶过去，由
`tests/tutorial/weightTransfer.test.mjs` 锁定。

### A.3 转向架（已锁定，2026-08-02；Gate 0 检修锁；Phase V 回写故障）— `src/tutorial/phases/bogieSnapshot.js`

测试守护：`tests/tutorial/bogieSnapshot.test.mjs`（11 项）。制动释放压力 60
（有压=缓解、失压=夹紧，fail-safe 语义锁定不混用）；安全维修压力 <20；
**机械检修锁**：`repair()` 三者缺一不可（已隔离 && 压力 <20 && serviceLockEngaged），
检修锁在支路带电/带压时无法插入——拒绝路径与完整安全链均由测试锁定。
故障三选一的最终取舍 **已锁定（Phase V 回写，2026-08-02）**：
`brake-actuator-seized`，**rear** 转向架（`bogieDiagnosis.js` 默认值；
`tests/tutorial/bogieDiagnosis.test.mjs` 锁定矛盾诊断与检修链）。

### A.4 VI 语义窗口（已锁定，2026-08-03）— `src/tutorial/phases/echoReplay.js`

测试守护：`tests/tutorial/echoReplay.test.mjs`（14 项）。已锁定：

| 数值 | 值 | 锁定的行为 |
|---|---|---|
| riderBonus | 0.1 | 回声载重 = baseDrive + riderBonus×echoX；窗口阈值落在 echoX ≥ 0.75，canonical 与玩家轨迹共用同一判据 |
| biteHoldMs | 900 | 咬轨且 I/II/V 三系统对齐时持续 900ms 才进入出发 |
| departureMs | 2600 | 出发条纹/章节卡的固定节拍，之后发一次性 `stage-complete` |
| canonical 轨迹 | 6000ms | QA 绕过 IV 时的降级轨迹（lock §2.4）；窗口 ≈2857–3714ms，迟滞尾撑到 ≈4398ms |
| 观察环 | loopIndex 0 | 第一圈只属于过去自己：接电被婉拒（`observe-first-loop`），不消耗尝试 |
| stale 规则 | — | 窗口外接电=空转；armed 拖过窗口=退化 stale；空转轮不再吃载重，必须松开 TEST 重新接电 |

轨迹消费契约：VI 只读 `puzzle.weightTrace`（`traceContract.js`），
`source: 'player'` 时按真实轨迹循环；缺失/无效时回退 canonical，
快照 `traceSource` 字段由集成测试与浏览器连续验收双重锁定（2026-08-03 连续
验收实测：IV 实产 73 样本 / 9095.7ms，VI 消费 `traceSource: 'player'` 通过）。

---

## §12 交付汇报清单

最终交付时汇报：① III–VI 总系统图；② 每段唯一的新认知变量；③ 共享字段与文件
所有权；④ 实际使用了哪些 Agent 及必要性；⑤ 浏览器连续试玩路线与截图；
⑥ 尚未由真人验证的项目；⑦ 本地改动清单。
