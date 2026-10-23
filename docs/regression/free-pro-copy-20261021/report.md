# Free / Pro 文案同步

根据 sibling `sill-app` 的实际模块权限与用户确认的当前开放范围，修正价格区、FAQ、组件说明、条款和 product facts，并重新生成中英文镜像与 SEO / LLM 输出。

Free 包含 Apps、Files、Clock、Weather 和基础设置。Pro 包含 Shelf、Note、Clipboard、Translate、Pomodoro、Photo、Island 伙伴、OCR 搜索、敏感内容保护、内置动态背景和自定义图片背景。Shelf 不限项目数量，仍属于 Pro。删除 Workbench 与 Desktop host 的所有公开能力描述。World Landmarks 与独立扩展包条件保持准确。

- `node scripts/prerender-i18n.mjs --quiet` 和 `node scripts/build-seo.mjs` 已运行。
- `node scripts/check-site-content.mjs`：21 pages、838 local links/assets、6 retired routes，通过。
- i18n 与 SEO `--check`：通过。
- 修改范围内 `git diff --check` 与中英文 punctuation gate：通过。
- Chromium 中英文价格卡片在 390 / 1280 px 下没有横向溢出；最终截图逐张检查，见本目录 `pricing-*-free.png` / `pricing-*-pro.png` 与 `browser-results.json`。

`scoped-changes.patch` 仅记录本次相对已有 dirty tree 的修改，避免把其他会话的未提交工作归入本次。仅本地更新，未部署。App 原生流程和四语言测试证据见 sibling `sill-app/docs/regression/20261021-free-pro-copy/report.md`。
