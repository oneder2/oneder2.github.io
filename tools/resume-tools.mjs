import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resumePath = path.join(root, 'data', 'resume.yaml');
const schemaPath = path.join(root, 'schema', 'resume.schema.json');
const buildDir = path.join(root, 'build');
const distDir = path.join(root, 'dist');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadResume() {
  const resume = parse(await fs.readFile(resumePath, 'utf8'));
  const schema = await readJson(schemaPath);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  if (!validate(resume)) {
    const messages = validate.errors
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('\n');
    throw new Error(`Resume data is invalid:\n${messages}`);
  }

  for (const collection of ['skills', 'experience', 'education', 'projects']) {
    const ids = resume[collection].map((item) => item.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate ${collection} id: ${[...new Set(duplicates)].join(', ')}`);
    }
  }

  return resume;
}

function localize(value, language) {
  if (Array.isArray(value)) {
    return value.map((item) => localize(item, language));
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 2 && keys.includes('en') && keys.includes('zh')) {
      return localize(value[language], language);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localize(item, language)]),
    );
  }

  return value;
}

function legacyProjects(resume) {
  return {
    projects: resume.projects
      .filter((project) => project.visibility.includes('api'))
      .map((project) => ({
        id: project.id,
        name: project.name.en,
        name_zh: project.name.zh,
        description: project.summary.en,
        description_zh: project.summary.zh,
        technologies: project.technologies,
        technologies_zh: project.technologies,
        github_url: project.links.source ?? null,
        demo_url: project.links.demo ?? null,
        featured: project.featured,
        date: project.start,
      })),
  };
}

function escapeLatex(value = '') {
  const replacements = new Map([
    ['\\', '\\textbackslash{}'],
    ['{', '\\{'],
    ['}', '\\}'],
    ['&', '\\&'],
    ['%', '\\%'],
    ['$', '\\$'],
    ['#', '\\#'],
    ['_', '\\_'],
    ['~', '\\textasciitilde{}'],
    ['^', '\\textasciicircum{}'],
  ]);
  return String(value).replace(/[\\{}&%$#_~^]/g, (character) => replacements.get(character));
}

function escapeUrl(value = '') {
  return String(value).replace(/([%#])/g, '\\$1');
}

function formatDate(value, language) {
  if (!value) return language === 'zh' ? '至今' : 'Present';
  const [year, month] = value.split('-').map(Number);
  if (!month) return String(year);
  if (language === 'zh') return `${year} 年 ${month} 月`;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatRange(entry, language) {
  if (entry.end === entry.start) return formatDate(entry.start, language);
  return `${formatDate(entry.start, language)} -- ${formatDate(entry.end, language)}`;
}

function renderHighlights(highlights, language) {
  if (Array.isArray(highlights)) return '';
  const lines = highlights?.[language] ?? [];
  if (lines.length === 0) return '';
  return [
    '\\begin{itemize}',
    ...lines.map((line) => `  \\item ${escapeLatex(line)}`),
    '\\end{itemize}',
  ].join('\n');
}

function renderTimeline(entries, language) {
  return entries
    .filter((entry) => entry.visibility.includes('pdf'))
    .map((entry) => {
      const location = entry.location ? ` · ${entry.location[language]}` : '';
      return [
        '\\begin{entry}',
        `  {${escapeLatex(entry.title[language])}}`,
        `  {${escapeLatex(formatRange(entry, language))}}`,
        `  {${escapeLatex(entry.organization[language] + location)}}`,
        `  {${escapeLatex(entry.id)}}`,
        entry.summary ? `\\entrysummary{${escapeLatex(entry.summary[language])}}` : '',
        renderHighlights(entry.highlights, language),
        '\\end{entry}',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

function renderProjects(resume, language) {
  const labels = language === 'zh'
    ? { source: '源代码', demo: '在线演示', case_study: '项目详情' }
    : { source: 'Source', demo: 'Live', case_study: 'Case study' };

  return resume.projects
    .filter((project) => project.featured && project.visibility.includes('pdf'))
    .slice(0, resume.settings.pdf.project_limit)
    .map((project) => {
      const links = Object.entries(project.links)
        .map(([kind, url]) => `\\href{${escapeUrl(url)}}{${escapeLatex(labels[kind])}}`)
        .join(' \\textcolor{Rule}{/} ');
      const meta = [project.role?.[language], project.technologies.join(' · ')]
        .filter(Boolean)
        .join(' | ');

      return [
        '\\begin{entry}',
        `  {${escapeLatex(project.name[language])}}`,
        `  {${escapeLatex(formatRange(project, language))}}`,
        `  {${escapeLatex(meta)}}`,
        `  {${escapeLatex(project.id)}}`,
        `\\entrysummary{${escapeLatex(project.summary[language])}}`,
        renderHighlights(project.highlights, language),
        links ? `\\entrylinks{${links}}` : '',
        '\\end{entry}',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

function renderSkills(resume, language) {
  return resume.skills
    .map((group) => `\\skillrow{${escapeLatex(group.name[language])}}{${escapeLatex(group.items.join(' · '))}}`)
    .join('\n');
}

function renderContacts(resume) {
  return resume.profile.contacts
    .map((contact) => `\\href{${escapeUrl(contact.url)}}{${escapeLatex(contact.value)}}`)
    .join(' \\contactsep{} ');
}

function optionalSection(title, body) {
  if (!body.trim()) return '';
  return `\\resumesection{${escapeLatex(title)}}\n${body}`;
}

async function generateTex(resume) {
  const template = await fs.readFile(path.join(root, 'templates', 'resume.tex'), 'utf8');
  const sectionLabels = {
    en: { summary: 'Profile', experience: 'Experience', education: 'Education', skills: 'Skills', projects: 'Selected projects', updated: 'Updated' },
    zh: { summary: '个人简介', experience: '工作经历', education: '教育经历', skills: '专业技能', projects: '精选项目', updated: '更新于' },
  };

  await fs.mkdir(buildDir, { recursive: true });
  for (const language of ['en', 'zh']) {
    const labels = sectionLabels[language];
    const replacements = {
      DOCUMENT_LANGUAGE: language,
      PROFILE_NAME: escapeLatex(resume.profile.name[language]),
      PROFILE_FULL_NAME: escapeLatex(resume.profile.full_name[language]),
      PROFILE_HEADLINE: escapeLatex(resume.profile.headline[language]),
      PROFILE_LOCATION: escapeLatex(resume.profile.location[language]),
      PROFILE_CONTACTS: renderContacts(resume),
      PROFILE_SUMMARY: escapeLatex(resume.profile.summary[language]),
      SECTION_SUMMARY: escapeLatex(labels.summary),
      EXPERIENCE_SECTION: optionalSection(labels.experience, renderTimeline(resume.experience, language)),
      EDUCATION_SECTION: optionalSection(labels.education, renderTimeline(resume.education, language)),
      SECTION_SKILLS: escapeLatex(labels.skills),
      SKILLS: renderSkills(resume, language),
      SECTION_PROJECTS: escapeLatex(labels.projects),
      PROJECTS: renderProjects(resume, language),
      UPDATED_LABEL: escapeLatex(labels.updated),
      UPDATED_DATE: escapeLatex(resume.updated_at),
    };

    const output = Object.entries(replacements).reduce(
      (document, [token, value]) => document.replaceAll(`%%${token}%%`, value),
      template,
    );
    await fs.writeFile(path.join(buildDir, `resume-${language}.tex`), output);
  }
}

async function copyIfFresh(source, destination, dependencies) {
  try {
    const sourceStat = await fs.stat(source);
    const dependencyStats = await Promise.all(
      dependencies.map((dependency) => fs.stat(dependency)),
    );
    if (dependencyStats.some((dependency) => dependency.mtimeMs > sourceStat.mtimeMs)) return;
    await fs.cp(source, destination, { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function buildSite(resume) {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(path.join(distDir, 'api', 'v1'), { recursive: true });
  await fs.mkdir(path.join(distDir, 'downloads'), { recursive: true });

  for (const filename of ['index.html', 'style.css', 'scripts.js', 'CNAME']) {
    await fs.copyFile(path.join(root, filename), path.join(distDir, filename));
  }
  await fs.cp(path.join(root, 'assets'), path.join(distDir, 'assets'), { recursive: true });
  await fs.copyFile(schemaPath, path.join(distDir, 'api', 'v1', 'schema.json'));
  await fs.writeFile(path.join(distDir, '.nojekyll'), '');

  const outputs = new Map([
    ['resume.json', resume],
    ['resume.en.json', localize(resume, 'en')],
    ['resume.zh.json', localize(resume, 'zh')],
  ]);
  for (const [filename, value] of outputs) {
    await fs.writeFile(
      path.join(distDir, 'api', 'v1', filename),
      `${JSON.stringify(value, null, 2)}\n`,
    );
  }

  const legacy = `${JSON.stringify(legacyProjects(resume), null, 2)}\n`;
  await fs.writeFile(path.join(distDir, 'api', 'v1', 'projects.json'), legacy);
  await fs.writeFile(path.join(distDir, 'projects.json'), legacy);

  const pdfDependencies = [
    resumePath,
    path.join(root, 'templates', 'resume.tex'),
    fileURLToPath(import.meta.url),
  ];
  for (const language of ['en', 'zh']) {
    await copyIfFresh(
      path.join(buildDir, `resume-${language}.pdf`),
      path.join(distDir, 'downloads', resume.settings.pdf.filename[language]),
      pdfDependencies,
    );
  }
}

const command = process.argv[2] ?? 'build';

try {
  const resume = await loadResume();
  if (command === 'validate') {
    console.log(`Valid resume schema ${resume.schema_version}: ${resume.projects.length} projects`);
  } else if (command === 'tex') {
    await generateTex(resume);
    console.log('Generated build/resume-en.tex and build/resume-zh.tex');
  } else if (command === 'build') {
    await generateTex(resume);
    await buildSite(resume);
    console.log('Built website and API in dist/');
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
