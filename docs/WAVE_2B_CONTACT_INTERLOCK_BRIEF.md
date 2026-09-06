# Wave 2B — Phase II CONTACT Interlock 纯逻辑实现简报

状态：**READY / DESIGN LOCK 子任务**
角色：Kimi K2.7 Code，`phase-ii-logic-owner`
边界：本地修改；不提交、不推送；本任务不接线、不改可见场景。

## 允许修改

- 新建 `src/tutorial/phases/contactInterlock.js`
- 新建 `tests/tutorial/contactInterlock.test.mjs`

不得修改 `level.js`、`TimetablePuzzle.js`、`GameScene.js`、`main.js`、任何 art 文件或其他现有文件。

## 玩家因果（已锁定，不重新设计）

Phase II 不是“按 BRAKE 再按 POWER”的排序题，而是一条门—牵引安全联锁：

`未扣紧门闩 → 铜制触点线路断开 → POWER 接触器无法吸合`

玩家把门闩压回后，信号沿铜线传播到接触器；此后再合 POWER，牵引电路才闭合。

- POWER 提前操作必须在接触器本地弹回，允许立即重试。
- 不得产生 FIRST / THEN、正确答案、高亮下一个按钮或全局失败。
- 不得有隐藏计时失败；等待不会失败。
- reset 后必须和首次进入完全一致。

## 导出 API

```js
export const CONTACT_INTERLOCK_DEFAULTS
export function createContactInterlock(config = {})
```

`createContactInterlock()` 返回：

```js
{
  enter(context),
  update(deltaMs),
  interact(target),
  reset(),
  snapshot(),
  isComplete(),
  destroy(),
  drainEvents()
}
```

唯一合法 `target`：`'latch' | 'power'`。

## 最小状态

`snapshot()` 至少返回一个不可由外部直接修改内部状态的快照：

```js
{
  entered: boolean,
  destroyed: boolean,
  latchClosed: boolean,
  signalProgress: number,       // 0..1
  circuitEnergized: boolean,
  contactorClosed: boolean,
  powerDelivered: boolean,
  complete: boolean,
  lastFault: null | 'open-circuit' | 'signal-in-transit'
}
```

默认 `propagationMs` 建议 550ms；允许配置，但必须是有限正数，无效值回退默认值。

## 状态行为

1. `enter(context)` 初始化到未扣闩、断路、未完成；重复调用不得叠加状态。
2. `interact('power')` 在门闩未闭合时：不完成，`lastFault='open-circuit'`，返回局部拒绝结果并排入 `contactor-bounce` 事件。
3. `interact('latch')`：门闩闭合，清除旧 fault，从 0 开始传播信号；重复操作幂等。
4. 门闩闭合后、信号尚在传播时按 POWER：不完成，`lastFault='signal-in-transit'`，允许之后重试。
5. `update(deltaMs)` 只推进信号；负数、NaN、Infinity 不得破坏状态。进度到 1 时 `circuitEnergized=true`，只发一次 `trace-energized` 事件。
6. 通电后 `interact('power')`：接触器闭合、供电成功、完成；重复操作不得重复成功事件。
7. `reset()` 恢复首次进入的逻辑状态并清空事件；第二遍路线结果必须一致。
8. `destroy()` 后 update/interact 不得继续改变状态或制造事件；重复 destroy 安全。

`interact()` 返回结构化结果，例如 `{ accepted, reason, complete }`，不得靠抛异常表达普通玩家错误。未知 target 返回安全拒绝。

## 事件契约

`drainEvents()` 返回新数组并清空队列。事件至少覆盖三层反馈：

- 源头：`latch-reset`
- 传播：`trace-started`、`trace-energized`
- 本地失败：`contactor-bounce`
- 远端结果：`contactor-closed`、`traction-enabled`

每个事件至少含 `{ type }`；可附快照所需的轻量数据，但不得携带 Phaser 对象。

## 必须测试

- 初始状态与 enter 幂等。
- POWER 提前操作只局部失败、不全局失败、不完成。
- latch → 未传播完 POWER → 传播完 → POWER 成功。
- 信号进度单调、钳制在 0..1，非法 delta 安全。
- 每类事件恰当且 one-shot；`drainEvents()` 会清空。
- latch/power 重复交互幂等。
- reset 后第二次完整路线与第一次一致。
- destroy 后无状态泄漏。
- 未知 target 安全拒绝。
- snapshot 深拷贝/外部修改不污染内部状态。

## 验收命令

```bash
node --check src/tutorial/phases/contactInterlock.js
node --test tests/tutorial/contactInterlock.test.mjs
git diff --check -- src/tutorial/phases/contactInterlock.js tests/tutorial/contactInterlock.test.mjs
```

最终报告：修改文件、导出 API、测试数、未完成接线、风险。不得提交或推送。
