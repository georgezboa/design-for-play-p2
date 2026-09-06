# Wave 3 — Phase II / CONTACT 最终坐标与状态规范（主 agent 裁决）

> 2026-08-01 插入段：本规范仍锁定左侧门闩、右侧接触器、材质和五种基础视觉状态；
> 但 x≈1195 的“单纯断点”和一次直通传播已由
> [PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md](PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md)
> 扩展为可操作继电器柜与前后两段传播。新工作包在这两个范围内优先。

状态：**LOCKED — 2026-08-01 视觉走线经玩家试玩修订**
输入：Agent A `phase-ii-spatial-reviewer` 空间简报 + Agent B `phase-ii-visual-director` 视觉规范。
冲突裁决原则：空间以 A 的实测坐标为准；画面表现以 B 的五状态规范为准；色值只允许 `src/art/colors.js` 的 `C(CAR.*)`，不新增色。

## 一、锁定坐标（像素，现有坐标系）

| 装置 | 坐标 | 说明 |
|---|---|---|
| 门闩 latch | **x=850, y=430** | 挂入口侧真实门框（x≈800，框体 y244–464），紧贴玩家进入点 |
| 铜线走线 | **y=556，x 850 → 1440** 水平 | 埋入车厢地板下方的金属电缆槽；门闩与接触器各有一根穿地板的垂直引线，绝缘子每约 90px 一个（6×8px 陶瓷） |
| 断点 | **空隙 x=1197 / 1203（6px，中心 1200）** | 两端各 3×4px 铜端头；门闩压入后由闩体旁铜舌桥接，空隙消失 |
| 接触器 POWER | **x=1440, y=430** | 占用原 RUN 位；透明壳约 64×84px；距守卫线 1578 有 138px 安全余量 |

玩家站房间中部（≈1145）时三装置同屏；门闩↔接触器 590px，走 2.9s / 跑 1.9s，唯一一次设计内回头发生在误按 POWER 弹回后。交互判定沿用 GameScene 现有 dx<62、dy<100。

## 二、五状态画面（锁定）

1. **dormant**：门闩偏开约 8°；铜线 STEEL_MID α0.5 2px，断点留 6px 空隙；接触器玻璃壳 GLASS_DARK α0.9，衔铁释放位（上偏 6px），壳顶灯灭；接触器区环境光额外暗 15%。
2. **power-fail**（`contactor-bounce`，约 450ms）：衔铁 120ms 下压 4px + 260ms `Back.easeOut` 弹回；断点两端头各闪一次 LAMP_ALERT（160ms，one-shot，不循环）；壳顶灯 LAMP_WARN 单闪。其余元素不动，无全局红屏。
3. **signal-moving**（1200ms）：门闩 180ms `Cubic.easeOut` 压入卡位；铜线按 `signalProgress` 逐段点亮 LAMP_OK 3px α0.85；传播前锋 4×4 TUNGSTEN 亮点（ADD，α1）沿车底电缆槽移动；断点被铜舌桥接。时长必须允许首次玩家用眼睛完整跟随一次因果链。
4. **energized**：全线 LAMP_OK 常亮，前锋消失；壳顶灯 LAMP_OK 慢呼吸（Sine 1400ms）；衔铁磁化微吸 2px 循环；壳内 TUNGSTEN_REFLECT α0.12。
5. **complete**（`contactor-closed`/`traction-enabled`）：衔铁 80ms `Cubic.easeIn` 砸到吸合位；车厢灯序列走亮、服务灯 LAMP_OK、车底 TUNGSTEN_REFLECT α0.08；300ms 后全部稳态，无循环强调动画。

## 三、视觉优先级与引导

主角永远压过机械面（铜线/接触器最高 BRASS_MID，BRASS_HI 仅 ≤2px 边缘线）。注意力层级：动态件（前锋/衔铁）> 门闩 > 铜线静段 > 环境。误按 POWER 的引导链＝衔铁弹回 → 断点红闪一次，视线顺线找到门闩；**禁止任何箭头/金色高亮指答案**。

## 四、文字上限

仅 `[E] RESET LATCH` 与 `[E] CLOSE CONTACTOR`。不得出现 FIRST/THEN、顺序、答案。

## 五、art 模块接口（Agent C 必须实现）

`src/art/contactInterlockArt.js` 默认导出 `ContactInterlockArt`：

```js
constructor(scene, { startX, endX, wallY })
applySnapshot(snap)      // 幂等稳态重绘，每帧可调用
handleEvent(evt)         // 只播一次性动画/音效，不改状态
setPrompt(target, text|null)  // target: 'latch' | 'power'
setVisible(v); destroy(); getState()
```

原则：`applySnapshot` 保证稳态正确；`drainEvents()` 事件只驱动瞬态；reset 通过重新 applySnapshot 初始快照自然达成。

## 六、QA 状态夹具（Agent D 必须覆盖）

`entry`、`power-fail`、`latch-closed`、`signal-mid`、`energized`、`complete`、`reset-replay`；验证五状态画面所需的全部信息都能从 snapshot + 事件推出，不依赖 Phaser 场景。

## 七、旧元素拆除清单（留给 Agent E / integration-owner）

1. `level.js` stage-1 `guideSequence` 与 `TimetablePuzzle.js` `punch()` 预拒（约 1069–1082）。
2. guideLabel（约 313–333）、objective “FIRST: BRAKE / THEN: POWER”（约 2990–3008, 3062–3064）。
3. 金色 ▼ 目标箭头（约 517–538）与 guidedNext 金色 tint（约 3280–3283）。
4. 悬挂触点三件套 contactReceiver/contactShoe/contactBridge（约 794–818）及 tween（约 2237–2238）、刹车压悬挂叙事（约 2195–2206，限 stage 1）。
5. stage-1 `timetable-run` 交互器（x=1450）与基于 `solution` 的队列判完（约 1448–1452）；rack 面板对 stage 1 隐藏。
6. 泄露顺序的故障文案（约 1070–1078）。

本地修改，不提交、不推送。
