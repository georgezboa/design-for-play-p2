# Phase III：气动门回路 `THE AIR THAT KEEPS COMING BACK` — Kimi 多 Agent 工作包

状态：`SUPERSEDED`(2026-08-02)
本文件的“BRAKE 延长时间窗 → VENT → 跑到远端 LATCH”方向被「PROLOGUE PHASE III–VI
SYSTEM ARC」指令废止：隐藏时间窗属于项目已失败过的设计，且无法自然连接电机、悬挂与
轮轴系统。新的唯一真源是 [PROLOGUE_III_VI_SYSTEM_ARC_LOCK.md](PROLOGUE_III_VI_SYSTEM_ARC_LOCK.md);
Phase III 改为 LOCAL AIR CIRCUIT(气路分支与持续补压:ISOLATE → BLEED → 门气缸/门闩,
无隐藏倒计时、无泄压后跑动)。本文件仅作历史保留，不再作为施工依据。
上游冻结件：`docs/III_VI_IMPLEMENTATION_SPEC.md` Part 1(Section III,设计冻结)、
`docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md`(Design Lock)、`docs/NEXT_TASK.md`。

## 0. 总师裁决

**锁定玩法链**:

```
走近 BRAKE(1690)点按 E 锁住制动歧管        ← 源头操作(买时间)
  → 走到 VENT(2110)长按 E 放气,压力 70/s 下落,管路松垂
  → 松键,压力以 8/s 回升,高光沿黄铜管路 VENT→LATCH 行进   ← 传动过程
  → 在低压窗口(pressure < 30,约 3.3s)内走到 LATCH(2330)按 E
  → 爪抬起咬住,车厢出口打开                ← 远端结果
```

**教学机关(不可稀释)**:跳过 BRAKE 直奔 VENT 是合法操作,但未刹回升率是 40/s,
低压窗口只有 0.75s,短于 VENT→LATCH 的 1.10s 步行时间——纯走路必然失败,爪抬起
一掌高后落回。玩家被物理逼着发现 BRAKE,而不是被文字告知。已刹路径余量 2.23s,
永不需要 speedRun。

**与 Phase II 的共享语法**:源头操作(BRAKE/VENT)— 传动过程(管路松垂/绷紧、
高光行进)— 远端结果(LATCH)。不共享 Phase II 的题目:Phase II 是电气通断,
Phase III 是"压力是资源、房间是机器"。

**三种失败必须仅凭机械可辨**(冻结 `failReason` 三值):

| failReason | 机械表现 |
| ---------- | -------- |
| `no-brake` | 指针回升明显快(40/s),气路 0.75s 即绷紧,门闩当即拒绝 |
| `latch-bit` | 指针从未离开红弧;爪抬起一掌高后落回,闷响 |
| `repressurized` | 指针离开红区后又爬回边界;管路绷紧;爪落下 |

**阈值与迟滞(总体计划折入)**:门闩开启判定使用阈值加迟滞,不以绝对零点为准——
压力曾低于阈值即 `windowAchieved = true`,爪的咬合判定允许在回升途中一个小的迟滞带
内成立,具体带宽由逻辑 owner 以单元测试锁定并写回本文件。失败绝不重置 Section I/II,
不清除 `brakeSet`,不弹教程。

## 1. 现状盘点(Wave 0 已确认的事实,施工前必须复核)

- `src/tutorial/airLock.js` 已存在并有单元测试,是数值与状态机的**唯一真源**;
  若它与本文件冲突,以 airLock.js + 测试为准,并把差异写回本文件。
- **已知阻塞**:`createAirLock(stage.airLock)` 丢弃 stage 配置,而 `AIR_LOCK_TUNING`
  独立控制运行时,存在两个表面真源。Wave 1 必须收敛为一个(建议:逻辑模块内部
  常量为准,stage 配置仅覆盖坐标),收敛方式由逻辑 owner 提出、总师裁决。
- Section III 房间已可渲染(panorama/texture 资产齐,`?qa=timetable-3-layout`
  是旧布局 QA 路线);旧的 `commands/solution` 卡片鼓系统已冻结为遗产,
  不得复活、不得与之并行运行。
- `src/tutorial/phases/` 已有 contactInterlock / relayCabinet / traceContract
  三个纯逻辑模块范式(snapshot/drainEvents/不抛异常),Phase III 沿用同范式。

## 2. 玩家体验锁定(引自冻结规范,不得重新发散)

- 入场:`player.x = 1610`,`pressure = 100`,`brakeSet = false`,
  `latchEngaged = false`。从左到右 BRAKE(1690)→ VENT(2110)→ GAUGE(2220)
  → LATCH(2330);段落铭牌是唯一 HUD 元素(Phase II 的 HUD 隐藏先例沿用,
  本关由集成 owner 按同一模式处理 stageIndex 2)。
- BRAKE:62px 内点按 E 切换 `brakeSet`,手柄压下并锁住。
- VENT:62px 内**长按** E 开启,开启期间阀轮转动,压力以 70/s 下落,下限 0;
  长按不足 400ms 松键则阀未坐实,压力复原,无嘶声。
- GAUGE:**纯显示,永不作为 interactable**,不占提示名额;指针角度映射压力,
  红弧 30..100;位于 y 420,站在 VENT 或 LATCH 都在视口内(规范 III.10 已证明)。
- LATCH:62px 内点按 E;窗口内爪抬起咬住过关,否则抬起一掌高落回、闷响。
- 提示语只许四条(触发/消除条件见规范 III.11):`[E] SET BRAKE`、
  `[HOLD E] RELEASE AIR`、`[E] TEST LATCH`、`THE LINE IS RE-PRESSURIZING`
  (仅失败后最多一次,描述物理不剧透顺序)。
- 管路:`pressure < 30` 松垂微脉动,`>= 30` 绷直变亮——这就是"窗口已关闭"
  的视觉信号,不许再加箭头或文字。

## 3. 逻辑与数据契约

- 新纯逻辑模块 `src/tutorial/phases/airCircuit.js`(命名可由逻辑 owner 微调),
  接口沿用 `enter/update/interact/reset/snapshot/isComplete/destroy/drainEvents`
  范式;持有 E 的 held/released 边沿(VENT 长按),复用 GameScene 已有的
  `inputState.interactHeld/interactReleased` 先例。
- snapshot 至少暴露规范 III.15 要求的字段:`pressure`、`brakeSet`、`venting`、
  `latchEngaged`、`windowAchieved`、`failReason`(三值或 null)、`dpdt` 符号,
  供 `render_game_to_text()` 与 QA 断言。
- 事件流一次性、不重复:`brake-set/cleared`、`vent-start/stop`、
  `latch-engaged`、`latch-refused`(带 failReason)、`window-entered`。
- 数值冻结(冲突时以 airLock.js 测试为准):VENT_RATE 70/s 统一;回升已刹 8/s、
  未刹 40/s;阈值 30;VENT→LATCH 220px/1.10s;坐标间距离守规范 III.13 全部约束
  (守卫线 2378,LATCH 2330，余量 48px)。
- 不修改 traceContract(IV→VI 契约)、contactInterlock、relayCabinet 的任何行为;
  Phase II 的 315 项测试必须保持全绿，只允许新增测试。

## 4. 艺术锁定

- 四机械安装面按规范 III.8:BRAKE 地面铸铁支架、VENT 墙面黄铜阀轮、GAUGE 齐眼高、
  LATCH 车厢出口爪。沿用 Phase II 材质纪律(24 色板、低像素列车材质、边缘高光
  ≤2px、无网页感面板)。
- 黄铜气路走向按规范 III.9 的五点折线;松垂/绷紧两态是唯一压力语言。
- 指针、阀轮、爪都是机械运动，不是 UI 动画;闷响/嘶声/咬合声沿用 sfx 注入约定。
- 不增加可交互对象；装饰性细节(铆钉、铭牌、磨损)允许，参照 Phase II patina
  先例，低对比、不压过管路语言。

## 5. 多 Agent 执行计划

与 Phase II 同规:总师只做分派/裁决/集成放行/验收；共享文件(GameScene.js、
level.js、main.js、HudScene.js)只有唯一 integration owner 可改；超时先查
partial diff、resume 或拆小，不得直接宣布停止；本地工作，不 commit、不 push，
保护 dirty worktree。

- **Wave 0**(1 只读 Agent):针对 Section III 的定点地图——airLock.js 现状与
  测试覆盖、createAirLock 双真源细节、旧鼓系统残留调用点、GameScene stageIndex 2
  接线点、HUD 隐藏先例落点。产出 `docs/PHASE_III_WAVE_0_MAP.md`。
- **Wave 1**(两个并行 owner):
  - `air-logic-owner`:`phases/airCircuit.js` + 新测试(状态机、三失败、
    窗口/迟滞、长按 400ms 坐实判定、snapshot/事件契约);负责收敛双真源。
  - `air-art-owner`:`src/art/airCircuitArt.js`(四机械 + 管路两态 + 提示锚点),
    沿用 relayCabinetArt 的零 tween 泄漏纪律。
- **Wave 2**(两个并行敌对审计):一个只读找逻辑漏洞(数值可达性、事件泄漏、
  状态卡死);一个以首次玩家身份找读法问题(不剧透能否发现 BRAKE)。
- **Wave 3**:`integration-owner`(唯一)接线 GameScene/level/HUD,退役旧鼓系统
  可见路径，补 QA fixture 路由。
- **Wave 4**:QA owner 补全测试矩阵(逻辑 + 美术 mock + 链路 QA)。
- **Wave 5**:总师真实浏览器验收(见 §6),随后按 Design Lock 做 **II/III 跨关
  盲比**(同一盲玩者连玩两关，确认两题不共享解法),再进入 Phase IV。

浏览器驱动配方(已三轮验证，直接沿用):WebBridge `127.0.0.1:10086`;
navigate 后必须 CDP `Page.bringToFront` + `Emulation.setFocusEmulationEnabled`;
Phaser 3.90 只监听 MouseEvent;键盘事件补 keyCode/which;长按 E = keydown 保持
+N 秒后 keyup。

## 6. 验收标准(全部满足才允许进 Phase IV)

1. 既有 315 项测试全绿 + 新增测试全绿;`npm run build` 通过;`git diff --check` 干净。
2. 真实浏览器完整链截图:入场(压力满、红弧)→ 直接 VENT+LATCH 失败
   (no-brake 机械三态可读)→ BRAKE 锁定 → VENT 放气(管路松垂)→ 低压窗口
   走行(高光行进)→ LATCH 咬合过关。每态 ≥300ms 稳定后截图。
3. 重载后已刹路线一次完成可复现;失败后原地恢复(不重置 I/II,`brakeSet` 保留)。
4. 盲玩审查:首次玩家不看答案完成,并能解释"为什么先刹车";90 秒标准仅作参考,
   以"能解释因果"为准。
5. 三种 failReason 各触发一次并留状态快照证据。

## 7. 禁令

- 不改正确答案/状态机/阈值语义之外的任何既有关卡(II 已 FINAL PASS,碰 II 即退回)。
- 禁止密码题、颜色配对、Simon Says、屏幕倒计时、全局失败、失败清场。
- 禁止大型教程框、悬浮网页面板、持续闪烁箭头;提示语不得超过 §2 的四条。
- 禁止 commit/push;禁止删除历史文件;禁止复活旧卡片鼓系统。

## 8. 完成后只汇报

1. 每个 Agent 实际负责什么、超时/重试记录;2. 修改/新建文件清单与所有权;
3. 被总师否决或裁决的项;4. 自动检查结果原文;5. 浏览器完整链结果与截图路径;
6. 双真源收敛方式;7. 无法验证项如实声明。
