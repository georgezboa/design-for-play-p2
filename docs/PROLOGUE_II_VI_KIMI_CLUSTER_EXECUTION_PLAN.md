# 序章 Phase II–VI：高端设计方向与 Kimi 集群执行计划

状态：**DESIGN LOCK — 用户于 2026-08-01 明确确认五段方向与执行规则**
日期：2026-08-01
工作边界：本地修改，不提交、不推送；Claude/Codex 作为总师，只负责产品设计、分派和验收；Kimi 负责调查、实现、视觉、测试与修复。

## 一句话产品方向

序章不是六个“按 E 开门”的房间，而是一列沉睡列车逐步恢复意识的过程：

> 玩家先看懂一个部件，随后看懂一条系统，接着用整节车厢的空间解决问题，最后让自己留下的过去成为列车的一部分。

统一的不是气压，也不是 BRAKE / VENT / POWER 的按钮表。统一的是一套无文字也能读懂的因果语言：

`操作源头 → 传动过程清晰可追踪 → 远端机构产生结果 → 故障发生在真实断点`

## 高端设计脊柱

五段分别要求五种不同的思考：

`看见联锁 → 理解气路 → 利用重量与空间 → 诊断机械链 → 与真实过去协作`

| Phase | 玩家真正的问题 | 主要认知活动 | 只新增的变量 |
|---|---|---|---|
| II / CONTACT | 哪个安全条件阻止了电路闭合？ | 离散联锁 | 接通 / 断开 |
| III / AIR LOCK | 供气从哪里来，怎样让门缸真正泄压？ | 气路拓扑 | 局部压力 |
| IV / WEIGHT TRANSFER | 质量放在哪里才能让车体/出口重新对齐？ | 空间与连续重量 | trolley 位置 |
| V / READ THE BOGIE | 传动力在哪一段中断？ | 对比与诊断 | 故障位置 |
| VI / PAST HOLDS | 过去留下的持续动作怎样和现在重合？ | 时间协作 | 录制/回放时间 |

每段只增加一个新变量。难度来自关系更深，而不是 UI 更多、按钮更乱或时间窗更窄。

---

# Part A：推荐的最终关卡方向

## Phase II / CONTACT

> **2026-08-01 设计插入：** Phase II 在门闩和接触器之间增加 point-and-click
> 继电器柜 `THE MISSING CONTACT`。详细设计、文件所有权、多 Agent 波次与验收见
> [PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md](PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md)。
> 该工作包只扩展 Phase II，不改变本文件的 III–VI Design Lock。

### 核心幻想

玩家第一次不是“输入正确答案”，而是让一条死掉的安全电路重新闭合。

### 空间与机械

- 左侧：没有完全扣紧的车厢门闩，挂在真实门框上。
- 中段：沿墙延伸的铜制 interlock 触点线，途中有一个清楚的断点。
- 右侧：透明外壳的牵引继电器 / POWER 接触器。
- 玩家压紧门闩后，触点沿墙逐段亮起，右端继电器“啪”地吸合；此时 POWER 才真正有电路可走。

### 为什么比 BRAKE → POWER 好

真实铁路常见“门关闭并锁定后，牵引联锁才允许供电”的安全逻辑。玩家能看见断点、修复断点和远端结果。不会再出现“静止刹车神秘压低悬挂，所以电接点闭合”的任意因果。

### 教学曲线

1. **Introduce**：玩家误按 POWER，继电器现场弹回；铜线断点闪一下。
2. **Develop**：玩家顺着线走向左侧门闩。
3. **Resolve**：压紧门闩，铜线逐段通电，再合 POWER。

### 文字上限

- `[E] RESET LATCH`
- `[E] CLOSE CONTACTOR`

不得显示 FIRST / THEN，不得在错误提示里说正确顺序。

### 判废旧内容

- 删除 II 的 `guideSequence: ['brake', 'power']`。
- 删除 BRAKE 压悬挂闭合电接点的叙事。
- 删除指向下一个正确按钮的金色目标箭头。

## Phase III / AIR LOCK

### 核心幻想

玩家读懂一条局部气动门回路：供气罐持续补气，只有先隔离供气，再泄放门缸，门爪才会真正缩回。

### 空间与机械

全部因果尽量在一个镜头或一次短摇镜内出现：

`供气罐 → ISOLATE 旋塞 → 压力表 → BLEED 阀 → 门缸活塞 → 门爪`

- ISOLATE 关掉后，供气管的脉冲停止。
- 长按 BLEED，表针连续下降、软管颤动、门缸活塞连续缩回。
- 门爪在压力低于 `openThreshold` 时机械退开；只有压力回升到 `openThreshold + hysteresis` 才重新咬合。玩家不必等待表针绝对归零，也不再需要跑 220px 抢隐藏窗口。
- 如果未隔离供气，BLEED 与补气同时发生：玩家能看见两股流动抵消，表针降不下去。

### 教学曲线

1. **Introduce**：先让玩家安全试 BLEED，看见供气立即补回来。
2. **Develop**：空间中的气流脉冲把视线引向 ISOLATE。
3. **Resolve**：关隔离阀，再泄压，门缸和门爪同步动作。

### 现实抽象

本段明确叫“局部门执行气路”，不再含糊地把制动管、储气缸、闸瓦和门锁混成一个系统。允许缩短响应时间和夸大活塞行程，但不能颠倒气路因果。

### 判废旧内容

- 删除 BRAKE 作为“减慢回压”的万能修正。
- 删除低压后跑去远端门闩的计时题。
- 删除 no-brake / repressurized 的文字答案；故障由供气脉冲、表针和门爪表达。

## Phase IV / WEIGHT TRANSFER

### 核心幻想

整节车厢本身就是谜题。出口因车体倾斜而错位，玩家移动一台沉重的服务 trolley，让左右悬挂重新平衡并把门框压回对齐。

### 空间与机械

- 长车厢两端都能看见悬挂弹簧或空气弹簧的压缩差。
- 出口门框明显上下错位，不依赖文字说明“门坏了”。
- 重型 trolley 沿上方或中层轨道移动；不同停靠槽产生不同车体倾角。
- 玩家先释放 trolley，再用制动/止轮器把它停在某个位置。
- trolley 移动时：一侧弹簧压缩，另一侧伸长，吊灯倾斜，窗外地平线相对旋转，门框逐渐对齐。

### 关卡结构

1. **Introduce**：第一次松闩，trolley 只移动短距离，车体立即产生夸张但安全的 3–6° 倾斜。
2. **Develop**：玩家在两个停靠点间选择；过量会让门框错向另一侧。
3. **Twist**：玩家必须从下层观察两端弹簧或通过 plumb line 判断，而不是盯 UI 表格。
4. **Resolve**：门框对齐、门闩自然落位，车厢晃动收束。

列车在玩家不知情的情况下，把 trolley 的有效位移样本记录到机械卷轴中。只记录位置变化、越过中心和最终稳定状态，不记录玩家的犹豫脚步。这是 VI 的真实输入，而不是之后补演的一段固定动画。

### 判废旧内容

- 完整删除 `manualWindowMs: 3500`。
- 删除 BRAKE 后向右冲刺释放 trolley 的玩法。
- 闸瓦热色和烟雾可以保留为列车状态资产，但不再充当隐藏倒计时。

## Phase V / READ THE BOGIE

### 核心幻想

玩家像检修员一样观察正常与故障转向架，找到“力传到哪里停止了”，而不是再把表针调进魔法区间。

### 空间与机械

- 左右两组 bogie 并排：一组是健康参考，一组有一个明确故障。
- 上层只有一个 TEST 手柄。操作后镜头自然下移，两个转向架同时执行相同周期。
- 健康侧运动链：执行器 → 横杆 → slack adjuster → 闸瓦 / 轮组。
- 故障侧在某一段停止，例如 clevis pin 脱出、连杆翻转或 adjuster 卡住。
- 玩家必须看见差异，再进入检修位，把插销重新插入或把连杆复位。
- 再次 TEST：两侧动作同步，声音相位一致，轮组/闸瓦状态证明修复。

### 关卡结构

1. **Introduce**：TEST 第一次运行，健康侧用清楚的节奏展示标准答案。
2. **Develop**：故障侧在中途停止；断点有局部摆动/异响，但不发金光。
3. **Twist**：错误维修不会全局失败，只会让力传到另一个可见的错误姿态。
4. **Resolve**：两侧同步，车厢内部振动和灯光恢复。

### 判废旧内容

- 删除 30–62 的“气压工作带”。
- 删除 BRAKE → VENT → POWER 的固定链。
- 删除 objectiveText 给出“高就泄、低就充、现在按 POWER”的答案。
- 不新增抽象电路板；车底必须是可辨认的真实列车机构。

## Phase VI / PAST HOLDS THE VALVE

### 核心幻想

玩家第一次发现列车在 Phase IV 就已经记录了自己。过去的动作不是 NPC 动画，而是玩家真实制造过的 trolley 轨迹；玩家不能命令过去，只能理解并配合自己留下的节奏。

### 空间与机械

- 上层：玩家当前路径、因车体倾斜而改变高度的扶手/桥板、最终门闩或出口。
- 下层：过去回声重演 Phase IV 的 trolley 运动；它不能被现在的玩家直接控制。
- 中央：一条可见的黄铜记录带，只显示 Phase IV 轨迹的播放头，不显示解法。

### 可施工的回放结构

**第一轮：纯观察**

1. 回声推着 trolley 重演玩家在 Phase IV 的真实有效轨迹。
2. trolley 的历史位置再次改变车体倾角；左极值、过中心、右极值和最终稳定四个关键姿态都清楚出现。
3. 第一轮没有惩罚，让玩家认出“这是我刚才做过的事”。

**后续循环：现在与过去合作**

1. 回声按原轨迹循环，不在障碍前等待脚本命令。
2. trolley 向一侧移动时，车体倾斜使上层扶手降低；过中心时桥板对齐；最终稳定位置持续压住服务踏板或维持 III 已教过的隔离阀。
3. 现在的玩家利用这些连续空间状态走完上层路线。
4. 现在玩家在适当位置改变一个当前机构，为下层回声清出最后一段路径，形成“现在也帮助过去”。
5. 回声抵达最终稳定状态并保持，现时玩家完成门闩/出口操作。

### 高级之处

- 过去帮助现在，同时现在也帮助过去完成其路线，是双向合作。
- VI 直接读取 Phase IV 的真实轨迹，并复用 III 的隔离/门闩关系；只新增“此前动作会重演”一条规则。
- 回声仍是自动、编排式伙伴；主角是唯一直接控制的人。
- 错过时等待下一轮即可，不死亡、不重置；必要时可以在 VI 内选择重新录制一段短轨迹，但不能强迫玩家重跑序章。

### 防软锁规则

- 只记录 trolley 的有效位移样本，不记录停顿和反复试错的玩家脚步。
- 任意合法 Phase IV 解都必须经过左/右极值、中心和最终稳定四类关键状态。
- 回放到最终稳定状态后必须保持足够久。
- 上层障碍只依赖这些关键状态，不依赖某一条唯一 Phase IV 解。
- 如果玩家通过 QA 跳关、旧存档或跨 session 进入 VI，导致没有有效的 IV 轨迹，系统必须加载一段通过同一数据契约的 canonical 轨迹。玩家可以选择在 VI 内重录，但绝不能被强迫重跑 IV。

### 判废旧内容

- 删除 wheel / pipe / coupler 三道固定 `gate.command`。
- 删除回声无限等待。
- 删除 VI 开场重新录一段与前文无关的固定教程；优先读取 Phase IV 的真实数据。
- 删除踩泄压软管、钻运行轮辐、把车钩当踏板等危险且不可信的画面。
- 删除 blockedHint / clearedHint 报答案文本。

## 序章收束

VI 完成后，不再出现新的解谜按钮。列车用前五段恢复的系统做一次完整的“呼吸”：

1. 门联锁灯依次亮起。
2. 气动门缸和管路稳定。
3. 悬挂在 trolley 的正确载荷下压稳。
4. 两组 bogie 同步释放。
5. 回声在窗中淡去。
6. 车钩 / 电气 /气路状态统一，列车开始运行，窗外景物后移。

这是机械、叙事和章节动画的共同 payoff。

---

# Part B：Claude 总师与 Kimi 集群的职责

## Claude / Codex 总师只做

1. 锁定产品设计与禁止项。
2. 分配文件所有权。
3. 给每个 Kimi 一个有界输入和单一交付物。
4. 阅读 diff、运行检查、亲自浏览器试玩。
5. 通过、退回、拆小或换代理。
6. 维护 `DESIGN_LOCK`、`NEXT_TASK` 和验收记录。

## Kimi 集群负责

- 仓库映射
- 机械与空间规格
- 状态机和 Phaser 实现
- 视觉反馈与音效
- 自动测试与 QA 路由
- 敌对试玩和盲评

## 总师禁止

- 没有 DESIGN LOCK 就让代理改 `src/`。
- Kimi 第一次超时后自己临时写一版。
- 两名代理同时修改 `TimetablePuzzle.js`、`level.js` 或 `GameScene.js`。
- 为了保留旧代码，同时保留两套可运行玩法。
- 用更多文字掩盖空间和机械不清楚。
- 提交、推送或生成付费资产，除非用户另行授权。

---

# Part C：10 个执行 Wave（Wave 0–9）

## Wave 0 — 保护现场与仓库地图

**代理**：Kimi K2.7 Code，角色 `repository-mapper`，只读。
**输入**：上一轮研究审计、本文件、`level.js`、`TimetablePuzzle.js`、`airLock.js`、两个 train art 文件、QA 路由和当前工作区状态。
**输出**：

- II–VI 调用图。
- 每段的状态、输入、更新、绘制、完成和 reset 入口。
- 所有只写不读、只读不写的字段。
- 旧 drum、旧 pressure、旧 manual window、旧 echo gate 的真实残留。
- 热点文件和文件所有权表。

**验收**：不改文件；每个重要字段必须给出读点和写点；指出失效 QA。

## Wave 1 — 四路设计审查，形成 DESIGN LOCK

可以并行，但全部只读：

| 代理 | 模型 | 单一交付物 |
|---|---|---|
| `spatial-director` | Kimi K3 | II–VI 文字平面图、视线、玩家路线、镜头时刻 |
| `rail-systems-reviewer` | Kimi K3 | 每段因果链、可艺术化范围、现实红线 |
| `first-time-player-critic` | Kimi K2.6 | 无文档首次试玩的困惑、误导与退出点 |
| `production-estimator` | Kimi K2.6 | 资产复用、工程风险、每段最小可玩切片 |

**总师输出**：唯一的 `DESIGN_LOCK`，包含每段核心幻想、玩家问题、新变量、旧知识、空间草图、成功/失败/reset、禁止旧方案、Phase 间接口。

没有 Design Lock，不得进入 Wave 2。

## Wave 2 — 架构隔离与纯逻辑接口

**代理**：Kimi K2.7 Code，角色 `integration-owner`。
**原则**：只有它能碰 `TimetablePuzzle.js`、`level.js`、`GameScene.js`。

建议建立独立逻辑模块：

- `src/tutorial/phases/contactInterlock.js`
- `src/tutorial/phases/localPneumaticDoor.js`
- `src/tutorial/phases/weightTransfer.js`
- `src/tutorial/phases/bogieDiagnosis.js`
- `src/tutorial/phases/recordedEcho.js`

统一接口：

- `enter(context)`
- `update(delta)`
- `interact(target)`
- `reset()`
- `snapshot()`
- `isComplete()`
- `destroy()`

### Wave 2 必须冻结的 IV → VI 轨迹契约

轨迹契约不得拖到 Wave 6 再决定。Wave 2 需锁定并测试：

```js
{
  version: 1,
  durationMs: number,
  samples: Array<{
    tMs: number,
    normalizedX: number, // 0..1，独立于最终房间像素宽度
    marker: null | 'left-extreme' | 'center-cross' | 'right-extreme' | 'settled'
  }>,
  settledX: number,
  source: 'player' | 'canonical'
}
```

硬规则：

- 时间戳单调递增，位置已归一化。
- 四类关键状态必须齐全；重复 marker 需规范化。
- IV 只负责生产并验证轨迹；VI 只读消费，不重新解释像素坐标。
- 提供 `validateTrace()`、`normalizeTrace()` 和 canonical fallback。
- QA 跳关、旧存档、空数组、损坏版本都必须安全回退到 canonical 轨迹。

**输出**：模块骨架、纯逻辑测试、事件接口、状态生命周期表；这一波不改变玩家可见玩法。

**验收**：Phase I 不变；build 通过；reset 不累积 listener/tween；新字段都有读写测试；不得复制五套输入系统。

## Wave 3 — Phase II 视觉语言试点

先做 II，因为它定义后面所有因果反馈语言。

**代理 A**：Kimi K2.7 Code，`phase-ii-logic-owner`，只改 `contactInterlock.js` 和测试。
**代理 B**：Kimi K2.7 Code，`phase-ii-art-owner`，只改指定的 II art module。
**共享接线**：最后由 `integration-owner` 串行完成。

**验收门**：

- 删除文字后，玩家仍能从断开的铜线知道先检查门闩。
- POWER 误操作在接触器本地失败，不弹正确答案。
- 操作同时有源头、传播和远端三层反馈。
- reset 后第二次仍可完成。
- 10 秒无文档观察者能说出“门闩控制电路”。

II 未通过盲评，不开始 III–VI 美术。

## Wave 4 — Phase III 气路试点

**代理 A**：Kimi K2.7 Code，`phase-iii-logic-owner`，只改 `localPneumaticDoor.js` 和测试。
**代理 B**：Kimi K2.7 Code，`phase-iii-art-owner`，只改 III 的管线、门缸、门爪资产。
**共享接线**：`integration-owner`。

**验收门**：

- 未隔离时补气和泄气的对抗可见。
- 隔离后表针、门缸和门爪同步。
- 无 220px 隐藏冲刺。
- 提示只教 `[HOLD E]`，不教顺序。
- II 与 III 的核心问题明显不同。
- Wave 4 结束立即安排一次只看 II/III 录屏的跨段盲评：观察者必须分别说出“门闩联锁”和“切断补气再泄压”，不能把两段描述成“按两个按钮开门”。未通过时在进入 IV/V 前返工。

## Wave 5 — Phase IV 与 V 并行生产

两段只在独立模块和独立 art 文件上并行；共享文件仍由 integration owner 串行接线。

### IV 工作包

- `phase-iv-logic-owner`：trolley 位置、车体倾角、悬挂和门框状态。
- `phase-iv-art-owner`：trolley 轨道、左右弹簧、门框错位、plumb line、环境倾斜反馈。
- 硬验收：源码中无 IV 的 `manualWindowMs`；等待不会失败；至少两个可理解的载荷结果；不重复 III 的窗口题。
- 数据验收：输出规范化的 trolley 轨迹样本和四类关键状态，供 VI 只读消费；不同合法解都必须能生成可用回放。

### V 工作包

- `phase-v-logic-owner`：健康/故障力链、诊断选择、局部修复、复测。
- `phase-v-art-owner`：两组 bogie、连杆、插销、故障姿态、同步成功动画。
- 硬验收：无中间气压带；无 BRAKE/VENT/POWER 排序；不看车底就不能稳定蒙对；错误维修可局部恢复。

## Wave 6 — Phase VI 先规格、后实现

**先由 Kimi K3 `temporal-design-owner` 只读输出**：

- 录制范围和最大时长。
- Phase IV 轨迹规范化、采样和持久化格式。
- 注意：Wave 6 只能复核并消费 Wave 2 已冻结的契约，不得重定义格式。
- 回放的起止条件。
- 回声实际记录的数据结构。
- 现在玩家的互补动作。
- 太短、走错、停错时怎样局部重录。
- 如何保证主角唯一可控、回声不可直接控制。

总师通过后：

- Kimi K2.7 Code `phase-vi-logic-owner` 实现 `recordedEcho.js` 和测试。
- Kimi K2.7 Code `phase-vi-art-owner` 实现记录带、回声路径、上下层互相反馈。
- `integration-owner` 最后接线。

**硬验收**：

- 删除回声后逻辑上不可通关。
- 回声读取 Phase IV 的真实有效轨迹，不在固定 gate 无限等待。
- 无有效 IV 轨迹时使用 canonical fallback，QA 跳关和旧存档不得软锁。
- 只新增时间回放这一条规则。
- VI 复用至少两项旧知识，但不重新教学。
- 失败只重录本段短循环。

## Wave 7 — 信息、音效与完成动画

可以分成两个独立代理：

- `visual-hierarchy-owner`：挂载面、主角优先级、遮挡、管线、交互对象形状与运动。
- `feedback-audio-owner`：源头声、传播声、远端结果声、失败点声；不新增音乐系统重构。

每次关键操作强制三层反馈：

1. 手柄/阀/闩的局部反馈。
2. 铜线/气流/连杆/重量移动的传播反馈。
3. 门、车体、轮组、窗外速度的远端反馈。

缺一层即退回。

## Wave 8 — 串行集成与旧逻辑清除

只有 `integration-owner` 能执行：

1. 每次只接入一个 Phase。
2. 每接一段立即语法、测试、build。
3. 删除本段废弃旧分支，不并存两套玩法。
4. 记录修改文件、新字段读写点、未视觉验证内容和已知风险。
5. 不覆盖其他代理未提交改动。

## Wave 9 — 自动 QA、盲评与总师验收

### 自动 QA 代理

Kimi K2.7 Code 为每段建立：

- entry
- correct
- 至少两条 wrong path
- reset
- repeat playthrough
- II→VI 连续通关

检查：语法、`node --test`、build、assets、控制台 error、监听器/补间泄漏、门前预渲染、完成运镜、reset 污染、1920×1080 与 1280×720。

### 盲评代理

Kimi K2.6 `blind-play-critic` 只看截图/录屏，不读代码和设计稿，回答：

- 这段要我做什么？
- 哪个画面让我这么认为？
- 失败后我知道错在哪里吗？
- III、IV、V 像不像同一道题？
- VI 的过去是否像真正伙伴？

### 总师最终验收

总师必须亲自：

1. 不用 QA 跳关，从 II 连续走到 VI。
2. 每段第一次故意犯错。
3. 每段 reset 后重新完成。
4. 保存入口、第一次线索、失败、成功、门动画五类截图。
5. 检查镜头、窗外主体、遮挡、文字占屏和完成动画。
6. 确认每段十秒内能从画面辨认出不同核心问题。

---

# Part D：文件所有权与冲突规则

| 文件/范围 | 唯一所有者 |
|---|---|
| `src/tutorial/TimetablePuzzle.js` | `integration-owner` |
| `src/level.js` | `integration-owner` |
| `src/scenes/GameScene.js` | `integration-owner` |
| 每个 `src/tutorial/phases/*.js` | 对应 Phase logic owner |
| Phase 专属 art module | 对应 Phase art owner |
| 共用 palette / depth | `visual-hierarchy-owner` |
| tests / QA helper | `qa-owner` |

两个代理不得同时改同一文件。代理需要共享文件修改时，只提交“接线请求”，由 integration owner 实现。

每个代理交付必须报告：

- 修改文件。
- 明确未修改的受保护文件。
- 新字段的读点、写点、测试点。
- 执行过的检查。
- 未进行的视觉验证。
- 已知风险与下一位代理需要的接口。

---

# Part E：Kimi 超时与“不许停工”规则

Kimi 曾经出现 300 秒超时。超时不等于整轮停止：

1. 编码优先使用单独 `delegate`，每次限制 1–3 个文件、一个可验证输出。
2. 第一次超时：先检查工作区是否已有部分 diff；保留通过检查的部分。
3. 将剩余任务拆成“调查/状态机/视觉/测试”更小工作包，每包目标控制在约 150 行核心改动以内。
4. 第二次超时：换另一名 Kimi K2.7 Code，并附上前一次的接口和已完成证据。
5. K3 只做高价值设计推理，不让 K3 承担大范围编码。
6. 同一工作包两次失败后，不让总师随意补代码；重新缩小边界并换代理。
7. 只有出现不可逆产品冲突、数据丢失风险或连续三次同一最小任务失败，整 Wave 才能标记 blocked。
8. 不得用 reset、checkout 或覆盖方式清理代理的半成品；先审计 diff。

---

# Part F：可直接交给 Claude Code 的总提示

```text
你现在只担任本项目的“总师 / 产品设计负责人”，不是默认独立执行员。

任务：按照 docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md 重构序章 Phase II–VI。

强制规则：
1. 先完整读取：
   - docs/PROLOGUE_PHASE_II_VI_RESEARCH_AUDIT.md
   - docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md
   - docs/PROLOGUE_INNOVATION_DIRECTIONS.md
   - docs/GAME_DESIGN_MASTER.md
   - 当前 src/ 与 git status
2. 先执行 Wave 0 和 Wave 1；在你产出唯一 DESIGN LOCK 前，禁止修改 src/。
3. 调用 Kimi 时：高端设计用 K3，代码实现用 K2.7 Code，首次玩家批判和盲评用 K2.6。
4. 你只负责设计锁、文件所有权、分派、diff 审查、测试和最终浏览器验收。实现交给 Kimi。
5. 不允许两名代理同时修改 TimetablePuzzle.js、level.js 或 GameScene.js；这些文件只有 integration-owner 可以修改。
6. Phase II–VI 不再统一为气压题。锁定方向是：门—牵引联锁、局部气动门、移动质量、bogie 诊断、真实录制回声。
7. 删除旧方案时必须删除运行分支，不保留两套玩法。
8. 文字只能解释按键或消除歧义，不能给顺序和答案。
9. 每次关键操作必须有源头、传播、远端三层反馈。
10. 本轮只做本地修改，不 commit、不 push、不创建 PR、不调用付费资产生成。

超时规则：第一次超时先检查 partial diff，再把剩余任务拆小；第二次换 Kimi；不得因为一次 300 秒超时停止整个项目，也不得由你随手补一版。

现在只开始 Wave 0：调用一名 Kimi K2.7 Code repository-mapper，保持只读，输出调用图、字段读写、旧逻辑残留、QA 失效点和文件所有权建议。完成后由你审查，再进入 Wave 1。不要提前改代码。
```

---

# Part G：预计节奏

| 工作 | 预计时间 |
|---|---:|
| Wave 0–1：仓库地图 + Design Lock | 0.5–1 天 |
| Wave 2：架构隔离 | 0.5–1 天 |
| Wave 3–4：II / III 两个试点 | 1–2 天 |
| Wave 5：IV / V | 1.5–2 天 |
| Wave 6：VI | 1–1.5 天 |
| Wave 7–9：反馈、集成、盲测 | 1–2 天 |

完整重构合理范围为 **6–9 个工作日**。第一可玩验收点是 Wave 3 的 Phase II，不等待所有段落一起完成。
