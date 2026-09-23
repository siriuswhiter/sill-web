# Retina 场景背景清晰度回归记录

## 范围与风险

- 用户任务：改善首页全屏 Living Scene 在大屏和 Retina 屏幕上的清晰度。
- 入口：`/`、`/en/`、`/zh/` 首页的固定场景背景，以及森林、海底、星空切换。
- 原因：网页背景为 2560×1440，但旧样式把背景盒固定扩到视口宽度的 132%；在约 2000 CSS px 宽、2× DPR 的显示器上，实际需要接近 5280 个横向像素。
- 主要风险：高清图未被浏览器选择；横向移动失去 overscan；前景比例变化后露边；三份首页引用漂移；新增图片显著增加首屏流量。

## 实现与资源

- 背景 overscan 改为固定 192 CSS px，不再随大屏宽度成比例放大。
- 前景保持原始 3:1 比例，以固定 320 CSS px overscan 覆盖近景移动。
- 保留 2560×1440 JPEG 作为 1× 回退，并通过 `srcset` 为高 DPI 屏提供 5120×2880 JPEG。
- 三张 2× 图由对应 `page-*.jpg` 使用 Lanczos 放大并做轻度锐化生成；它们是网页交付衍生图，不替换 App 内 1920×640 场景包。

```bash
ffmpeg -i assets/scenes/page-<scene>.jpg \
  -vf "scale=5120:2880:flags=lanczos,unsharp=5:5:0.55:5:5:0" \
  -q:v 3 assets/scenes/page-<scene>-2x.jpg
```

## 验证矩阵

| 检查 | 通过条件 | 证据 |
| --- | --- | --- |
| 资源尺寸 | 三张 2× 背景均为 5120×2880 | `sips -g pixelWidth -g pixelHeight assets/scenes/page-*-2x.jpg` |
| 高 DPI 选择 | 2× 浏览器实际请求 `page-*-2x.jpg` | 本地无缓存服务器访问日志 |
| 场景切换 | forest、ocean、space 均预加载高清背景并能切换 | 访问日志与 `home-run.js` 语法检查 |
| 三语言入口 | `/`、`/en/`、`/zh/` 的初始背景都声明相同 `srcset` | HTML 静态检查与预渲染一致性检查 |
| 视觉 | 2000×1030 CSS viewport、2× DPR 下无背景露边，文字层级清楚 | `/private/tmp/sill-web-retina.png` |
| 补丁格式 | 无空白错误 | `git diff --check` |

## 人工边界

- 真机 Safari 的缓存更新与超宽外接显示器仍需发布前人工查看。
- 2× 文件是从现有 2560×1440 网页母图生成的高质量交付版本；若以后重新生成场景母图，优先直接保留 5K 原始输出。
