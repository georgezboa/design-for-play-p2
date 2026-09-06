# Night Service Phase V–VI — Kimi 审核与修复工作包

日期：2026-08-04  
状态：`READY FOR READ-ONLY AUDIT`  
审核范围：从 Phase V 开始，覆盖 Phase V 与 Phase VI  
冻结范围：Phase I–IV、谜题答案、纯状态机规则、共享路由

## 1. 产品目标

这不是一次“让机器更漂亮”的泛化美术 pass。目标是让第一次玩的玩家仅凭机械动作读出：

`我碰了什么 → 哪个部件响应 → 力/气/电沿哪里传播 → 为什么失败或成功`

每个控制必须立刻产生本地物理反馈；反馈必须沿可见结构到达结果，不能只靠 toast、文字或颜色宣告。

## 2. 已锁定的基线修复

以下行为由 Codex 先行修复，Kimi 不得回退：

- Phase VI 的 `[E] 接合牵引 / 断开牵引` 改为 `[E] ENGAGE TRACTION / DISENGAGE TRACTION`；
- Phase V 与 VI 的向下观察改成点击切换，而不是按住：
  - 第一次按 `S` 或 Down：镜头向下；
  - 松键：镜头保持向下，不自动回正；
  - 再按一次：回到驾驶室视角；
- Phase VI 第一次自动观察结束后继续保持向下，玩家主动按键才回正；
- V/VI 在镜头向下时显示英文 `[S] RETURN TO CAB`，向上时显示 `[S] INSPECT UNDERCARRIAGE`。

## 3. Phase V 审核问题

Phase V 是 `READ THE BOGIE`。审核必须从普通入口开始，不得只看 QA fixture。

### 必须回答

1. 不读提示时，玩家是否能看出前后两个 bogie 是同类结构？
2. 第一次 `TEST BOTH BOGIES` 后，健康 bogie 和后方卡死 bogie 的矛盾是否同时可见？
3. 玩家能否从机械结构判断故障在局部制动支路，而不是猜四个按钮？
4. `CUT OFF → BLEED → SERVICE PIN → FREE PISTON → RESTORE` 每一步是否移动了对应实体部件？
5. 错误操作是否产生局部尝试、阻力或回弹，并明确暴露缺失条件？
6. 修复后再次 TEST，是否能看到完整的恢复链，而不是直接开门？

### 通过标准

- 5 秒静止观察能区分健康/故障 bogie；
- 第一次 TEST 后，玩家视线能沿同一空间位置比较两个 bogie；
- 每次 E 都有 100ms 内的本地机械响应；
- 错误顺序不清空已有进度，玩家可原地恢复；
- 删除 toast 后仍能判断失败原因与下一步检查对象；
- 完成前后截图必须在同一相机尺度下可比较。

## 4. Phase VI 审核问题

Phase VI 是 `PAST RIDES THE LOAD`。重点不是按键本身，而是过去的载荷如何改变现在的牵引窗口。

### 必须回答

1. 第一轮自动观察时，玩家能否看懂 past trolley 的移动路径？
2. 观察结束后，镜头是否保持向下，不突然回正？
3. `ENGAGE TRACTION` 过早、窗口内、过晚三种结果是否在同一台机器上有不同物理反馈？
4. 玩家是否能看见载荷位置改变 bogie 咬轨状态、电流与轮组行为？
5. 成功是否表现为完整的 `past load → adhesion → current → wheel bite → departure` 链？
6. 全部界面、交互和相机提示是否为英文？

### 通过标准

- 自动观察结束后 `tutorialLookingDown` 仍为 true；
- 松开 S/Down 不改变视角；第二次按键才回正；
- 普通输入可以完成观察、一次错误接合、恢复、正确接合和离开；
- 过早接合不能只闪红或弹 toast，必须让手柄/轮组/电流表产生可读的因果反馈；
- 成功前不得提前播放离站结果；
- 源码与运行画面中不得出现中文玩家提示。

## 5. Kimi 第一次交付：只读审核

Kimi 首轮不改代码，只提交：

1. Phase V 普通入口完整游玩记录；
2. Phase VI 普通入口完整游玩记录；
3. 每关入口、第一次操作、错误、恢复、成功五张截图；
4. 按严重度排列的问题表：`BLOCKER / MAJOR / POLISH`；
5. 每个问题必须包含：玩家动作、预期、实际、源码位置、最小修复建议；
6. 明确列出拟修改文件，等待 Codex 批准后再进入实现。

不得把模型自述、单元测试或 QA URL 当作玩家体验通过。

## 6. 实现阶段候选文件

只有 Codex 批准的问题可以进入实现。候选文件限定为：

- `src/tutorial/TimetablePuzzle.js`
- `src/tutorial/underfloorView.js`
- `src/scenes/GameScene.js`
- Phase V/VI 对应的局部 art 文件
- Phase V/VI 对应的 focused tests

未经批准不得修改：

- `src/level.js`
- `src/tutorial/phases/bogieDiagnosis.js`
- `src/tutorial/phases/echoReplay.js`
- Phase I–IV 文件
- 共享章节路由、其他车厢、故事和美术资产

## 7. 最终验收

- 普通键盘完整通过 Phase V 与 VI；
- `render_game_to_text()` 与画面状态一致；
- Phase V/VI focused tests 通过；
- 全部 tutorial regressions 通过；
- assets check、production build、`git diff --check` 通过；
- 截图覆盖入口、错误、恢复、成功；
- George 进行真人首玩并给出 `PASS / REVISE / BLOCKED`。
