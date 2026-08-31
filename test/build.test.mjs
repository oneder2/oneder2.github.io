import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    WEB_SURFACE, buildResumeApiUrl, loadResumeCache, localized, nextLanguage,
    projectMedia, saveResumeCache, visibleRecords,
} from '../resume-core.js';
import { createResume, svgForPath } from './fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let server;
let origin;
let outputRoot;

function startServer(handler) {
    return new Promise((resolve) => {
        const instance = http.createServer(handler);
        instance.listen(0, '127.0.0.1', () => {
            resolve({ instance, origin: `http://127.0.0.1:${instance.address().port}` });
        });
    });
}

function runTool(command, env = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, ['tools/resume-tools.mjs', command], {
            cwd: root,
            env: { ...process.env, ...env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
}

async function readJson(relativePath) {
    return JSON.parse(await fs.readFile(path.join(outputRoot, relativePath), 'utf8'));
}

before(async () => {
    outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-client-test-'));
    const started = await startServer((request, response) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname.startsWith('/media/')) {
            response.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'image/svg+xml',
            });
            response.end(svgForPath(url.pathname));
            return;
        }
        if (url.pathname !== '/api/public/v1/resume') {
            response.writeHead(404).end();
            return;
        }
        const payload = createResume(url.searchParams.get('surface'), origin);
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        });
        response.end(JSON.stringify(payload));
    });
    server = started.instance;
    origin = started.origin;
    const result = await runTool('build', {
        GWORKSPACE_RESUME_API_URL: `${origin}/api/public/v1/resume`,
        RESUME_OUTPUT_ROOT: outputRoot,
    });
    assert.equal(result.code, 0, result.stderr);
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(outputRoot, { recursive: true, force: true });
});

test('core localizes content, filters visibility, and deduplicates project media', () => {
    const resume = createResume('resume_web', origin);
    resume.projects.push({ ...resume.projects[0], id: 'project:hidden', status: 'draft' });
    assert.equal(localized(resume.profile.headline, 'zh'), 'API 简历构建者');
    assert.deepEqual(visibleRecords(resume, 'projects').map((item) => item.slug), ['web-only', 'shared']);
    assert.equal(projectMedia(resume.projects[0]).length, 2);
    assert.equal(nextLanguage('en'), 'zh');
    assert.equal(nextLanguage('zh'), 'en');
});

test('browser cache accepts only a matching valid last-known-good response', () => {
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
    const payload = createResume('resume_web', origin);
    const url = buildResumeApiUrl(`${origin}/api/public/v1/resume`, WEB_SURFACE);
    saveResumeCache(storage, 'resume', payload, url, new Date('2026-08-31T13:00:00Z'));
    assert.equal(loadResumeCache(storage, 'resume', url).payload.profile.id, 'profile:owner');
    assert.equal(loadResumeCache(storage, 'resume', `${url}&other=1`), null);
    values.set('resume', JSON.stringify({ cache_version: 1, request_url: url, payload: { schema_version: '0.0.0' } }));
    assert.equal(loadResumeCache(storage, 'resume', url), null);
    assert.equal(values.has('resume'), false);
    const blockedStorage = {
        getItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
    };
    assert.equal(loadResumeCache(blockedStorage, 'resume', url), null);
});

test('build keeps web and PDF surfaces separate and records snapshot provenance', async () => {
    const web = await readJson('dist/api/v1/resume.json');
    const pdf = await readJson('dist/api/v1/resume.pdf.json');
    const webSnapshot = await readJson('build/snapshots/resume_web.json');
    const pdfSnapshot = await readJson('dist/api/v1/snapshots/resume_pdf.json');
    assert.deepEqual(web.projects.map((item) => item.slug), ['web-only', 'shared']);
    assert.deepEqual(pdf.projects.map((item) => item.slug), ['pdf-only', 'shared']);
    assert.equal(webSnapshot.derived, true);
    assert.equal(webSnapshot.payload.surface, 'resume_web');
    assert.equal(pdfSnapshot.derived, true);
    assert.match(webSnapshot.request_url, /surface=resume_web/);
    assert.equal(web.source.system, 'GWorkspace');
});

test('localized JSON and legacy project output are derived from the web response', async () => {
    const english = await readJson('dist/api/v1/resume.en.json');
    const chinese = await readJson('dist/api/v1/resume.zh.json');
    const legacy = await readJson('dist/projects.json');
    assert.equal(english.profile.headline, 'API resume builder');
    assert.equal(chinese.profile.headline, 'API 简历构建者');
    assert.deepEqual(legacy.projects.map((item) => item.slug), ['web-only', 'shared']);
    assert.equal(legacy.projects[0].gallery.length, 2);
});

test('LaTeX uses only the PDF surface and resolves every template token', async () => {
    const source = await fs.readFile(path.join(outputRoot, 'build/resume-en.tex'), 'utf8');
    assert.match(source, /PDF only/);
    assert.match(source, /Shared project/);
    assert.doesNotMatch(source, /Web only/);
    assert.doesNotMatch(source, /%%[A-Z_]+%%/);
});

test('site is a runtime API client and does not use static JSON as browser fallback', async () => {
    const script = await fs.readFile(path.join(outputRoot, 'dist/scripts.js'), 'utf8');
    const config = await fs.readFile(path.join(outputRoot, 'dist/resume-config.js'), 'utf8');
    const html = await fs.readFile(path.join(outputRoot, 'dist/index.html'), 'utf8');
    assert.match(script, /fetch\(requestUrl/);
    assert.doesNotMatch(script, /api\/v1\/resume\.json/);
    assert.match(config, new RegExp(origin.replaceAll('.', '\\.')));
    assert.match(html, /type="module" src="scripts\.js"/);
    assert.match(html, /id="project-lightbox"/);
});

test('surface mismatches fail the build', async () => {
    const started = await startServer((request, response) => {
        const payload = createResume('resume_web', started.origin);
        payload.surface = 'resume_web';
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(payload));
    });
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-invalid-test-'));
    try {
        const result = await runTool('build', {
            GWORKSPACE_RESUME_API_URL: `${started.origin}/api/public/v1/resume`,
            RESUME_OUTPUT_ROOT: temporaryRoot,
        });
        assert.notEqual(result.code, 0);
        assert.match(result.stderr, /Expected resume_pdf, received resume_web/);
    } finally {
        await new Promise((resolve) => started.instance.close(resolve));
        await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('responses outside the pinned Schema fail the build', async () => {
    const started = await startServer((request, response) => {
        const url = new URL(request.url, 'http://localhost');
        const payload = createResume(url.searchParams.get('surface'), started.origin);
        payload.unexpected_field = true;
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(payload));
    });
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-schema-test-'));
    try {
        const result = await runTool('build', {
            GWORKSPACE_RESUME_API_URL: `${started.origin}/api/public/v1/resume`,
            RESUME_OUTPUT_ROOT: temporaryRoot,
        });
        assert.notEqual(result.code, 0);
        assert.match(result.stderr, /must NOT have additional properties/);
    } finally {
        await new Promise((resolve) => started.instance.close(resolve));
        await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('API outage fails the build without a manual fallback', async () => {
    const started = await startServer((_request, response) => {
        response.writeHead(503, { 'Content-Type': 'application/json' });
        response.end('{"error":"unavailable"}');
    });
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-outage-test-'));
    try {
        const result = await runTool('build', {
            GWORKSPACE_RESUME_API_URL: `${started.origin}/api/public/v1/resume`,
            RESUME_OUTPUT_ROOT: temporaryRoot,
        });
        assert.notEqual(result.code, 0);
        assert.match(result.stderr, /HTTP 503/);
        await assert.rejects(fs.access(path.join(temporaryRoot, 'dist', 'api', 'v1', 'resume.json')));
    } finally {
        await new Promise((resolve) => started.instance.close(resolve));
        await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
});
