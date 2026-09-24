# 顶部置物岛 UI 对齐验证

## 范围

- 将首页顶部 notch 从独立黑块与下拉矩形，改为与 macOS App 一致的收缩态/展开态层级。
- 保留现有全屏场景、泡泡行走和内容飞入演示。
- 同步根页面、/en/ 与 /zh/ 静态首页。

## 设计基准

- 收缩态：190px 模拟硬件 notch，外侧增加 8px 可见轮廓；外沿持续内收，底边与内角保持顺滑。
- 展开态：Web 版改为 notch-free 小浮层，不再从顶部硬件 notch 向下展开；桌面约 328×116px，移动端约 260×104px，保持页面水平居中并下移到导航栏下方，避免遮挡移动端导航。
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
| notch-free 移动端几何 | 390×844、DPR 2：nav bottom 30px，expanded top 42px、size 260×104px，水平中心与 viewport 中心一致，未覆盖 nav；打开 mobile menu 时命中元素为菜单链接 |
| notch-free 桌面几何 | 1440×1000、DPR 2：expanded top 40px、size 328×116px，水平中心与 viewport 中心一致，未覆盖 nav |
| 页面状态隔离 | 无 `sill-island-open` class，无 notch Pobb；`data-count` 只影响 notch 自身 |

## 视觉证据

- 1440×1000 收缩态：/private/tmp/sill-web-island-desktop.png
- 390×844 收缩态：/private/tmp/sill-web-island-mobile.png
- 1440×1000 最终默认态：/private/tmp/sill-web-island6-default-desktop.png
- 1440×1000 Reduce Motion 最终展开态：/private/tmp/sill-web-island6-expanded-desktop.png
- 390×844 Reduce Motion 最终展开态：/private/tmp/sill-web-island6-expanded-mobile.png
- 1440×1000 notch-free 展开态：/private/tmp/sill-web-expanded-desktop-notch-free.png
- 390×844 notch-free 展开态 + mobile menu：/private/tmp/sill-web-expanded-mobile-notch-free.png

检查结果：桌面与移动端均无横向溢出；收缩轮廓贴合顶部并与黑色 notch 连续；展开态 header、分隔线和 tile 没有互相遮挡，且顶部 notch 内不再渲染泡泡。Hero 布局已与 notch 状态彻底解耦：CSS 不再包含任何 `.sill-island-open .hero` 规则，JS 不再切换页面状态 class。在四档视口中直接把 `data-count` 从 0 切到 1，并对整个 650ms 展开动画采样，hero 的 top、left、width、height 最大变化均为 0。动态形变仍需在真实浏览器中观察节奏，但所有过渡均在 Reduce Motion 下关闭。

追加检查结果：Web 展开态改为导航栏下方的居中浮层，并将展开态 z-index 降到导航之下。390px 移动视口中 expanded notch 与导航栏没有几何重叠；mobile menu 打开时与浮层有视觉区域重叠，但菜单位于更高层级，命中测试落在菜单链接上，不会被浮层阻挡。桌面展开态同样脱离顶部 notch，尺寸缩小到 328×116px。
