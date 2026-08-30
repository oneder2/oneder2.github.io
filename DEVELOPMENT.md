# Development

## Architecture

```text
data/resume.yaml
       |
       +-- JSON Schema validation
       +-- api/v1/*.json
       +-- browser-rendered resume
       +-- build/resume-{en,zh}.tex
                  |
                  +-- XeLaTeX PDFs
```

`data/resume.yaml` 是唯一手工维护的内容源。`dist/` 和 `build/` 都是可删除、可重复生成的构建目录，不应提交到 Git。

## Main files

- `schema/resume.schema.json`：字段约束与版本
- `tools/resume-tools.mjs`：校验、API、本地化和 LaTeX 生成
- `templates/resume.tex`：A4 PDF 版式
- `index.html`、`style.css`、`scripts.js`：静态网页源文件
- `.github/workflows/deploy.yml`：PDF 构建与 Pages 部署

## Build commands

```bash
npm run validate      # Validate YAML against JSON Schema
npm run generate:tex  # Generate build/resume-en.tex and resume-zh.tex
npm run build         # Generate TeX, website, API, and copy existing PDFs
npm test              # Test generated outputs
```

## Data rules

- IDs must be stable lowercase slugs. Consumers may use them as external identifiers.
- Do not rename an ID merely to change its display name.
- Do not put private information in the public YAML file.
- All localized values require both `en` and `zh`.
- LaTeX special characters are escaped by the generator; content should remain plain text.
- Increment `schema_version` only when changing the API contract, then add a new versioned API path if compatibility would break.

## PDF behavior

Only featured projects containing `pdf` in `visibility` are included, up to `settings.pdf.project_limit`. Experience and education sections disappear when their arrays are empty. The web renderer follows the same empty-section behavior.
