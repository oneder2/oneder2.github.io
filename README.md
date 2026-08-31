# GWorkspace Resume Client

这是 GWorkspace 公共简历 API 的纯展示与构建客户端。网页、版本化 JSON 和中英文 PDF 都来自同一个接口：

```http
GET https://workspace.gellaronline.cc/api/public/v1/resume
```

本仓库不维护简历事实。姓名、经历、技能、项目和项目媒体应在 GWorkspace 中更新；网页会在访问时读取 `resume_web` surface，静态 JSON 与 PDF 则由 GitHub Actions 在构建时分别读取 `resume_web` 和 `resume_pdf`。

## 本地构建

需要 Node.js 22。构建会访问 GWorkspace API，接口不可用或响应未通过 Schema 校验时会失败：

```bash
npm install
npm run build
npm test
npx serve dist
```

可用命令：

- `npm run sync`：拉取并校验两个 surface，写入 `build/snapshots/`。
- `npm run build`：拉取一次，然后生成快照、LaTeX、站点和静态 JSON。
- `npm run build:snapshot`：只用已有派生快照重建 LaTeX 与站点，不访问 API。
- `npm run generate:tex`：使用已有 `resume_pdf` 快照生成中英文 LaTeX。
- `npm run package`：使用已有快照重建站点，并复制已经编译的 PDF。
- `npm test`：使用临时 mock API 测试解析、构建、缓存和故障行为。

测试或预览其它环境时，可设置 `GWORKSPACE_RESUME_API_URL`。设置 `RESUME_OUTPUT_ROOT` 可以将 `build/` 和 `dist/` 隔离到临时目录。

## 浏览器故障行为

网页始终直接请求 GWorkspace，不会把构建生成的静态 JSON 当作自动回退。请求成功后，浏览器会保存一份带请求地址与 GWorkspace 来源信息的最近成功响应。

- 实时请求成功：显示“来自 GWorkspace 的实时数据”。
- 请求失败且存在匹配的有效缓存：显示缓存内容和保存时间。
- 请求失败且无有效缓存：显示明确的暂时不可用状态与重试按钮。

`build/snapshots/`、`dist/api/v1/snapshots/` 和浏览器缓存都是派生产物，不能手工编辑，也不能作为另一套简历数据维护。

## 静态接口

- `/api/v1/resume.json`：`resume_web` 双语构建快照
- `/api/v1/resume.en.json`、`resume.zh.json`：本地化网页数据
- `/api/v1/resume.pdf.json`：`resume_pdf` 双语构建快照
- `/api/v1/resume.pdf.en.json`、`resume.pdf.zh.json`：本地化 PDF 数据
- `/api/v1/projects.json`、`/projects.json`：由网页 surface 派生的项目兼容接口
- `/api/v1/snapshots/*.json`：包含抓取时间和来源信息的构建记录
- `/api/v1/schema.json`：固定版本的 GWorkspace Resume API Schema

## 部署

推送到 `main` 后，GitHub Actions 会拉取并校验 API 一次，运行测试，使用 XeLaTeX 编译两份 PDF，再从同一批快照打包并发布 GitHub Pages。正式接口必须已经部署并允许 `https://resume.gellaronline.cc` 跨域访问，否则构建或网页运行时会按上述规则失败。
