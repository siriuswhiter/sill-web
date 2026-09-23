# 顶部置物岛 UI 对齐验证

## 范围

- 将首页顶部 notch 从独立黑块与下拉矩形，改为与 macOS App 一致的收缩态/展开态层级。
- 保留现有全屏场景、泡泡行走和内容飞入演示。
- 同步根页面、/en/ 与 /zh/ 静态首页。

## 设计基准

- 收缩态：190px 模拟硬件 notch，外侧增加 8px 可见轮廓；外沿持续内收，底边与内角保持顺滑。
- 展开态：桌面压缩为 400×148px，移动端压缩为 318×140px；保持 30px 底角、紧凑 header、左侧 SillMark 与常驻 chip、右侧计数。
- 玻璃：深色半透明 backing、30px blur、细白边缘高光、内暗边和下投影。
- 内容：紧凑 tile 横向排列；Web 顶部 notch 不放泡泡，只展示暂存内容与 header。
- 生命周期：页面隐藏时停止 RAF；Reduce Motion 下展示静态展开态并移除过渡动画。

## 自动验证

| 检查 | 结果 |
| --- | --- |
| node --check home-run.js | 通过 |
| node --check demo.js | 通过 |
| node scripts/prerender-i18n.mjs --check | 通过 |
| node scripts/build-seo.mjs --check | 通过 |
| git diff --check | 通过 |
| 根页面中英节点计数 | 83 / 83 |
| /en/ 与 /zh/ notch 结构 | 各 1 份，资源路径已改为根绝对路径 |
| 展开动画 DOM 几何 | 1440×1000、1440×800、2000×1100、390×844 全部通过；650ms 内采样 43–79 帧，hero 的 top/left/width/height 最大变化均为 0 |
| 页面状态隔离 | 无 `sill-island-open` class，无 notch Pobb；`data-count` 只影响 notch 自身 |

## 视觉证据

- 1440×1000 收缩态：/private/tmp/sill-web-island-desktop.png
- 390×844 收缩态：/private/tmp/sill-web-island-mobile.png
- 1440×1000 最终默认态：/private/tmp/sill-web-island6-default-desktop.png
- 1440×1000 Reduce Motion 最终展开态：/private/tmp/sill-web-island6-expanded-desktop.png
- 390×844 Reduce Motion 最终展开态：/private/tmp/sill-web-island6-expanded-mobile.png

检查结果：桌面与移动端均无横向溢出；收缩轮廓贴合顶部并与黑色 notch 连续；展开态 header、分隔线和 tile 没有互相遮挡，且顶部 notch 内不再渲染泡泡。Hero 布局已与 notch 状态彻底解耦：CSS 不再包含任何 `.sill-island-open .hero` 规则，JS 不再切换页面状态 class。在四档视口中直接把 `data-count` 从 0 切到 1，并对整个 650ms 展开动画采样，hero 的 top、left、width、height 最大变化均为 0。动态形变仍需在真实浏览器中观察节奏，但所有过渡均在 Reduce Motion 下关闭。
