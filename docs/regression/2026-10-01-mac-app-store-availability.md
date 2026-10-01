# Mac App Store 上线链接回归记录

## 范围与用户路径

- 用户任务：从 Sill 官网直接进入 Mac App Store 产品页并获取应用。
- 入口：首页导航、移动端菜单、Hero、Free 套餐卡、底部下载区，以及支持、隐私和条款页导航。
- 成功状态：打开 Apple ID `6811788251` 对应的 `Sill: Notch Shelf` 产品页。
- 兼容路径：旧 `/download` 入口以 302 跳转到相同产品页；`appcast.xml` 继续仅服务历史直装版本。

## 产品口径

- 官网不再显示“macOS 即将上线 / Coming soon on macOS”。
- 官网仍不提供新的 DMG 直装入口。
- Sill Free 与 Sill Pro 的说明不变：Pro 是应用内一次性非消耗型购买，7 天试用不会自动续费或扣费。
- CTA 不硬编码商店实时价格，避免 App Store 各地区价格变更传播期间出现错误承诺。

## 验证清单

- Apple Lookup API 返回 `trackId = 6811788251`、`trackName = Sill: Notch Shelf`、`kind = mac-software`。
- 中国区产品页 `https://apps.apple.com/cn/app/sill-notch-shelf/id6811788251?mt=12` 返回 HTTP 200。
- 双语源页面和 `/en`、`/zh` 预渲染页面不再残留旧上线状态。
- `data/site.json`、`llms.txt`、`llms-full.txt` 与 README 使用一致的 Mac App Store availability。
- `node scripts/prerender-i18n.mjs --check`、`node scripts/build-seo.mjs --check` 与首页资产门禁通过。

## 自动验证结果

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 双语预渲染 | `node scripts/prerender-i18n.mjs` | 通过，生成 12 个页面 |
| 双语一致性 | `node scripts/prerender-i18n.mjs --check` | 通过 |
| SEO / GEO 生成 | `node scripts/build-seo.mjs` | 通过 |
| SEO / GEO 一致性 | `node scripts/build-seo.mjs --check` | 通过 |
| 首页资产预算 | `node scripts/check-home-assets.mjs` | 通过，初始图片最坏情况 606 KiB |
| 生成脚本语法 | `node --check scripts/prerender-i18n.mjs`、`node --check scripts/build-seo.mjs` | 通过 |
| 补丁格式 | `git diff --check` | 通过 |
| 旧状态残留 | 搜索源页面、双语页面、站点数据和 LLM 文档 | 通过，无残留 |

## 发布后人工门槛

- Cloudflare Pages 发布后访问 `/download`，确认平台读取 `_redirects` 并返回 App Store 外链 302。
- 分别点击桌面和移动端 CTA，确认浏览器或 Mac App Store 打开正确产品页。
- Apple 当前对免费价格的地区传播不同步；CTA 不显示实时价格，待各 storefront 完成同步后再做一次抽查。
