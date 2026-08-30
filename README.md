# Structured Resume

这是一个由单一 YAML 数据源驱动的双语简历项目。同一份内容会被构建为响应式网站、版本化 JSON API，以及由 XeLaTeX 编译的中英文 PDF。

线上地址：<https://resume.gellaronline.cc>

## 修改简历

所有公开简历内容都在 [`data/resume.yaml`](data/resume.yaml) 中。通常只需要编辑这个文件：

- `profile`：姓名、标题、位置、简介和联系方式
- `skills`：技能分组
- `experience`：工作或个人经历
- `education`：教育经历
- `projects`：制作或参与的项目
- `settings.pdf`：PDF 项目数量及下载文件名

每段可翻译内容使用 `en` 和 `zh` 两个字段。日期使用 `YYYY-MM`；仍在进行的经历将 `end` 设为 `null`。

```yaml
experience:
  - id: example-role
    organization:
      en: Example Studio
      zh: 示例工作室
    title:
      en: Software Developer
      zh: 软件开发工程师
    start: "2025-01"
    end: null
    summary:
      en: Built and maintained web products.
      zh: 负责 Web 产品的开发与维护。
    highlights:
      en:
        - Improved a measurable result by 20%.
      zh:
        - 将某项可衡量指标提升了 20%。
    visibility: [web, pdf, api]
```

`visibility` 只决定内容出现在哪些公开产物中，不提供隐私保护。敏感信息不要提交到本仓库。

## 本地构建

需要 Node.js 22。网站和 API 不要求本机安装 LaTeX。

```bash
npm install
npm run validate
npm run build
npm test
npx serve dist
```

构建结果位于 `dist/`。本地生成 PDF 还需要 XeLaTeX、latexmk 和 Noto CJK 字体：

```bash
npm run generate:tex
latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=build build/resume-en.tex
latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=build build/resume-zh.tex
npm run build
```

## 公开接口

- `/api/v1/resume.json`：完整双语数据
- `/api/v1/resume.en.json`：英文本地化数据
- `/api/v1/resume.zh.json`：中文本地化数据
- `/api/v1/projects.json`：项目兼容接口
- `/api/v1/schema.json`：JSON Schema
- `/projects.json`：旧地址兼容接口

## 部署

推送到 `main` 后，[GitHub Actions](.github/workflows/deploy.yml) 会校验数据、运行测试、使用 XeLaTeX 编译两份 PDF，并将 `dist/` 发布到 GitHub Pages。仓库的 Pages Source 应设置为 **GitHub Actions**。
