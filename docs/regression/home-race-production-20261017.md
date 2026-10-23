# 正式首页彩虹赛道接入与性能 review

## 范围与预期

将已确认的地标赛道接入正式 `index.html`，保持原生产导航 DOM、紧凑尺寸、菜单、下载和中英文切换。同步生成 `/en/`、`/zh/`，沿用原站静态部署方式。原型保留供对照；原生 App 与独立 scene-pack 工作不改动。

## 验证计划

- 对照接入前导航 DOM；桌面与手机菜单、功能/背景/价格/FAQ 锚点和语言跳转可用。
- 1440×1000、390×844、320×640 渲染；无横向溢出，Island 与导航互不遮挡。
- 无 JavaScript / 3D 加载失败时，标题、介绍、下载、导航和 FAQ 可用。
- 冷缓存模拟 1.6 Mbps、150 ms 延迟，记录首屏文字、加载完成、请求体积和长任务。首屏图像预算 700 KiB；3D 引擎在内容绘制后加载。
- 固定地形、模型、道具模板与背景缓存；像素数最多约 160 万，低内存设备约 90 万；关闭 pet atlas mipmap；道路标记用一个实例化 draw call。
- 连续运行两个完整地标周期，比较稳定阶段的 geometry、texture、DOM 和经 GC 的 JS heap，不把冷启动延迟上传当作泄漏。
- 用户暂停、离屏、后台、Reduce Motion 后不渲染，恢复不补跑；WebGL context 丢失/恢复与页面离开清理。
- `node --check`、资源预算、中英文生成检查、SEO 检查、diff 空白检查。

## 结果

已通过本次范围内的自动检查和画面 review。代码位于 `feat/positioning-2.0`，未提交、推送或部署。预览入口为 `/`、`/zh/`、`/en/`。

### 页面与交互

- 生产导航 HTML 与接入前逐字一致，SHA-256 为 `198e5e251bdbeffbe5d0cfb1885350f82704c8d4f7d73f19174ba6f52531d20f`。导航 CSS 沿用原 `home-run.css` 中的生产规则：桌面高 30px、手机高 48px。锚点保留，Pobb、语言和下载目标保留。
- 英文与中文、1440×1000、390×844、320×640 画面已检查。320px 窄屏收紧标题、隐藏装饰性排名标签，避免重叠；短屏可继续向下滚动查看工具栏和正文。手机菜单点击后关闭；FAQ 原生 details 可切换。
- 暂停、滚到功能区、真实后台标签页和 Reduce Motion 后，渲染计数不再增加。减少动态时，六个手动工具入口仍能更新同一座 Island。
- WebGL context 丢失后显示降级提示，恢复后重新绘制。模拟完全无 WebGL 时，Island 入口仍可演示；无 JavaScript 时，标题、导航、下载、正文和原生 FAQ 保留。
- 背景加载失败专项：屏蔽富士山图片，在该目的地期间仅请求一次。保留失败 promise 到缓存淘汰，避免逐帧重试。
- 页面退出的事件合同验证中，非 bfcache 路径释放 renderer、几何、材质、纹理、背景缓存和模板，并断开观察器。bfcache 的 pagehide/pageshow 事件暂停与恢复已验证；没有声称真实浏览器前进/后退已命中 bfcache。

### 加载与内存

使用隔离 Chrome Headless、1.6 Mbps 下载速度和 150 ms 延迟，关闭浏览器缓存。生产压缩测试由临时 gzip 静态服务器提供相同文件；这证明压缩传输下的表现，不代表线上 CDN 已部署或实测。

| 项目 | 实测或预算结果 |
| --- | --- |
| 保守初始图像合计，含下方宠物海报 | 699 KiB，预算 700 KiB |
| 全部十处地标夜景 | 776 KiB，按行进顺序加载 |
| 赛道脚本 gzip 合计，含 Three.js | 188 KiB，预算 230 KiB |
| gzip 慢网首屏内容绘制 | 496 ms |
| gzip 慢网完整赛道就绪 | 5917.8 ms |
| gzip 运行到就绪的子资源传输 | 992,849 bytes，不含 HTML 主请求 |
| 旧的未压缩本地服务慢网首屏 / 赛道就绪 | 864 ms / 9710.4 ms；海报缩小前的数据，单独保留 |
| 两个 pet atlas 原始 RGBA 尺寸合计 | 12.375 MiB；保留全部动画帧，关闭 mipmap |
| 两轮自然模拟 | 116.221 秒，1162.21 米，20 次送达，覆盖十地标与七类道具 |
| 两个稳定采样时点的 geometry / texture | 140 → 141 / 3 → 3 |
| GC 后 JavaScript heap | 6,122,868 → 6,164,248 bytes，约增加 40.4 KiB |
| DOM / listener | 节点 1184 → 1176，listener 31 → 31 |

这两个采样时点没有发现异常增长；JS heap 不含整个浏览器进程或显卡总占用。全程使用固定十地标、七种道具模板和最多三项背景 promise 缓存；固定网格更新，路标合并为一次实例化绘制。默认桌面最多 40 次/秒、小屏或低内存设备最多 30 次/秒；画布上限约 160 万像素，低内存设备约 90 万像素。没有进行真机能耗或低端 GPU 帧率承诺。

### Review 修复与证据

1. 原导航跳到功能区后，顶部残留赛道仍触发更新：可见区域排除顶部 100px，专项恢复验证通过。
2. 背景 decode 失败后逐帧重试：缓存失败结果至淘汰，屏蔽资源检查通过。
3. 减少动态的首帧排名标签使用旧镜头矩阵：显式更新 camera world matrix；手机静态画面重新检查。
4. 首屏竞争带宽的下方 768px 海报由 169,004 bytes 缩至 480px WebP、18,478 bytes；竞速 atlas 没有降帧或缩小。
5. FAQ 检查曾假设首项初始关闭，实际原站默认 open；测试改为验证点击前后状态翻转，没有修改原站行为。

证据在 `docs/design-previews/home-race-production-20261017/`：`results.json` 保存自然巡游、状态与未压缩慢网检查；`extra-results.json` 保存背景失败、无 WebGL、真实后台和生命周期事件；`compressed-performance.json` 保存最终压缩慢网结果。`source-sha256.json` 保存最终源文件版本。完整巡游之后的改动仅为首帧标签、窄屏排版与下方海报，分别补做了画面和加载检查，没有把早期失败结果冒充最终结果。

截图为本次 Chrome 截图缩放转出的 WebP；`mobile-en-final.webp` 是最终 320px 状态。可复现脚本一同保存，依赖 Python websockets、Pillow（截图转码时）、本地预览端口 8000 与隔离 Chrome 调试端口 9233；压缩性能脚本另用临时端口 8001。

最终 `node --check`（四个运行模块）、`node scripts/check-home-assets.mjs`、`node scripts/prerender-i18n.mjs --check`、`node scripts/build-seo.mjs --check` 与 `git diff --check` 全部通过。资源预算检查已接入现有 CI。

隔离浏览器和临时 gzip 服务器在证据收集后关闭，原 8000 预览服务器保留。Safari / Firefox、真实低端手机帧率以及实际 CDN/Brotli 行为尚未验证；本次没有原生 Swift 改动，不运行 Swift/Xcode 构建。
