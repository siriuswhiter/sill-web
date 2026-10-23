# 彩虹赛道原型验证 · 2026-10-17

## 范围与环境

改动范围是 `prototype-world.html/css/js`、角色图集和设计文档。使用本地静态服务器、隔离的 Chrome Headless 用户目录及 CDP；不接触真实 App 数据。正式首页和无关 scene-pack 文件不在本轮范围内。原生 Swift 源码没有修改，因此不运行 App 的 Swift/Xcode 构建。

## 验证矩阵

| 用例 | 可观察的通过条件 |
| --- | --- |
| JS 语法 | `node --check` 无错误 |
| 默认持续运行 | 页面加载即有行进距离与帧号变化；没有 Start 门槛 |
| 连续碰撞 | 自然运行覆盖文件、照片、专注、翻译、剪贴板、速记、应用；事件记录均由赛道碰撞产生 |
| 完整交接 | 连续截图覆盖赛道拾取、半空飞行、岛内接收，目标不会越出 Island |
| Island 状态 | 每种内容可读、适配当前共享外壳，无独立侧边演示框 |
| 主动选择 | 点击入口先在赛道生成对应物品，随后碰撞送达；快速切换不堆积无限对象 |
| 暂停 | 距离、pet 帧、飞行进度冻结；恢复后继续 |
| 减少动态 | 不自动运行；入口仍能切换 Island 内容 |
| 页面隐藏 | 隐藏期间距离不变化，恢复无时间跳跃 |
| 尺寸与语言 | 1440 × 1000、390 × 844、窄屏及英文无水平溢出或关键遮挡 |
| 运行边界 | 长运行后 geometry / texture 数量有界；无 JS 异常、资源加载失败 |
| 降级 | WebGL 不可用仍有内容入口 |

## 证据位置

本地证据保存在 `docs/design-previews/race-20261017/`。

## 最终结果

**结论：本轮独立网页原型范围通过。** Chrome Headless 的主验证运行约 101.42 秒，其中自然赛道运行 92.225 秒、922.25 米，发生 16 次自然送达，覆盖 file、photo、focus、translate、clipboard、note、apps。角色均出现过领跑状态。场景 geometry 保持在 27–29，texture 上限 9；这是资源计数证据，不代表真机帧率结论。

主验证共 31 项断言，30 项通过。唯一未通过项是测试在 CDP `Page.setWebLifecycleState(active)` 后直接断言恢复前进：Chrome Headless 当时仍将页面报告为 hidden，所以网站正确地保持暂停。专项补测通过 `Emulation.setFocusEmulationEnabled` 明确恢复可见状态，确认前进距离恢复增加且没有补跑隐藏期间时间。包含延迟加载在内的 5 项专项断言全部通过。原始结果保留，不把环境误差改写为原先通过。

| 项目 | 最终状态 | 证据 |
| --- | --- | --- |
| 默认运行、自然碰撞、轮流领跑 | 通过 | `results.json` / `naturalRun` |
| 固定资源数量 | 通过 | `bounded resources`，27–29 geometry、9 texture |
| 暂停、半空冻结、恢复投递 | 通过 | `pause freezes simulation` / `pause freezes in-flight item` |
| 番茄钟暂停与语言切换 | 通过 | 24:59 在暂停与语言切换后保持 |
| 手动放置、快速连续选择 | 通过 | `manual-collision` 与对象数量断言 |
| 桌面 / 平板 / 窄屏 | 通过 | 1440×1000、768×1024、390×844、320×640；英文窄屏翻译改为上下排列 |
| Reduce Motion | 通过 | 距离冻结，入口仍可切换内容 |
| 后台与恢复 | 专项补测通过 | `followup-results.json`：hidden 冻结，visible 后恢复推进 |
| pet 慢速加载 | 专项补测通过 | 拦截并延迟 Pobb 图集，期间 resize / hide / show，不提前进入碰撞计算 |
| WebGL 不可用 | 通过 | 场景降级后仍可打开 Apps 演示 |
| JS 异常 / 资源 404 | 通过 | 最终两组检查均无 JS 异常，主检查无缺失资源 |
| Safari / Firefox / 低端手机真机 | 尚未验证 | 留作正式上线前的兼容性检查 |

## Review 与修复

1. 逐项对照 `BuiltInFeatureModuleCatalog.swift`，用当前实际支持的 Quick Note 替换未注册的音乐功能演示。
2. 按每帧 alpha 包围盒生成脚部锚点，修正角色透明图集留白带来的悬空；保持核核滚动与茄博士迈步的动作差异。
3. 修正赛道侧面材质过暗、移动端标签出界、标题与拾取提示重叠、极窄英文翻译需要上下布局的问题。
4. 为渲染循环增加 `sceneReady` 闸门。第一轮曾观察到初始化期间提前访问尚未创建的 racer，最终延迟资源补测无此异常。
5. 暂停和切换语言只重画当前内容，不把番茄钟重置为 25:00。速记逐字呈现也跟随同一时钟。
6. 文件到达文案适用于两位角色；沿用正式网站真实 App Store 地址；增加已有 app icon 的 favicon 引用，消除 404。

## 证据、命令与边界

证据目录：`../design-previews/race-20261017/`。`final-verdict.json` 记录最终源文件 SHA-256、主验证与补测关系；`results.json` 与 `followup-results.json` 保留结构化原始结果；`race-storyboard.jpg`、`handoff-*.png`、`desktop-*.png`、`final-*.png` 覆盖动态交接及各内容状态。第一轮问题的诊断结果保存在同目录 `pre-fix-results.json`。

执行了 `node --check prototype-world.js`、`git diff --check`，并核对 `index.html`、`home-run.js`、`home-run.css`、`home.css` 与 `cb3cbc9` 相同。浏览器使用独立临时 profile；没有读取真实 App 文件、剪贴板、账号或笔记。临时 Chrome 在收集证据后关闭，保留已有端口 8000 的本地预览服务器。

本轮没有 Swift 源码变动，不把网页验证表述成原生 App、系统工具调用、正式线上站点或 3D pet 模型已通过验收。页面为 `noindex` 的独立原型；改动未提交、推送或发布。无关 scene-pack 工作没有写入。
