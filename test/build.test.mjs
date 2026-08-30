import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
    return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

test('build publishes the versioned resume API and schema', async () => {
    const resume = await readJson('dist/api/v1/resume.json');
    const schema = await readJson('dist/api/v1/schema.json');
    assert.equal(resume.schema_version, '1.0.0');
    assert.equal(schema.title, 'Gellar structured resume');
    assert.ok(resume.projects.length > 0);
});

test('localized API files contain localized strings', async () => {
    const english = await readJson('dist/api/v1/resume.en.json');
    const chinese = await readJson('dist/api/v1/resume.zh.json');
    assert.equal(typeof english.profile.headline, 'string');
    assert.equal(typeof chinese.profile.headline, 'string');
    assert.notEqual(english.profile.headline, chinese.profile.headline);
});

test('legacy projects endpoint is generated from the canonical resume', async () => {
    const resume = await readJson('dist/api/v1/resume.json');
    const legacy = await readJson('dist/projects.json');
    const publicProjects = resume.projects.filter((project) => project.visibility.includes('api'));
    assert.equal(legacy.projects.length, publicProjects.length);
    assert.deepEqual(legacy.projects.map((project) => project.id), publicProjects.map((project) => project.id));
});

test('LaTeX documents have all template tokens resolved', async () => {
    for (const language of ['en', 'zh']) {
        const source = await fs.readFile(path.join(root, `build/resume-${language}.tex`), 'utf8');
        assert.doesNotMatch(source, /%%[A-Z_]+%%/);
        assert.match(source, /\\begin\{document\}/);
    }
});

test('website consumes the versioned API', async () => {
    const script = await fs.readFile(path.join(root, 'dist/scripts.js'), 'utf8');
    const html = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.match(script, /\.\/api\/v1\/resume\.json/);
    assert.match(html, /id="project-list"/);
});
