# Phase II 插入段：继电器柜 `THE MISSING CONTACT`

状态：**READY — 交给 Kimi 多 Agent 本地实施**
日期：2026-08-01
边界：只在本地修改；不 commit、不 push；Phase III–VI 不动。

## 0. 总师裁决

Phase II 当前的门闩与右端接触器保留，但中段增加一个真正可操作的
point-and-click 继电器柜。它不是奖励小游戏，也不是突然盖住世界的网页弹窗。
它是车底电路的一部分，是门联锁信号在抵达牵引接触器前必须经过的真实断点。

锁定流程：

`RESET LATCH → 电流沿车底到达中段柜并停住 → 玩家打开柜门 → 接入线圈 → 衔铁改变接点 → 接输出线 → TEST → 电流继续到 CONTACTOR → CLOSE CONTACTOR`

这一插入段必须把 Phase II 从“一左一右各按一次 E”升级成三层体验：

1. **在车厢空间里追踪问题**。
2. **在近景里亲手理解继电器**。
3. **回到空间里看见自己的接线改变了整列车的状态**。

## 1. 外部设计研究与可用原则

### The Room

[Fireproof 官方介绍](https://www.fireproofgames.com/games/the-room)把核心放在可触摸的机关、
层层展开的机械结构以及通过操作本身发现答案。采用它的原则：

- 近景里的每个可操作物都必须有重量、行程、卡位和声音。
- 一次操作应暴露下一层关系，而不是一次性展示全部答案。
- 谜题界面就是物件，不另盖一层抽象 HUD。

### GNOG

[KO_OP 官方页面](https://www.gnoggame.com/)强调按、拉、滑、抓、转以及动态音乐反馈。
采用它的原则：每个错误操作也要有好看的局部反应；玩家是在玩一件机械玩具，
不是填写工程表格。

### The Pedestrian

[PlayStation 官方介绍](https://blog.playstation.com/2020/08/06/all-signs-point-to-the-pedestrian-in-january-2021/)
把连接关系直接放入环境，并让重排与连接改变真实通路。采用它的原则：近景接线必须
在退出界面后继续存在于世界空间，线路的前后段必须能被玩家追踪。

### Gorogoa

[Nintendo 官方页面](https://www.nintendo.com/us/store/products/gorogoa-switch/)说明它通过排列、
组合画面产生新的关系。采用它的原则：第一根线改变机械状态，机械状态再揭示第二根线
该接在哪里；答案来自画面关系变化，而非标签。

### 真实铁路联锁

[Indian Railways 操作手册](https://nwr.indianrailways.gov.in/uploads/files/1380695899973-operating%20manual.pdf)
说明 route relay interlocking 使用机电继电器实现路线之间的安全联锁；
[Network Rail](https://www.networkrail.co.uk/our-work/looking-after-the-railway/signalling/)
也把信号系统描述为许多共同工作的部件。采用的现实抽象：多个安全条件形成串联的
fail-safe chain，条件没有真正闭合时，牵引接触器只能弹回，不能被软件强行判成功。

## 2. 玩家体验锁定

### 2.1 世界空间阶段

- 玩家压下左侧门闩后，电流沿 y≈556 的车底钢制电缆槽向右传播。
- 电流在 x≈1195 的继电器柜入口停住，不再自动跑到 x=1440。
- 柜顶一只小钨丝检修灯闪两次；柜内传来三次不同音高的继电器 chatter。
- 柜门的机械锁舌跳开 4px，露出一条暖色光缝。
- 世界里只出现一个提示：`[E] OPEN RELAY CASE`。
- **禁止自动强行弹出近景。** 玩家自己走到柜前按 E，因果和空间才不会断裂。

### 2.2 近景 point-and-click 阶段

镜头在 320–380ms 内推近真实服务柜。玩家仍能在四周看到约 20–25% 的暗化车厢，
明确知道自己在观察同一个物件。角色移动暂停，但环境微动和声音不停。

柜中只有四个主要可读对象：

1. 左侧脉冲输入端，带门闩图标。
2. 中央透明玻璃继电器，能看见线圈、衔铁、常闭触点和常开触点。
3. 右侧输出端，带接触器图标。
4. 底部铸铁 TEST 柄和机械 RESET 键。

两根布包导线固定在一端，另一端可拖动：

- **AMBER / COIL lead**：从左侧输入端拖到线圈 A1。
- **CYAN / OUTPUT lead**：从右侧输出端拖到触点端。

关键认知：接上第一根线后，线圈通电，衔铁“啪”地落下，原先闭合的 NC 触点打开，
原先断开的 NO 触点闭合。这个动作亲自揭示第二根线应接到哪一个触点。

因此谜题不是：

- 按颜色配颜色；
- 记住一串密码；
- 在三根线里试遍排列；
- 阅读电气说明书。

它真正问的是：**哪一个接点在继电器动作之后仍形成安全通路？**

### 2.3 TEST 结果

- 正确：输入脉冲进入线圈 → 衔铁吸合 → NO 接点承载输出 → 两根导线轻微绷紧 →
  柜右端灯稳定 → 盖板内的机械旗显示一条连续线。
- 接到 NC：电流刚进入时短亮，线圈吸合后 NC 打开，输出立即掉电；衔铁弹一次，
  红色 witness lamp 只闪 180ms。玩家的导线不被清空。
- 未接完整：TEST 柄压不到底并机械弹回，断点所在端子轻敲两下。
- 接地错误：局部一粒火花、瓷保险片发暗；不震全屏、不扣血、不重置。
- RESET：只拔回两根导线并恢复继电器，不移动玩家，不重置门闩和前面关卡。

正确后停留 450ms 让玩家看完继电器吸合。随后柜门自动半合，镜头退回世界；
电流从柜右端继续沿车底跑到接触器。玩家再走到右端完成原有 CLOSE CONTACTOR。

## 3. 艺术设计锁定

### 3.1 不是网页弹窗

- 禁止黑色圆角矩形、常规 modal、工具栏、菜单卡片和漂浮按钮。
- 近景外框来自柜门本身：铰链、门框、密封垫、铆钉和编号牌形成画框。
- 世界只降低饱和和明度，不做纯黑遮罩；车窗、灰尘和列车晃动仍在边缘可见。
- 鼠标指针变成一只小型黄铜检修探针；只在可抓取导线或端子上产生 2px 反光边。

### 3.2 材质

- 柜体：与车厢一致的潮湿蓝灰搪瓷，边缘露出暗钢和少量锈。
- 端子：奶油色瓷座、黄铜螺帽、深色电木编号圈。
- 导线：布包橡胶线，AMBER 是旧红棕，CYAN 是褪色蓝绿，不用荧光塑料。
- 继电器：烟熏玻璃罩、可见铜线圈、钢衔铁和银色触点。
- 光：单个暖钨丝灯，亮度通过邻近金属反射表达；禁止 bloom 光团。
- 文字：只保留历史设备式小字 `A1 / A2`、`13 / 14`、`TEST`、`RESET` 和柜牌
  `DOOR TRACTION INTERLOCK No. 2`。不显示教程句子。

### 3.3 构图

- 960×600 画布中，柜体近景约占 720×430，中心略低，避免像暂停菜单。
- 视觉阅读顺序必须稳定为：左侧脉冲 → 中央衔铁 → 右侧输出 → 底部 TEST。
- 两根线的自然垂坠形成 S 曲线，但不能交叉遮住触点。
- 主动部件最高明度仍低于主角正常世界画面的主体明度；退出近景后主角重新成为焦点。
- 所有细节按 2px 模数绘制，避免亚像素线和现代矢量 UI 的光滑感。

### 3.4 动画与声音节拍

1. 信号撞柜：低频电流哼声 + 两次继电器 chatter，柜灯闪。
2. 打开：锁舌 60ms、柜门 240ms、镜头 360ms，先物件后镜头。
3. 插线：导线端子 90ms 磁吸入孔、螺帽轻转 8°、一声干脆瓷/铜点击。
4. 线圈动作：30ms 预振、75ms 吸合、120ms 回弹收束；玻璃反光跟随震一下。
5. TEST 正确：从左到右三段连续亮，不全柜同时亮。
6. 返回世界：柜先确认稳定，再退镜头，再让线路继续；禁止镜头到位前动画已播完。

## 4. 逻辑与数据契约

### 4.1 新纯逻辑模块

新增 `src/tutorial/phases/relayCabinet.js`，不得依赖 Phaser 或 DOM。

建议 API：

```js
createRelayCabinet(config?)
snapshot()
connect(lead, terminal)
disconnect(lead)
test()
reset()
drainEvents()
isSolved()
destroy()
```

锁定状态字段：

```js
{
  entered,
  coilLeadTerminal,       // null | 'coil-a1' | illegal terminal id
  outputLeadTerminal,     // null | 'no-14' | 'nc-12' | illegal terminal id
  coilEnergized,
  noContactClosed,
  ncContactClosed,
  testState,              // 'idle' | 'incomplete' | 'dropout' | 'ground-fault' | 'passed'
  solved,
  destroyed
}
```

事件最少包括：

`lead-connected`、`lead-disconnected`、`coil-picked`、`relay-dropped`、
`test-incomplete`、`test-dropout`、`test-ground-fault`、`relay-bridged`。

每个字段必须有明确写点、读点和测试。禁止声明后无人消费的字段。

### 4.2 扩展 Contact Interlock

现有 `contactInterlock.js` 的 latch 与 power 逻辑保留，但信号传播拆成两段：

- `preRelayProgress`：latch x=850 → relay x≈1195。
- `relayWaiting`：到柜后停住，直到 relay cabinet solved。
- `postRelayProgress`：relay x≈1195 → contactor x=1440。
- `circuitEnergized` 只在第二段到 1 后成立。

`POWER` 在 relay 未解时仍然只做右端接触器弹回；错误结果必须能区分
`open-circuit`、`relay-open` 与 `signal-in-transit`，但这些内部原因不以答案文字显示。

房间退出或玩家主动全局重置时，门闩、电流、柜内布线与接触器一起回到入口状态。
退出柜近景不能清除插线进度。

### 4.3 输入

- 世界：方向键移动，E 打开柜。
- 柜内：鼠标按下线头、拖动、松开到端子；端子吸附半径至少 22px。
- TEST / RESET 为可点击实体柄。
- ESC 或 E 关闭近景，保留当前接线。
- 打开柜时冻结角色移动和攻击；关闭后必须恢复，任何路径不能留下 frozen=true。
- 浏览器失焦或指针在拖动中离开 canvas：线头回到最近合法状态，不得悬空锁死。

## 5. Kimi 多 Agent 执行计划

主 Agent 只负责：任务分派、文件所有权、设计裁决、验收和最终汇报。
主 Agent **不得亲自大段实现 src/**。所有 agent 在同一工作区本地施工，不提交、不推送。

### Wave 0 — 现场地图，1 个只读 Agent

`relay-repository-mapper`

- 只读定位 `contactInterlock`、art、interaction picker、pointer input、camera、QA route、
  `render_game_to_text`、SFX 和 teardown 的真实接线点。
- 输出一张改动地图与共享文件冲突表。
- 不得提出新玩法，不得写 src。

主 Agent 验收后冻结准确文件清单，才进入 Wave 1。

### Wave 1 — 两个并行所有者

#### Agent A：`relay-logic-owner`

唯一写权限：

- `src/tutorial/phases/relayCabinet.js`（新）
- `tests/tutorial/relayCabinet.test.mjs`（新）

交付：纯状态机、所有错误分支、reset/replay/destroy、事件顺序、非法输入防御。
不得碰 Phaser、art、GameScene、TimetablePuzzle 或现有 contactInterlock。

#### Agent B：`relay-closeup-art-owner`

唯一写权限：

- `src/art/relayCabinetArt.js`（新）
- `tests/tutorial/relayCabinetArt.test.mjs`（新）

交付：柜内所有 GameObject 一次创建、幂等 snapshot、一次性事件动画、拖线命中区、
打开/关闭/销毁 API、低像素视觉、mock scene 测试。
不得碰逻辑模块和共享集成文件。

建议接口：

```js
constructor(scene, options)
open(); close(); setVisible(v)
applySnapshot(snapshot)
handleEvent(event)
pointerDown(x, y)
pointerMove(x, y)
pointerUp(x, y)
getHitRegions(); getState(); destroy()
```

### Wave 2 — 契约敌对审计，2 个并行只读 Agent

#### Agent C：`first-time-point-click-critic`

- 只读检查能否在不看任何文字说明的情况下发现第一根线、理解衔铁变化、接第二根线。
- 必须给出最可能退出游戏的准确秒点和画面原因。

#### Agent D：`railway-visual-critic`

- 只读检查它是否像真实旧式铁路继电器柜，而非现代配电盘或网页连线小游戏。
- 检查材质、安装方式、端子、继电器动作、编号与线路关系。

主 Agent 只允许修正锁定设计的可读性，不允许采纳会把它变成密码题或排序题的建议。

### Wave 3 — 唯一集成 Agent

`relay-integration-owner`

它是唯一可以修改共享文件的 Agent。允许范围由 Wave 0 最终地图确定，预期包括：

- `src/tutorial/phases/contactInterlock.js`
- `src/tutorial/TimetablePuzzle.js`
- `src/art/contactInterlockArt.js`
- `src/tutorial/qa/phase2Qa.js`
- `src/level.js`
- `src/scenes/GameScene.js`
- `src/main.js`
- 必要的 Phase II 测试文件

工作：

1. 把一段直通电流拆成 pre-relay / waiting / post-relay。
2. 新增 x≈1195 的世界柜、E 入口、镜头与输入生命周期。
3. 接入 Agent A/B，不复制其逻辑或画法。
4. 正确处理鼠标、ESC、浏览器失焦、teardown、场景 restart。
5. 扩展诊断和 QA route。
6. 保证 Phase I、III–VI 行为不变。

### Wave 4 — QA Owner

`relay-qa-owner`

唯一写权限：新增/扩展 Phase II 测试和 QA fixture，不修改生产逻辑。

必须覆盖：

- entry / signal-before-relay / relay-waiting / panel-open。
- coil-only / wrong-NC / incomplete / ground-fault / solved。
- signal-after-relay / energized / complete / reset-replay。
- 打开关闭柜 20 次没有重复 listener、tween 或 GameObject。
- 拖线过程中失焦恢复。
- 完成后 restart，第二次运行与第一次一致。
- 旧 QA 入口 `?qa=phase2&state=entry` 仍然是真正可玩的，不得再次冻结 E。

### Wave 5 — 两个并行验收 Agent

1. `blind-player-acceptance`：只拿控制说明“移动、E、鼠标”，完成一遍；记录卡点。
2. `art-direction-acceptance`：逐帧审查世界→近景→世界，判定是否有网页 UI、遮挡、
   镜头抢跑、材质不统一和电流读不清。

发现的问题必须退回原文件 owner 修复，再由同一个 reviewer 复验。主 Agent 不代写。

## 6. QA 路线与硬验收

### 自动

1. `node --check` 所有触及 JS。
2. 所有 Node tests 全绿。
3. `npm run assets:check`。
4. `npm run build`。
5. `git diff --check`。
6. grep 每个新状态字段，确认至少一个生产写点、一个生产读点、一个测试断言。

### 浏览器完整链

1. 从 `?qa=phase2&state=entry` 开始，确认 E 真能压门闩。
2. 观察电流只到中段柜，不越过。
3. 走到柜前，E 打开；确认角色冻结但环境仍活着。
4. 先接 OUTPUT 到 NC，再接 COIL，按 TEST：必须掉电但保留插线。
5. 改接 OUTPUT 到 NO，按 TEST：必须通过。
6. 镜头退回后，电流继续到右端，而非整条瞬间亮。
7. 走到接触器按 E，完成 Phase II 并开门。
8. 重载页面，用正确路径再做一次，结果完全一致。
9. 在柜内按 ESC、中途失焦、按 RESET、关闭再打开，均不软锁。
10. 以 screenshot + `render_game_to_text()` 对照每个状态。

### 艺术硬门槛

- 第一眼能指出：脉冲入口、可动继电器、输出、TEST。
- 第一根线插入后，衔铁变化至少有三种同步反馈：位移、声音、反光/接点变化。
- 第二根线的正确目标由机械变化揭示，不由金色箭头揭示。
- 退出近景后，柜的位置与车底线路完全对得上。
- 任何截图都不能像黑色网页 modal 或移动端接线小游戏。
- 错误有趣、局部、可恢复；没有全局 FAIL 和答案文字。
- 第一次完成目标 35–75 秒；熟练完成 8–15 秒。

## 7. 明确禁止

- 不把界面自动强行弹到玩家脸上。
- 不做随机密码，不做 Simon Says，不做颜色匹配，不做三线排列穷举。
- 不增加 timer、生命损失、尝试次数或长距离重跑。
- 不让错误自动清空全部插线。
- 不使用外部付费资产生成；本轮先用 Phaser primitives 做出可验证的最终构图。
- 不修改 Phase III–VI。
- 不 commit、不 push。

## 8. 主 Agent 最终汇报格式

必须报告：

1. 实际调用的 Agent、模型、角色、是否超时与重试。
2. 每个 Agent 的文件所有权及真实改动。
3. 被主 Agent 否决的建议及理由。
4. 所有自动检查结果。
5. 浏览器完整链结果与截图路径。
6. 仍未完成或无法肉眼验证的部分，不能用“代码推断”冒充视觉验收。

## 9. 给 Kimi 主 Agent 的启动指令

请完整读取本文件，然后立即执行 Wave 0，不要再次向用户询问是否开始。你是总师和
integration gatekeeper，不是主要写码者：严格按 Wave 0–5 调用多个 Kimi Agent，锁定
文件所有权，所有 src 实现交给对应 owner；你只做设计裁决、共享文件接线放行、亲自
复核运行结果和最终汇报。

不要重新发散玩法。`THE MISSING CONTACT` 的 Trace → Patch → Test 结构、近景实体柜、
两根线与 NO/NC 因果已经锁定。任何 Agent 提议颜色匹配、随机密码、Simon Says、自动
弹窗、计时或全局失败，都直接否决。

只在本地工作，不 commit、不 push。先检查当前 dirty worktree 并保护所有既有改动；
不得以“没有 Git 历史”或“工作区未提交”为理由停止。Kimi 调用若超时，按本文件把任务
拆小并仅重试一次；单个 reviewer 超时不应阻止其他 owner 继续完成可独立工作。最终必须
跑真实浏览器完整链，不能只报 build 和测试。
