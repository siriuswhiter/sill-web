# macOS 即将上线网页回归记录

## 范围与风险

- 用户任务：官网不再提供 Sill 直装，新访客看到“macOS 即将上线”。
- 入口：主页导航、Hero、Free / Pro 套餐、底部状态区，以及支持、隐私和条款页导航。
- 主要风险：残留 DMG 下载链接；中英文静态页漂移；SEO 或结构化数据继续宣称可下载。
- 兼容边界：保留 `appcast.xml` 给已安装的历史官网版本获取更新，但官网不再引导新用户下载安装。

## 自动验证

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 双语预渲染 | `node scripts/prerender-i18n.mjs` | 通过，生成 12 个 `/en`、`/zh` 页面 |
| 双语一致性 | `node scripts/prerender-i18n.mjs --check` | 通过 |
| SEO / GEO 生成 | `node scripts/build-seo.mjs` | 通过 |
| SEO / GEO 一致性 | `node scripts/build-seo.mjs --check` | 通过 |
| 脚本语法 | `node --check scripts/build-seo.mjs` 与 `node --check scripts/prerender-i18n.mjs` | 通过 |
| 补丁格式 | `git diff --check` | 通过 |
| 下载入口残留 | 搜索 `/download` 链接、`downloadUrl` 与旧下载 CTA | 通过，无可点击直装入口 |

## 行为结论

- 所有获取和购买 CTA 均为原生禁用按钮，中文显示“macOS 即将上线”，英文显示“Coming soon on macOS”。
- `/download` 以 302 回到主页 `#download` 上线状态区，不再跳转 GitHub Release。
- JSON-LD 不再包含 `downloadUrl` 或当前可购买 Offer。
- `llms.txt` 与 `llms-full.txt` 明确说明即将上线且官网不提供直装。

## 发布结论

自动门禁通过，可发布。Cloudflare Pages 部署后的 `/download` 重定向仍需由线上环境接收 `_redirects` 后观察一次；本地静态服务器不能模拟该平台规则。
