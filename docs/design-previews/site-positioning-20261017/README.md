# 整站更新验证证据

2026-10-17，本机静态服务与隔离 Chrome。

- `results.json`：完整浏览器检查结果；`static-checks.json`：源码、生成产物与预算检查。
- `source-sha256.json`：验证时的页面、脚本、样式和元数据快照。
- `screenshots.json`：截图清单；WebP 为缩放压缩后的 review 预览，不属于网站运行资源。
- 伙伴区的四张截图经过即时滚动、图片解码和两帧布局后重新采集，替换了平滑滚动中途的截图。
- `browser-review.py` / `cdp.py`：测试脚本。使用安装了 `websockets` 的 Python 3、隔离 Chrome 的 CDP 端口与现有静态服务运行。默认页面端口 8000、CDP 端口 9233；可通过 `SILL_REVIEW_BASE` / `SILL_REVIEW_CDP` / `SILL_REVIEW_OUTPUT` 覆盖。脚本不会启动或关闭浏览器进程。

```sh
python3 browser-review.py
```

HTML 旧路由回退已实测。托管平台的 HTTP 301 尚未部署验证。性能数值来自本地功能回归，不代表真实网络下的加载时间。
