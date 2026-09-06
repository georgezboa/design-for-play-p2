# CAR 03 // THE CITY THAT MOVES TOGETHER — DESIGN LOCK

> Authored 2026-08-01 by Mavis (Car 03 owner) after Codex approved the
> `CAR 03 DESIGN LOCK CANDIDATE`. Supersedes the candidate document. Scope:
> the **isolated vertical slice** only. Car-to-car inventory, full HUD
> migration, and Godot work are explicitly out of scope for this slice.

## 1. 核心幻想

玩家单击 E 锚入一股通勤人群，借用它的步速、方向和队形穿过无人机
扫描；最后人群在警报中散开，玩家发现人数从来不是规则，与沉默
伙伴保持一致的两个人也能成为一个合法群体。

唯一核心关系：

```
协调运动 → 被系统识别为群体
```

## 2. 范围

本切片只做 Car 03 的隔离垂直切片：

- 不接入正式世界顺序；
- 不修改 `src/main.js` / `src/level.js` / `src/story.js` /
  `src/scenes/GameScene.js` / `src/scenes/HudScene.js` /
  `src/tutorial/TimetablePuzzle.js`；
- 不修改 Car 01 / Car 02 任何文件；
- 不清理 dirty worktree。

## 3. E 唯一语义

E 是 contextual single press，不使用长按。

未锚定时（玩家位于群体 footprint 内并面对同一方向）：

- 单击 E；
- 开始 350ms 的 cadence lock；
- 玩家必须在这 350ms 内留在 footprint；
- 成功后进入 `anchored`；
- 群体提供基础水平速度；
- 玩家仍可在群体内部前后微调位置（±55px）。

已锚定时按优先级处理：

1. 附近存在可救援伙伴：将伙伴加入当前群体；
2. 位于两个群体的交叠区：转移到新群体；
3. 最终段只有沉默伙伴：与伙伴建立 `duo`；
4. 以上均不存在：主动脱离当前群体。

不得自动加入或自动换组。E 在空旷区域、附近没有群体或伙伴时
不产生效果。

## 4. 群体 footprint

群体使用 footprint 而不是单一 anchor：

```
leftX <= player.x <= rightX
same lane
same facing
```

参数：

| 参数 | 值 |
|---|---|
| 加入半径 | 80px |
| 群体内调整范围 | ±55px |
| 脱离距离 | > 120px 或 lane 不一致 |
| cadence lock 时间 | 350ms |
| 慢群体速度 | 130 px/s |
| 快群体速度 | 180 px/s |
| 通关速度限制 | `MOVE.speedWalk = 200` |

不通过把主角染成人群颜色表达同步；通过脚步节奏、扫描括号、
无人机投影、人群让位、步态同步、声音频率、角色姿态表达。

## 5. 暴露

只在玩家处于无人机有效扫描区、且未锚定时累计。

| 参数 | 值 |
|---|---|
| warningMs | 900 |
| lockMs | 2200 |
| recoveryRate | 2.0 |
| 锁定停顿 | 约 450ms |
| 锁定回退 | 到本段 `safeAnchorX` |

- 900ms：扫描括号开始收紧，音频加快；
- 2200ms：锁定；
- 不扣血、不重置已完成段落；
- 不使用"回到 1.2 秒前"时间历史缓存。

Teach 段禁止强制玩家失败。先让一个普通孤立通勤者被扫描，环境
演示规则；玩家仍可第一次就正确通过。

## 6. 四段结构

总长约 4800px。坐标允许试玩后小幅调整。

### I / READ THE FLOW：0–1100

- 一个孤立通勤者先被无人机标记（环境演示）；
- 慢群体从玩家身边经过；
- 玩家走进 footprint，单击 E，完成第一次锚定；
- 通过一个宽容扫描区；
- 只教学群体锚定与扫描危险。

### II / CHOOSE THE FLOW：1100–2500

- Near：慢群体，130 px/s，稳定但绕行；
- Far：快群体，180 px/s，距离短但会改变 lane 或结束路线；
- 至少一次约 240px 的群体交叠区，让玩家单击 E 转组；
- 空旷暴露段最长约 260–320px（320 / 200 = 1.6s < 2.2s）；
- 走路玩家有约 0.6s 余量。

### III / THE SILENT PASSENGER：2500–3700

- 环境演示：一个普通人群会短暂减速，把掉队成员重新纳入队形；
- 沉默伙伴逐渐掉队（vx 差 ≥ 5）；
- 玩家先锚入一个群体；
- 靠近伙伴后单击 E，伙伴进入当前群体；
- 玩家带它穿过一段扫描区；
- 伙伴失败时只在本段最近慢群体处恢复，不永久消失。

### IV / TWO IS A CROWD：3700–4800

- 警报响起；
- 所有大群体从两条 lane 分散；
- 无人机仍然是检查异常模式的系统，不突然变成保护者；
- 沉默伙伴留在玩家身边；
- 玩家单击 E，与伙伴建立 `duo`；
- 系统识别条件：方向一致 + 速度差容忍 + 水平间距稳定；
- 完成后：伙伴第一次轻微回头，无人机括号闭合熄灭，窗外烟火；
- 无解释性台词。

## 7. 视觉裁决

- 主角保持 `HERO_BASE` 最高可读性；
- 普通人群使用 `ENAMEL_*` / `STEEL_MID` 中低明度；
- 沉默伙伴身体仍接近普通人群，`LAMP_OK` 仅用于帽沿或胸针等
  小面积识别点；
- 烟火可使用 `TUNGSTEN` / `TUNGSTEN_REFLECT` / `LAMP_ALERT` /
  `LAMP_OK`；
- 不修改共享调色板文件 `src/art/colors.js`；
- 禁止用黄色 / 红色圆形光晕充当抽象隐蔽度条。

## 8. 文件清单

只创建新文件：

```
car03.html
vite.car03.config.js
src/car03-main.js

src/cars/presentCity/
  socialStealthModel.js
  PresentCityScene.js
  presentCityArt.js

tests/car03/
  socialStealthModel.test.mjs
  presentCityQa.test.mjs

docs/CAR_03_DESIGN_LOCK.md
outputs/car03-acceptance/
```

只读 import：

- `src/constants.js`（`LANE_FAR` / `LANE_NEAR` / `MOVE` / `GAME_W` / `GAME_H` / `WORLD_W`）
- `src/art/colors.js`（`C` / `CAR` / `DEPTH`）
- `src/worlds/worldAssets.js`（`getWorldAsset` / `queueWorldAsset`）
- `src/sfx.js`（`sfx`）

不得 import：

- `src/main.js`
- `src/scenes/GameScene.js`
- `src/scenes/HudScene.js`
- `src/Player.js`（Car 03 玩家用最小 sprite，不复用 Prologue 玩家类）
- `src/tutorial/TimetablePuzzle.js`

## 9. 纯逻辑 API

```js
createSocialStealthModel(config) => {
  update(dtMs, input)
  pressInteract()
  snapshot()
  drainEvents()
  reset()
  destroy()
}
```

`snapshot()` 返回深拷贝、纯可序列化对象。所有时间推进只使用
传入的 `dtMs`，不依赖 `performance.now()`。

## 10. 独立诊断接口

`src/car03-main.js` 提供：

```js
window.render_game_to_text()
```

至少暴露：`state` / `section` / `player.x` / `player.lane` /
`player.anchoredGroupId` / `player.exposureMs` / `player.locked` /
`player.safeAnchorX` / `crowds[].id` / `crowds[].lane` /
`crowds[].leftX` / `crowds[].rightX` / `crowds[].vx` /
`drones[].scanActive` / `drones[].lockTarget` / `companion.state` /
`companion.groupId` / `duo.active` / `duo.alignment` / `complete` /
`qaState`。

## 11. QA 路由

至少：`entry` / `rule-demo` / `isolated-warning` / `locked-recovery` /
`joined-slow` / `joined-fast` / `group-transfer` / `lane-risk` /
`companion-stranded` / `companion-rescued` / `crowd-dispersal` /
`duo-sync` / `complete` / `reset-replay`。

`entry` 必须可继续操作；截图 fixture 可冻结；QA warp 后不得残留
tween / timer / lock target / exposure；十次 reset/replay 状态一致。

## 12. 验证基线

```
node --test tests/car03/*.test.mjs     # 新增
node --test tests/tutorial/*.test.mjs  # 必须保持 315 passed / 0 failed
npm run assets:check
npm run build
npx vite build --config vite.car03.config.js --outDir /tmp/infinity-train-car03-build
git diff --check
```

## 13. 与候选报告的偏差

| 候选 | 锁定 | 原因 |
|---|---|---|
| 长按 E | 单击 + 350ms cadence lock | 总师裁决 §二 |
| 自动融入 | 必须显式 E | 总师裁决 §二 |
| "另一威胁"实体 | 无 | 总师裁决 §一 |
| 新增儿童 | 复用沉默伙伴 | 总师裁决 §四段 IV |
| 数字隐蔽度 HUD | 无 | 总师裁决 §五 |
| 4 个模块拆分 | 1 个 model | 总师裁决 §一 |

## 14. 后续集成时需要修改的共享文件（本轮不动）

- `src/main.js` — 新增正式 Car 03 入口
- `src/scenes/GameScene.js` — 接 car-to-car 切换
- `src/scenes/HudScene.js` — Car 03 HUD 字段
- `src/level.js` / `src/story.js` — 世界顺序与旧原型的去留
- `package.json` — `npm run car03:dev` 脚本（如果需要）
