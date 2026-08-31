const UPDATED_AT = '2026-08-31T12:00:00.000Z';

const localized = (en, zh) => ({ en, zh });

function record(id, surfaces) {
    return { id, status: 'published', surfaces, updated_at: UPDATED_AT };
}

function media(id, origin, name, en, zh) {
    return {
        id,
        url: `${origin}/media/${name}.svg`,
        mime_type: 'image/svg+xml',
        alt: localized(en, zh),
        width: 1200,
        height: 675,
    };
}

function project(id, surfaces, origin, options = {}) {
    const slug = id.replace('project:', '');
    const cover = media(`media:${slug}-cover`, origin, `${slug}-cover`, `${slug} cover`, `${slug} 封面`);
    return {
        ...record(id, surfaces),
        slug,
        name: localized(options.en || slug, options.zh || `${slug} 中文`),
        summary: localized(`${slug} English summary.`, `${slug} 中文简介。`),
        role: options.role === null ? null : localized('Lead developer', '主要开发者'),
        involvement: 'creator',
        start: '2025-01',
        end: null,
        technologies: ['Node.js', 'CSS'],
        highlights: localized([`${slug} English highlight.`], [`${slug} 中文亮点。`]),
        links: { source: `${origin}/source/${slug}` },
        cover,
        gallery: [
            cover,
            media(`media:${slug}-detail`, origin, `${slug}-detail`, `${slug} detail`, `${slug} 细节`),
        ],
        featured: true,
    };
}

export function createResume(surface, origin) {
    const both = ['resume_web', 'resume_pdf'];
    const requested = surface === 'resume_pdf' ? 'resume_pdf' : 'resume_web';
    const projects = requested === 'resume_web'
        ? [
            project('project:web-only', ['resume_web'], origin, { en: 'Web only', zh: '仅网页' }),
            project('project:shared', both, origin, { en: 'Shared project', zh: '共享项目', role: null }),
        ]
        : [
            project('project:pdf-only', ['resume_pdf'], origin, { en: 'PDF only', zh: '仅 PDF' }),
            project('project:shared', both, origin, { en: 'Shared project', zh: '共享项目', role: null }),
        ];
    return {
        schema_version: '1.0.0',
        generated_at: UPDATED_AT,
        source: {
            system: 'GWorkspace',
            canonical_url: `${origin}/api/public/v1/resume`,
            updated_at: UPDATED_AT,
        },
        locale: null,
        surface: requested,
        profile: {
            ...record('profile:owner', both),
            name: localized('Test Owner', '测试站长'),
            full_name: localized('Test Person', '测试人物'),
            headline: localized('API resume builder', 'API 简历构建者'),
            location: localized('New York, US', '美国纽约'),
            summary: localized('Builds structured public software.', '构建结构化公共软件。'),
            avatar: media('media:avatar', origin, 'avatar', 'Test Owner portrait', '测试站长头像'),
            contacts: [{
                ...record('contact:email', both),
                type: 'email',
                label: 'Email',
                value: 'owner@example.test',
                url: 'mailto:owner@example.test',
            }],
        },
        skills: [{
            ...record('skill:web', both),
            name: localized('Engineering', '工程'),
            items: ['JavaScript', 'LaTeX'],
        }],
        experience: [{
            ...record('timeline:experience', both),
            kind: 'employment',
            organization: localized('Example Studio', '示例工作室'),
            title: localized('Developer', '开发者'),
            location: null,
            summary: localized('Built public tools.', '构建公共工具。'),
            highlights: localized(['Shipped an API client.'], ['交付 API 客户端。']),
            start: '2024-02',
            end: null,
            canonical_url: null,
        }],
        education: [],
        projects,
        settings: {
            default_language: 'en',
            pdf: {
                project_limit: 2,
                filename: localized('Test-Resume-EN.pdf', 'Test-Resume-ZH.pdf'),
            },
        },
    };
}

export function svgForPath(pathname) {
    const colors = pathname.includes('detail') ? ['#2457d6', '#d9573f'] : ['#172027', '#dde8e7'];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
        <rect width="1200" height="675" fill="${colors[0]}"/>
        <rect x="76" y="72" width="1048" height="531" fill="${colors[1]}"/>
        <path d="M76 500L380 280l200 145 210-190 334 268v100H76z" fill="#fff" opacity=".78"/>
    </svg>`;
}
