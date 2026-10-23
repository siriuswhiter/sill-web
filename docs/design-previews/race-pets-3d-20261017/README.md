# 3D pet 验证证据

2026-10-17，正式 `sill-web` 运行时。造型、步态与截图已人工查看，断言结果见各 JSON，正式源码 hash 见 `source-sha256.json`。

复现：启动网站 8000 服务和隔离 Chrome 的 CDP 9233 端口，安装 Python `websockets`。执行 `verify.py`、`model-views.py`、`mobile-motion.py`；`node model-contract.mjs` 验证 3D 视线和脚部支撑。`perf-check.py` 还需要在 8001 上提供带 gzip 的同一网站。截图原图经 WebP 压缩保存。

`cdp.py` 是共享浏览器驱动；本轮主结果来自 `verify.py`。运行脚本会写入当前证据目录，复验建议复制目录后运行以保留这一轮证据。
