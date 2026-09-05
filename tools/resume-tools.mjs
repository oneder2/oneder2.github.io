import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  PDF_SURFACE, SUPPORTED_SCHEMA_VERSION, WEB_SURFACE, buildResumeApiUrl,
  localized, localizedLines, recordVisibleOn, visibleRecords,
} from '../resume-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.resolve(process.env.RESUME_OUTPUT_ROOT || root);
const schemaPath = path.join(root, 'schema', 'resume.schema.json');
const configPath = path.join(root, 'config', 'resume-client.json');
const buildDir = path.join(outputRoot, 'build');
const snapshotDir = path.join(buildDir, 'snapshots');
const distDir = path.join(outputRoot, 'dist');
const surfaces = [WEB_SURFACE, PDF_SURFACE];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadContext() {
  const [schema, fileConfig] = await Promise.all([readJson(schemaPath), readJson(configPath)]);
  const config = {
    ...fileConfig,
    api_url: process.env.GWORKSPACE_RESUME_API_URL || fileConfig.api_url,
  };
  if (config.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(`Client config requires unsupported schema ${config.schema_version}`);
  }
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return { config, validateSchema: ajv.compile(schema) };
}

function publicRecords(payload) {
  return [
    payload.profile,
    ...(payload.profile?.contacts || []),
    ...payload.skills,
    ...payload.experience,
    ...payload.education,
    ...payload.projects,
  ];
}

function validatePayload(payload, expectedSurface, validateSchema) {
  if (!validateSchema(payload)) {
    const messages = validateSchema.errors
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('\n');
    throw new Error(`GWorkspace ${expectedSurface} response is invalid:\n${messages}`);
  }
  if (payload.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(`Unsupported resume schema: ${payload.schema_version}`);
  }
  if (payload.source.system !== 'GWorkspace') {
    throw new Error('Resume response source.system must be GWorkspace');
  }
  if (payload.surface !== expectedSurface) {
    throw new Error(`Expected ${expectedSurface}, received ${payload.surface}`);
  }
  if (payload.locale !== null) {
    throw new Error('Build requires a bilingual response with locale=null');
  }
  for (const record of publicRecords(payload)) {
    if (!recordVisibleOn(record, expectedSurface)) {
      throw new Error(`Record ${record?.id ?? '(missing id)'} is not published on ${expectedSurface}`);
    }
  }
  for (const collection of ['skills', 'experience', 'education', 'projects']) {
    const ids = payload[collection].map((item) => item.id);
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) throw new Error(`Duplicate ${collection} id: ${duplicate}`);
  }
  return payload;
}

async function fetchSurface(config, validateSchema, surface) {
  const requestUrl = buildResumeApiUrl(config.api_url, surface);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.request_timeout_ms);
  let response;
  try {
    response = await fetch(requestUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'request timed out' : error.message;
    throw new Error(`Could not fetch ${surface} from GWorkspace: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Could not fetch ${surface} from GWorkspace: HTTP ${response.status}`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`GWorkspace ${surface} response is not valid JSON`);
  }
  return { payload: validatePayload(payload, surface, validateSchema), requestUrl };
}

function createSnapshot(payload, requestUrl) {
  return {
    derived: true,
    fetched_at: new Date().toISOString(),
    request_url: requestUrl,
    schema_version: payload.schema_version,
    source: payload.source,
    payload,
  };
}

function validateSnapshotSet(snapshots) {
  const webFilenames = snapshots[WEB_SURFACE].payload.settings.pdf.filename;
  const pdfFilenames = snapshots[PDF_SURFACE].payload.settings.pdf.filename;
  for (const language of ['en', 'zh']) {
    if (localized(webFilenames, language) !== localized(pdfFilenames, language)) {
      throw new Error(`PDF filename for ${language} differs between resume_web and resume_pdf`);
    }
  }
  return snapshots;
}

async function syncSnapshots(context) {
  const fetched = await Promise.all(
    surfaces.map((surface) => fetchSurface(context.config, context.validateSchema, surface)),
  );
  const snapshots = validateSnapshotSet(Object.fromEntries(
    fetched.map(({ payload, requestUrl }) => [payload.surface, createSnapshot(payload, requestUrl)]),
  ));
  await Promise.all(surfaces.map((surface) => writeJson(
    path.join(snapshotDir, `${surface}.json`), snapshots[surface],
  )));
  return snapshots;
}

async function loadSnapshots(context) {
  const entries = await Promise.all(surfaces.map(async (surface) => {
    const filePath = path.join(snapshotDir, `${surface}.json`);
    const snapshot = await readJson(filePath);
    if (snapshot.derived !== true || snapshot.schema_version !== SUPPORTED_SCHEMA_VERSION) {
      throw new Error(`Invalid derived snapshot: ${filePath}`);
    }
    validatePayload(snapshot.payload, surface, context.validateSchema);
    if (snapshot.source?.canonical_url !== snapshot.payload.source.canonical_url) {
      throw new Error(`Snapshot provenance does not match its payload: ${filePath}`);
    }
    return [surface, snapshot];
  }));
  return validateSnapshotSet(Object.fromEntries(entries));
}

function localize(value, language) {
  if (Array.isArray(value)) return value.map((item) => localize(item, language));
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 2 && keys.includes('en') && keys.includes('zh')) {
      return localize(value[language], language);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item, language)]));
  }
  return value;
}

function legacyProjects(resume) {
  return {
    source: resume.source,
    schema_version: resume.schema_version,
    projects: visibleRecords(resume, 'projects').map((project) => ({
      id: project.id,
      slug: project.slug,
      name: localized(project.name, 'en'),
      name_zh: localized(project.name, 'zh'),
      description: localized(project.summary, 'en'),
      description_zh: localized(project.summary, 'zh'),
      technologies: project.technologies,
      technologies_zh: project.technologies,
      github_url: project.links.source ?? null,
      demo_url: project.links.demo ?? null,
      cover: project.cover,
      gallery: project.gallery,
      featured: project.featured,
      date: project.start,
    })),
  };
}

function escapeLatex(value = '') {
  const replacements = new Map([
    ['\\', '\\textbackslash{}'], ['{', '\\{'], ['}', '\\}'], ['&', '\\&'],
    ['%', '\\%'], ['$', '\\$'], ['#', '\\#'], ['_', '\\_'],
    ['~', '\\textasciitilde{}'], ['^', '\\textasciicircum{}'],
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
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatRange(entry, language) {
  if (entry.end === entry.start) return formatDate(entry.start, language);
  return `${formatDate(entry.start, language)} -- ${formatDate(entry.end, language)}`;
}

function renderHighlights(highlights, language, limit = Number.POSITIVE_INFINITY) {
  const lines = localizedLines(highlights, language).slice(0, limit);
  if (lines.length === 0) return '';
  return ['\\begin{itemize}', ...lines.map((line) => `  \\item ${escapeLatex(line)}`), '\\end{itemize}'].join('\n');
}

function renderTimeline(entries, language) {
  return entries.map((entry) => {
    const location = entry.location ? ` · ${localized(entry.location, language)}` : '';
    return [
      '\\begin{entry}',
      `  {${escapeLatex(localized(entry.title, language))}}`,
      `  {${escapeLatex(formatRange(entry, language))}}`,
      `  {${escapeLatex(localized(entry.organization, language) + location)}}`,
      '  {}',
      `\\entrysummary{${escapeLatex(localized(entry.summary, language))}}`,
      renderHighlights(entry.highlights, language),
      '\\end{entry}',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

function renderProjects(resume, language) {
  const labels = language === 'zh'
    ? { source: '源代码', demo: '在线演示', case_study: '项目详情' }
    : { source: 'Source', demo: 'Live', case_study: 'Case study' };
  return resume.projects
    .filter((project) => project.featured)
    .slice(0, resume.settings.pdf.project_limit)
    .map((project) => {
      const links = Object.entries(project.links)
        .map(([kind, url]) => `\\href{${escapeUrl(url)}}{${escapeLatex(labels[kind])}}`)
        .join(' \\textcolor{Rule}{/} ');
      const meta = [localized(project.role, language), project.technologies.join(' · ')]
        .filter(Boolean).join(' | ');
      return [
        '\\begin{entry}',
        `  {${escapeLatex(localized(project.name, language))}}`,
        `  {${escapeLatex(formatRange(project, language))}}`,
        `  {${escapeLatex(meta)}}`,
        '  {}',
        `\\entrysummary{${escapeLatex(localized(project.summary, language))}}`,
        renderHighlights(project.highlights, language, 1),
        links ? `\\entrylinks{${links}}` : '',
        '\\end{entry}',
      ].filter(Boolean).join('\n');
    }).join('\n\n');
}

function renderSkills(resume, language) {
  return resume.skills
    .map((group) => `\\skillrow{${escapeLatex(localized(group.name, language))}}{${escapeLatex(group.items.join(' · '))}}`)
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
      PROFILE_NAME: escapeLatex(localized(resume.profile.name, language)),
      PROFILE_FULL_NAME: escapeLatex(localized(resume.profile.full_name, language)),
      PROFILE_HEADLINE: escapeLatex(localized(resume.profile.headline, language)),
      PROFILE_LOCATION: escapeLatex(localized(resume.profile.location, language)),
      PROFILE_CONTACTS: renderContacts(resume),
      PROFILE_SUMMARY: escapeLatex(localized(resume.profile.summary, language)),
      SECTION_SUMMARY: escapeLatex(labels.summary),
      EXPERIENCE_SECTION: optionalSection(labels.experience, renderTimeline(resume.experience, language)),
      EDUCATION_SECTION: optionalSection(labels.education, renderTimeline(resume.education, language)),
      SECTION_SKILLS: escapeLatex(labels.skills),
      SKILLS: renderSkills(resume, language),
      SECTION_PROJECTS: escapeLatex(labels.projects),
      PROJECTS: renderProjects(resume, language),
      UPDATED_LABEL: escapeLatex(labels.updated),
      UPDATED_DATE: escapeLatex(resume.source.updated_at.slice(0, 10)),
    };
    const output = Object.entries(replacements).reduce(
      (document, [token, value]) => document.replaceAll(`%%${token}%%`, value),
      template,
    );
    await fs.writeFile(path.join(buildDir, `resume-${language}.tex`), output);
  }
}

async function copyPdfFiles(pdfResume) {
  for (const language of ['en', 'zh']) {
    const source = path.join(buildDir, `resume-${language}.pdf`);
    const filename = localized(pdfResume.settings.pdf.filename, language);
    await fs.copyFile(source, path.join(distDir, 'downloads', filename));
  }
}

async function buildSite(snapshots, config, includePdfs = false) {
  const webResume = snapshots[WEB_SURFACE].payload;
  const pdfResume = snapshots[PDF_SURFACE].payload;
  const runtimeApiUrl = new URL(snapshots[WEB_SURFACE].request_url);
  runtimeApiUrl.searchParams.delete('surface');
  await fs.rm(distDir, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(path.join(distDir, 'api', 'v1', 'snapshots'), { recursive: true }),
    fs.mkdir(path.join(distDir, 'downloads'), { recursive: true }),
  ]);
  for (const filename of ['index.html', 'style.css', 'scripts.js', 'resume-core.js', 'CNAME']) {
    await fs.copyFile(path.join(root, filename), path.join(distDir, filename));
  }
  await fs.copyFile(schemaPath, path.join(distDir, 'api', 'v1', 'schema.json'));
  await fs.writeFile(path.join(distDir, '.nojekyll'), '');
  const runtimeConfig = {
    api_url: runtimeApiUrl.toString(),
    schema_version: config.schema_version,
    cache_key: config.cache_key,
    request_timeout_ms: config.request_timeout_ms,
  };
  await fs.writeFile(
    path.join(distDir, 'resume-config.js'),
    `window.RESUME_CLIENT_CONFIG = Object.freeze(${JSON.stringify(runtimeConfig, null, 2)});\n`,
  );
  const outputs = new Map([
    ['resume.json', webResume],
    ['resume.en.json', localize(webResume, 'en')],
    ['resume.zh.json', localize(webResume, 'zh')],
    ['resume.pdf.json', pdfResume],
    ['resume.pdf.en.json', localize(pdfResume, 'en')],
    ['resume.pdf.zh.json', localize(pdfResume, 'zh')],
  ]);
  await Promise.all([...outputs].map(([filename, value]) => writeJson(
    path.join(distDir, 'api', 'v1', filename), value,
  )));
  await Promise.all(surfaces.map((surface) => writeJson(
    path.join(distDir, 'api', 'v1', 'snapshots', `${surface}.json`), snapshots[surface],
  )));
  const legacy = legacyProjects(webResume);
  await Promise.all([
    writeJson(path.join(distDir, 'api', 'v1', 'projects.json'), legacy),
    writeJson(path.join(distDir, 'projects.json'), legacy),
  ]);
  if (includePdfs) await copyPdfFiles(pdfResume);
}

const command = process.argv[2] ?? 'build';

try {
  const context = await loadContext();
  if (command === 'validate') {
    const snapshots = await syncSnapshots(context);
    console.log(`Validated GWorkspace schema ${SUPPORTED_SCHEMA_VERSION}: ${snapshots[WEB_SURFACE].payload.projects.length} web projects, ${snapshots[PDF_SURFACE].payload.projects.length} PDF projects`);
  } else if (command === 'sync') {
    await syncSnapshots(context);
    console.log(`Saved derived GWorkspace snapshots in ${snapshotDir}`);
  } else if (command === 'tex') {
    const snapshots = await loadSnapshots(context);
    await generateTex(snapshots[PDF_SURFACE].payload);
    console.log(`Generated ${path.join(buildDir, 'resume-en.tex')} and resume-zh.tex`);
  } else if (command === 'build') {
    const snapshots = await syncSnapshots(context);
    await generateTex(snapshots[PDF_SURFACE].payload);
    await buildSite(snapshots, context.config);
    console.log(`Built website and API in ${distDir}`);
  } else if (command === 'build-snapshot') {
    const snapshots = await loadSnapshots(context);
    await generateTex(snapshots[PDF_SURFACE].payload);
    await buildSite(snapshots, context.config);
    console.log(`Built website and API from derived snapshots in ${distDir}`);
  } else if (command === 'package') {
    const snapshots = await loadSnapshots(context);
    await buildSite(snapshots, context.config, true);
    console.log(`Packaged website, JSON, and available PDFs in ${distDir}`);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
