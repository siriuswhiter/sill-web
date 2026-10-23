# 整站定位更新与回归

2026-10-17；分支 `feat/positioning-2.0`。

## 设计方案

用户意图：已接受的 3D 彩虹赛道保持为首页主体验，其他区域和页面跟上文件、组件、工具的定位，不再提供独立 Pobb 桌宠产品页。

- 首页路径：3D 赛道 → Island 组合示意 → 文件中转、组件和工具的日常场景 → 两位伙伴 → Free / Pro → FAQ。
- 新增 `components.html` 作为公开功能说明：置物与文件浏览、五个日常组件、三个常用工具、伙伴与背景、Island / Workbench / Desktop / 主窗口各自的作用。
- 保持已接受的午夜配色：`#10172d` 页面、`#171f33` 内容面、`#f4eddf` 正文、`#b8b7cc` 次要文字、`#dec4fa` 链接、`#e7bd88` 下载。字体延续原系统字体。版式以真实功能关系组织，目录使用图标与说明行，伙伴同等展示。
- 沿用导航的尺寸、位置、语言与下载入口，仅把 Pobb 项替换成组件与工具；支持和法律页复用同一导航。抽出共享 `site-shell.css` / `site-nav.js`，目录和文档不加载 Three.js 或 pet 图集。
- 老的两类 Pobb 地址（根路径、EN、ZH 共六条）改为 301 跳转，同时保留不依赖服务器规则/JavaScript的轻量 HTML 回退。移出 sitemap；旧素材留作设计历史。

## 当前代码依据

- `../sill-app/Sources/SillApp/ProductTier.swift`：Free = Shelf、Clock、Quick Note；Pro = Apps、Files、Clipboard、Translate、Weather、Pomodoro、Photo、Pet。
- `../sill-app/Sources/SillApp/AppModel.swift:1215` 和 `:2214`：搜索、编辑、标签、固定、批量、恢复、自动清理、外观、快捷键和显示选择均是 Free；`canAddContent` 无 5 项限制。
- `../sill-app/Sources/SillApp/Views/ProFeatureUI.swift:43`：Pro 工具、高级组件、工作台/桌面和 Living Island；Free 内容、组件和设置。
- `TranslateServiceConfiguration.swift`：翻译服务需网络，部分服务需 API 凭据；`FilesFeatureModule.swift` / `FilesModels.swift`：本地选择文件夹与 SSH 主机；`WeatherLocationProvider.swift`：当前位置需授权。
- 当前 App 代码比旧站点价目说明更新，因此同步移除旧的 Free 5 项限制及 Pro 专属基础设置/整理/恢复说法。

## 验证计划

1. 生成 EN / ZH，检查 HTML 资源、站内链接、锚点、SEO canonical/hreflang、旧链接回退与 sitemap。
2. 桌面和 390px / 320px 浏览首页下半页、组件目录、支持和法律页；检查两语言、菜单、键盘焦点、无横向溢出。
3. 确认首页赛道仍自动运行，离屏后暂停；辅助页面不请求 WebGL、竞速模块或桌宠图集。
4. Free / Pro 和联网说明与代码对照；旧 Pobb 产品入口及误导付费文案不再出现在当前公开页面。
5. 运行资源预算、语法、i18n、SEO、站内内容检查和 whitespace。保留截图、结果及源码 hash。

## 实测结果

- `check-site-content`：15 个当前公开页面、527 个本地链接/资源、6 个退役路由均通过。
- `check-home-assets`：首屏图片 214 KiB、全部地标背景 776 KiB、竞速脚本 gzip 192 KiB，均在既有预算内。
- `prerender-i18n --check`、`build-seo --check`、变更脚本语法检查及 `git diff --check` 通过。
- 16 组组件目录/支持/隐私/条款页面检查：中文与英文桌面 1440px、中文 390px、英文 320px；无横向溢出，无脚本异常和 HTTP 错误响应。导航保持桌面 30px、手机 48px。
- 目录 10 个能力条目；语言切换进入相应静态页面；关闭 JavaScript 后中文目录仍可阅读；手机菜单 Escape 关闭并将焦点还给按钮。
- 六个旧 Pobb HTML 地址均跳到各自语言的组件目录伙伴锚点。`_redirects` 的永久跳转配置已静态检查；实际托管 HTTP 301 待部署后验证。
- 首页下方的功能、伙伴、定价、FAQ 在 390px/320px 下均无横向溢出。赛道默认运行，两位角色仍是 3D；滚到下方内容后连续两次采样帧计数不再增长。
- 赛道本轮快照：目标 40 FPS、约 160 万 canvas 像素；两个角色共 43 个 mesh、35,214 个三角形、0 张宠物纹理。该快照用于确认集成后配置保持正常，不用于声明真实设备帧率或内存上限。
- 支持/隐私/条款页各请求 7 项资源；全部辅助页面不请求竞速模块、Three.js 或旧宠物图集。

## Review 与修复

1. **定位与权益**：Pobb 与茄博士均属于 Island 伙伴，旧专属桌宠页退出当前导航和 sitemap；文件整理、组件、工具成为整站主线。Free / Pro 与 App 代码逐条对照，修复旧版 5 项限制、基础设置/恢复属于 Pro 的过时说法。
2. **页面一致性**：修复条款页旧 `doc` 类名导致的新样式遗漏；中英文 FAQ JSON-LD 和应用描述随页面语言生成。辅助页面复用导航和字体、午夜色系及链接反馈。
3. **运行时**：实际点击功能锚点发现，新增滚动留白与旧 section margin 叠加，令赛道底端残留 105px，超出离屏检测边界。将共享 `scroll-padding-top` 恢复到 60px 后赛道底端为 95px，完整浏览器回归通过。
4. **视觉**：人工检查桌面目录/定价/条款、手机功能区/伙伴区/支持页/菜单；伙伴区补拍静止截图，避免把平滑滚动中途的画面当作最终布局。未发现仍需阻塞本次更新的问题。

## 证据与边界

完整结果、源码 SHA-256、可重复浏览器脚本及压缩截图见 [本次 review 证据](../design-previews/site-positioning-20261017/README.md)。

当前为 `feat/positioning-2.0` 分支上的本地实现，未提交、推送或部署。原有赛道/角色模型与无关 scene-pack 工作保留；原生 App 未改动。此次验证覆盖内容更新和集成回归，长时间赛道运行证据沿用 [3D 角色回归](race-pets-3d-20261017.md) 与 [首页生产接入回归](home-race-production-20261017.md)。
