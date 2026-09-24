# Retina 场景背景清晰度回归记录

## 范围与风险

- 用户任务：改善首页全屏 Living Scene 在大屏和 Retina 屏幕上的清晰度。
- 入口：`/`、`/en/`、`/zh/` 首页的固定场景背景，以及森林、海底、星空切换。
- 原因：网页背景为 2560×1440，但旧样式把背景盒固定扩到视口宽度的 132%；在约 2000 CSS px 宽、2× DPR 的显示器上，实际需要接近 5280 个横向像素。
- 主要风险：高清图未被浏览器选择；横向移动失去 overscan；前景比例变化后露边；三份首页引用漂移；新增图片显著增加首屏流量。

## 实现与资源

- 背景 overscan 改为固定 192 CSS px，不再随大屏宽度成比例放大。
- 前景保持原始 3:1 比例，以固定 320 CSS px overscan 覆盖近景移动。
- 保留 2560×1440 JPEG 作为移动端和 1× 回退；仅在视口至少 1200px 且 DPR ≥ 1.5，或视口至少 2600px 时，通过 `srcset` 选择 5120×2880 JPEG。
- 三张 2× 图由对应 `page-*.jpg` 使用 Lanczos 放大并做轻度锐化生成；它们是网页交付衍生图，不替换 App 内 1920×640 场景包。
- 首屏只声明并高优先级加载 forest 背景与前景；备用 buffer 保持空白，约 1.6 秒后再在浏览器 idle 时预热下一场景，避免首屏同时解码多套场景。
- 场景资源统一使用版本化 URL，避免 HTML 与 JS 以不同缓存键重复请求同一图片。
- 首页 Pobb sprite 使用 1536×1152 的 `walk-web.webp`，替代 6144×4608 的通用高清图；文件由 1,467,464 bytes 降至 181,996 bytes，解码像素减少 93.75%。
- 移动端场景 DOM 更新限制为 30fps；隐藏页面、Reduce Motion 和用户暂停时继续停止 RAF。

```bash
ffmpeg -i assets/scenes/page-<scene>.jpg \
  -vf "scale=5120:2880:flags=lanczos,unsharp=5:5:0.55:5:5:0" \
  -q:v 3 assets/scenes/page-<scene>-2x.jpg
```

## 验证矩阵

| 检查 | 通过条件 | 证据 |
| --- | --- | --- |
| 资源尺寸 | 三张 2× 背景均为 5120×2880 | `sips -g pixelWidth -g pixelHeight assets/scenes/page-*-2x.jpg` |
| 高 DPI 选择 | 桌面 Retina 选择 `page-*-2x.jpg`；390px、DPR 2 手机不请求 5K 图 | Chrome DevTools 网络事件与本地无缓存服务器日志 |
| 移动首屏请求 | 800ms 内只请求 forest 全屏背景/前景和轻量 Pobb sprite，不请求 ocean/space 全屏图或 `page-*-2x.jpg`；场景选择卡片的三张小缩略图继续由浏览器原生 lazy 阈值管理 | `/private/tmp/sill-web-perf-check.mjs` 输出 |
| 延迟预热 | ocean 全屏背景/前景约 1.7 秒后由 idle preload 请求，URL 与 HTML 版本键一致 | Chrome DevTools 网络事件 |
| 场景切换 | forest、ocean、space 使用双 buffer 切换；仅当前可见 buffer 每帧更新 transform | `home-run.js` 语法检查与浏览器运行 |
| Pobb 资源 | `walk-web.webp` 为 1536×1152、181,996 bytes，画面无明显降质或裁切 | `sips`、`stat`、`/private/tmp/sill-web-mobile-centered-perf.png` |
| 三语言入口 | `/`、`/en/`、`/zh/` 的初始背景都声明相同 `srcset` | HTML 静态检查与预渲染一致性检查 |
| 视觉 | 2000×1030 CSS viewport、2× DPR 下无背景露边，文字层级清楚 | `/private/tmp/sill-web-retina.png` |
| 补丁格式 | 无空白错误 | `git diff --check` |

## 人工边界

- 真机 Safari 的缓存更新、idle 调度节奏与超宽外接显示器仍需发布前人工查看。
- 2× 文件是从现有 2560×1440 网页母图生成的高质量交付版本；若以后重新生成场景母图，优先直接保留 5K 原始输出。
