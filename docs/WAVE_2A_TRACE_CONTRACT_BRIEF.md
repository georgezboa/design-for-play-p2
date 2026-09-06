# Wave 2A — IV→VI Trace Contract 实现简报

状态：**READY**
执行者：Kimi K2.7 Code，角色 `trace-contract-owner`
范围：只实现纯逻辑数据契约，不接入 Phaser，不改变任何可见玩法。

## 允许修改

仅允许创建或修改：

1. `src/tutorial/phases/traceContract.js`
2. `tests/tutorial/traceContract.test.mjs`

不得修改 `level.js`、`TimetablePuzzle.js`、`GameScene.js`、`main.js`、任何 art 文件、`package.json` 或其他现有文件。不得 commit、push、开 PR。

## 冻结契约

```js
{
  version: 1,
  durationMs: number,
  samples: Array<{
    tMs: number,
    normalizedX: number,
    marker: null | 'left-extreme' | 'center-cross' | 'right-extreme' | 'settled'
  }>,
  settledX: number,
  source: 'player' | 'canonical'
}
```

## 必须导出的 API

- `TRACE_VERSION`
- `TRACE_MARKERS`
- `createCanonicalTrace()`
- `validateTrace(trace)`
- `normalizeTrace(rawTrace)`
- `summarizeTrace(trace)`

## 行为要求

### `validateTrace`

返回结构化结果，例如 `{ valid, errors }`，不得只返回布尔值。

有效轨迹要求：

- `version === 1`
- `durationMs` 有限且大于 0
- 至少两个 sample
- `tMs` 有限、从 0 或正数开始、严格单调递增、不得超过 `durationMs`
- `normalizedX` 有限并在 `0..1`
- marker 只能来自冻结枚举或 `null`
- 四类关键 marker 均至少存在一次
- `settledX` 有限并在 `0..1`
- `source` 只能是 `player` 或 `canonical`

### `normalizeTrace`

接受不可信输入，不得抛异常。规则：

- 无效、空、版本不支持或无法修复时，返回新的 canonical trace。
- 复制输入，不原地修改。
- 丢弃非对象 sample、非有限数字和越界时间。
- `normalizedX` 可 clamp 到 `0..1`。
- 按 `tMs` 排序并去除重复时间戳。
- 每类 marker 最多保留一个，保留按时间排序后的第一次。
- 若清洗后缺少任意关键 marker，返回 canonical trace，不伪造玩家轨迹。
- 玩家轨迹成功规范化时 `source` 必须是 `player`。
- 返回值必须通过 `validateTrace`。

### `createCanonicalTrace`

- 每次返回新的深拷贝，调用者之间不能共享可变数组/对象。
- 包含左极值、过中心、右极值、最终稳定四种 marker。
- 时长适合 VI 第一次纯观察与后续回放，建议 5–8 秒。
- 轨迹首尾连续、可读、无零时长跳变。

### `summarizeTrace`

只输出 QA / `render_game_to_text` 需要的短摘要：版本、来源、时长、sample 数量、marker 顺序、settledX、valid。不得返回完整历史数组。

## 测试要求

使用 Node 内置 `node:test` 和 `node:assert/strict`，不得新增依赖。至少覆盖：

1. canonical trace 有效且四类 marker 齐全。
2. canonical 每次返回深拷贝。
3. 完整 player trace 规范化后保持 `source: player`。
4. 输入数组不被修改。
5. sample 排序、重复时间戳去除、位置 clamp。
6. 非对象、NaN、Infinity、安全过滤。
7. 空轨迹回退 canonical。
8. 缺 marker 回退 canonical。
9. 未知版本回退 canonical。
10. 非法 source 回退或规范化为安全结果。
11. `summarizeTrace` 不泄露 samples。
12. 规范化结果总能通过 `validateTrace`。

## 执行检查

```bash
node --check src/tutorial/phases/traceContract.js
node --test tests/tutorial/traceContract.test.mjs
git diff --check -- src/tutorial/phases/traceContract.js tests/tutorial/traceContract.test.mjs
```

## 交付格式

完成后报告：

- 修改文件。
- 明确未修改的受保护文件。
- API 与关键选择。
- 测试数量和结果。
- 未做的接线工作。
- 已知风险。
