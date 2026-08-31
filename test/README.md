# Tests

```bash
npm test
```

测试会启动临时 HTTP 服务，生成仅用于测试的有效 GWorkspace 响应，并把全部构建产物写入临时目录。它不会依赖生产 API，也不会覆盖仓库根目录下已有的 `build/` 或 `dist/`。

覆盖范围包括 Schema/API 解析、错误 surface、web/PDF 可见性隔离、中英文本地化、cover/gallery 去重与输出、派生快照来源、PDF surface 的 LaTeX 生成、浏览器最近成功缓存校验，以及 API 中断时禁止本地事实回退。
