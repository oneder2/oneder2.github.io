# Development

## Architecture

```text
GWorkspace GET /api/public/v1/resume
          |
          +-- surface=resume_web --+-- runtime browser render + browser LKG cache
          |                        +-- derived snapshot + static web JSON
          |
          +-- surface=resume_pdf ------ derived snapshot + XeLaTeX PDFs
```

GWorkspace 是 profile、contacts、skills、experience、education 和 projects 的唯一事实来源。仓库只维护客户端代码、API 地址、固定 Schema 和版式。项目 `cover` 与 `gallery` 使用 API 返回的绝对媒体 URL。

## Main files

- `config/resume-client.json`：API 地址、Schema 版本、浏览器缓存键和超时；不含简历事实。
- `schema/resume.schema.json`：GWorkspace public resume v1 响应约束。
- `resume-core.js`：Node 与浏览器共享的本地化、可见性、媒体和缓存规则。
- `tools/resume-tools.mjs`：API 拉取、Schema 校验、派生快照、JSON 和 LaTeX 构建。
- `templates/resume.tex`：A4 PDF 版式。
- `index.html`、`style.css`、`scripts.js`：GitHub Pages 客户端。
- `.github/workflows/deploy.yml`：单次同步、测试、PDF 编译与 Pages 部署。

## Build lifecycle

`npm run build` 并行请求 `resume_web` 与 `resume_pdf`，对完整响应执行 JSON Schema 校验，并额外拒绝以下情况：

- `schema_version`、`source.system` 或 `surface` 不匹配；
- 响应不是双语形式；
- 任一公开记录不是 `published`，或不包含请求的 surface；
- 同一集合中存在重复 ID。

通过校验后才会写入 `build/snapshots/`。每份快照包含 `derived: true`、抓取时间、请求 URL、Schema 版本、GWorkspace 来源和原始 payload。

`npm run build:snapshot` 和 `npm run package` 不联网，但仍会重新校验快照。它们只用于同一次 CI 任务中复用已验证响应；快照目录被 Git 忽略，不接受人工维护。

## PDF behavior

LaTeX 只读取 `resume_pdf` 快照，并按 GWorkspace 返回顺序选择 featured projects，再应用 `settings.pdf.project_limit`。下载文件名也来自 `settings.pdf.filename`。空经历或教育集合不会生成对应章节。

本地编译需要 XeLaTeX、latexmk、Noto CJK 和 TeX Gyre 字体：

```bash
npm run build
latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=build build/resume-en.tex
latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=build build/resume-zh.tex
npm run package
```

## Content changes

不要在本仓库添加或编辑简历事实、头像或项目图片。内容变更应发布到 GWorkspace；客户端只需要在 API contract 或展示逻辑变化时修改。
