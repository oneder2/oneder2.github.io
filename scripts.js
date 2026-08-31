import {
    WEB_SURFACE,
    assertRuntimeResume,
    buildResumeApiUrl,
    loadResumeCache,
    localized,
    localizedLines,
    nextLanguage,
    projectMedia,
    recordVisibleOn,
    saveResumeCache,
    visibleRecords,
} from './resume-core.js';

const UI = {
    en: {
        navProfile: 'Profile', navExperience: 'Experience', navProjects: 'Projects',
        recordLabel: 'Professional record', downloadPdf: 'Download PDF', updated: 'Updated',
        contact: 'Contact', skills: 'Skills', profile: 'Profile', experience: 'Experience',
        education: 'Education', projects: 'Selected projects', loading: 'Loading resume...',
        unavailableTitle: 'Resume temporarily unavailable',
        unavailableBody: 'The source service could not be reached. Try again in a moment.',
        retry: 'Try again', footerLabel: 'Structured resume', schemaLabel: 'Schema',
        present: 'Present', source: 'Source', demo: 'Live site', case_study: 'Case study',
        creator: 'Creator', contributor: 'Contributor', collaborator: 'Collaborator',
        live: 'Live from GWorkspace', cached: 'Saved browser copy', cachedAt: 'Saved',
        galleryOpen: 'Open image', galleryClose: 'Close image viewer',
        galleryPrevious: 'Previous image', galleryNext: 'Next image',
        galleryPosition: (current, total) => `${current} of ${total}`,
    },
    zh: {
        navProfile: '简介', navExperience: '经历', navProjects: '项目',
        recordLabel: '职业履历', downloadPdf: '下载 PDF', updated: '更新于',
        contact: '联系方式', skills: '专业技能', profile: '个人简介', experience: '工作经历',
        education: '教育经历', projects: '精选项目', loading: '正在加载简历...',
        unavailableTitle: '简历暂时不可用',
        unavailableBody: '当前无法连接内容服务，请稍后重试。',
        retry: '重试', footerLabel: '结构化简历', schemaLabel: '数据规范',
        present: '至今', source: '源代码', demo: '在线访问', case_study: '项目详情',
        creator: '创建者', contributor: '参与者', collaborator: '协作者',
        live: '来自 GWorkspace 的实时数据', cached: '浏览器最近保存版本', cachedAt: '保存于',
        galleryOpen: '查看图片', galleryClose: '关闭图片查看器',
        galleryPrevious: '上一张', galleryNext: '下一张',
        galleryPosition: (current, total) => `第 ${current} 张，共 ${total} 张`,
    },
};

const CONTACT_ICONS = {
    email: 'fa-solid fa-envelope', phone: 'fa-solid fa-phone', website: 'fa-solid fa-globe',
    github: 'fa-brands fa-github', linkedin: 'fa-brands fa-linkedin-in',
    location: 'fa-solid fa-location-dot', other: 'fa-solid fa-link',
};

const config = window.RESUME_CLIENT_CONFIG;
const requestUrl = config ? buildResumeApiUrl(config.api_url, WEB_SURFACE) : '';
let resume;
let sourceState = null;
let gallery = [];
let galleryIndex = 0;
const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
let storedLanguage;
try {
    storedLanguage = localStorage.getItem('resume-language');
} catch {
    storedLanguage = null;
}
let hasLanguagePreference = ['en', 'zh'].includes(requestedLanguage)
    || ['en', 'zh'].includes(storedLanguage);
let language = requestedLanguage || storedLanguage || 'en';
if (!['en', 'zh'].includes(language)) language = 'en';

function text(value) {
    return localized(value, language);
}

function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
}

function formatDate(value) {
    if (!value) return UI[language].present;
    const [year, month] = value.split('-').map(Number);
    if (!month) return String(year);
    if (language === 'zh') return `${year}.${String(month).padStart(2, '0')}`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatRange(entry) {
    if (entry.start === entry.end) return formatDate(entry.start);
    return `${formatDate(entry.start)} - ${formatDate(entry.end)}`;
}

function renderStaticText() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-ui]').forEach((node) => {
        const value = UI[language][node.dataset.ui];
        if (typeof value === 'string') node.textContent = value;
    });
    document.querySelectorAll('[data-ui-title]').forEach((node) => {
        const value = UI[language][node.dataset.uiTitle];
        if (typeof value === 'string') {
            node.title = value;
            node.setAttribute('aria-label', value);
        }
    });
    document.getElementById('lightbox-previous').setAttribute('aria-label', UI[language].galleryPrevious);
    document.getElementById('lightbox-previous').title = UI[language].galleryPrevious;
    document.getElementById('lightbox-next').setAttribute('aria-label', UI[language].galleryNext);
    document.getElementById('lightbox-next').title = UI[language].galleryNext;
    const toggle = document.getElementById('language-toggle');
    toggle.querySelector('span').textContent = language === 'zh' ? 'EN' : '中文';
    toggle.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换到中文');
}

function renderSourceState() {
    const status = document.getElementById('source-status');
    status.dataset.state = sourceState.kind;
    status.replaceChildren();
    status.append(element('span', 'status-dot'));
    const label = sourceState.kind === 'live' ? UI[language].live : UI[language].cached;
    const copy = element('span', 'status-copy', label);
    if (sourceState.kind === 'cached') {
        const saved = new Date(sourceState.cachedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
        copy.append(element('small', '', `${UI[language].cachedAt} ${saved}`));
    }
    status.append(copy);
}

function renderProfile() {
    const profile = resume.profile;
    const name = text(profile.name);
    document.title = `${name} | ${text(profile.headline)}`;
    document.querySelector('meta[name="description"]').content = text(profile.summary);
    document.getElementById('nav-name').textContent = name;
    document.querySelector('.wordmark-mark').textContent = name.trim().charAt(0).toUpperCase() || 'R';
    document.querySelector('.wordmark').setAttribute('aria-label', name);
    document.getElementById('profile-name').textContent = name;
    document.getElementById('footer-name').textContent = name;
    document.getElementById('profile-headline').textContent = text(profile.headline);
    const location = document.getElementById('profile-location');
    location.replaceChildren(element('i', 'fa-solid fa-location-dot'), document.createTextNode(` ${text(profile.location)}`));
    location.firstChild.setAttribute('aria-hidden', 'true');
    document.getElementById('profile-summary').textContent = text(profile.summary);
    const figure = document.getElementById('profile-portrait');
    if (profile.avatar) {
        const avatar = document.getElementById('profile-avatar');
        avatar.src = profile.avatar.url;
        avatar.alt = text(profile.avatar.alt) || name;
        if (profile.avatar.width) avatar.width = profile.avatar.width;
        if (profile.avatar.height) avatar.height = profile.avatar.height;
        figure.hidden = false;
    } else {
        figure.hidden = true;
    }
    document.getElementById('updated-at').textContent = resume.source.updated_at.slice(0, 10);
    document.getElementById('record-version').textContent = `v${resume.schema_version}`;
    document.getElementById('footer-version').textContent = `v${resume.schema_version}`;
    document.getElementById('pdf-download').href = `downloads/${text(resume.settings.pdf.filename)}`;
}

function renderContacts() {
    const list = document.getElementById('contact-list');
    list.replaceChildren();
    const contacts = resume.profile.contacts.filter((contact) => recordVisibleOn(contact, WEB_SURFACE));
    contacts.forEach((contact) => {
        const item = element('li');
        const link = element('a');
        link.href = contact.url;
        link.title = contact.label;
        if (!contact.url.startsWith('mailto:') && !contact.url.startsWith('tel:')) {
            link.target = '_blank';
            link.rel = 'noreferrer';
        }
        const icon = element('i', CONTACT_ICONS[contact.type] || CONTACT_ICONS.other);
        icon.setAttribute('aria-hidden', 'true');
        link.append(icon, element('span', '', contact.value));
        item.append(link);
        list.append(item);
    });
}

function renderSkills() {
    const list = document.getElementById('skills-list');
    list.replaceChildren();
    visibleRecords(resume, 'skills').forEach((group) => {
        const section = element('section', 'skill-group');
        section.append(element('h3', '', text(group.name)));
        const items = element('ul', 'skill-items');
        group.items.forEach((skill) => items.append(element('li', '', skill)));
        section.append(items);
        list.append(section);
    });
}

function renderHighlights(parent, highlights) {
    const lines = localizedLines(highlights, language);
    if (!lines.length) return;
    const list = element('ul', 'highlights');
    lines.forEach((line) => list.append(element('li', '', line)));
    parent.append(list);
}

function renderTimeline(collectionName) {
    const section = document.getElementById(collectionName);
    const entries = visibleRecords(resume, collectionName);
    section.hidden = entries.length === 0;
    document.querySelector(`[data-section-link="${collectionName}"]`)?.toggleAttribute('hidden', entries.length === 0);
    const list = document.getElementById(`${collectionName}-list`);
    list.replaceChildren();
    entries.forEach((entry) => {
        const article = element('article', 'timeline-entry');
        const body = element('div', 'entry-body');
        const heading = element('div', 'entry-heading');
        heading.append(element('h3', '', text(entry.title)), element('span', 'entry-id', entry.id));
        const organization = [text(entry.organization), text(entry.location)].filter(Boolean).join(' · ');
        body.append(heading, element('p', 'entry-organization', organization));
        if (text(entry.summary)) body.append(element('p', 'entry-summary', text(entry.summary)));
        renderHighlights(body, entry.highlights);
        article.append(element('time', 'entry-date', formatRange(entry)), body);
        list.append(article);
    });
}

function mediaAlt(media, project) {
    return text(media.alt) || text(project.name);
}

function updateLightbox() {
    const item = gallery[galleryIndex];
    const image = document.getElementById('lightbox-image');
    image.src = item.media.url;
    image.alt = mediaAlt(item.media, item.project);
    document.getElementById('lightbox-caption').textContent = mediaAlt(item.media, item.project);
    document.getElementById('lightbox-position').textContent = UI[language].galleryPosition(galleryIndex + 1, gallery.length);
    const hasMany = gallery.length > 1;
    document.getElementById('lightbox-previous').hidden = !hasMany;
    document.getElementById('lightbox-next').hidden = !hasMany;
}

function openLightbox(items, index) {
    gallery = items;
    galleryIndex = index;
    updateLightbox();
    document.getElementById('project-lightbox').showModal();
}

function renderProjectMedia(article, project) {
    const items = projectMedia(project).map((media) => ({ media, project }));
    if (!items.length) return;
    const strip = element('div', 'project-media');
    items.forEach(({ media }, index) => {
        const button = element('button', index === 0 ? 'media-button media-cover' : 'media-button media-thumbnail');
        button.type = 'button';
        button.setAttribute('aria-label', `${UI[language].galleryOpen}: ${mediaAlt(media, project)}`);
        const image = element('img');
        image.src = media.url;
        image.alt = mediaAlt(media, project);
        image.loading = index === 0 ? 'eager' : 'lazy';
        image.decoding = 'async';
        if (media.width) image.width = media.width;
        if (media.height) image.height = media.height;
        button.append(image);
        button.addEventListener('click', () => openLightbox(items, index));
        strip.append(button);
    });
    article.append(strip);
}

function renderProjects() {
    const list = document.getElementById('project-list');
    list.replaceChildren();
    visibleRecords(resume, 'projects').filter((project) => project.featured).forEach((project) => {
        const article = element('article', 'project-entry');
        const top = element('div', 'project-topline');
        top.append(element('span', 'project-id', project.slug), element('time', 'project-date', formatRange(project)));
        const heading = element('div', 'project-heading');
        heading.append(element('h3', '', text(project.name)));
        if (project.involvement) heading.append(element('span', 'involvement', UI[language][project.involvement]));
        article.append(top, heading);
        if (text(project.role)) article.append(element('p', 'project-role', text(project.role)));
        article.append(element('p', 'project-summary', text(project.summary)));
        renderProjectMedia(article, project);
        renderHighlights(article, project.highlights);
        const meta = element('div', 'project-meta');
        const tech = element('ul', 'tech-list');
        project.technologies.forEach((item) => tech.append(element('li', '', item)));
        meta.append(tech);
        const links = element('div', 'project-links');
        Object.entries(project.links).forEach(([type, url]) => {
            const link = element('a', '', UI[language][type]);
            link.href = url;
            link.target = '_blank';
            link.rel = 'noreferrer';
            const icon = element('i', type === 'source' ? 'fa-brands fa-github' : 'fa-solid fa-arrow-up-right-from-square');
            icon.setAttribute('aria-hidden', 'true');
            link.prepend(icon);
            links.append(link);
        });
        if (links.children.length) meta.append(links);
        article.append(meta);
        list.append(article);
    });
}

function renderResume() {
    renderStaticText();
    renderSourceState();
    renderProfile();
    renderContacts();
    renderSkills();
    renderTimeline('experience');
    renderTimeline('education');
    renderProjects();
    document.getElementById('resume-shell').hidden = false;
    document.getElementById('loading-state').hidden = true;
    document.getElementById('unavailable').hidden = true;
    document.getElementById('resume-content').setAttribute('aria-busy', 'false');
}

function showUnavailable() {
    renderStaticText();
    document.title = UI[language].unavailableTitle;
    document.getElementById('loading-state').hidden = true;
    document.getElementById('resume-shell').hidden = true;
    document.getElementById('unavailable').hidden = false;
    document.getElementById('retry').disabled = false;
}

async function fetchResume() {
    if (!config || !requestUrl) throw new Error('Resume client config is unavailable');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.request_timeout_ms);
    try {
        const response = await fetch(requestUrl, {
            credentials: 'omit',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`GWorkspace returned HTTP ${response.status}`);
        return assertRuntimeResume(await response.json(), WEB_SURFACE);
    } finally {
        clearTimeout(timeout);
    }
}

async function load() {
    document.getElementById('unavailable').hidden = true;
    try {
        resume = await fetchResume();
        if (!hasLanguagePreference && ['en', 'zh'].includes(resume.settings.default_language)) {
            language = resume.settings.default_language;
        }
        try {
            saveResumeCache(localStorage, config.cache_key, resume, requestUrl);
        } catch (error) {
            console.warn('Resume cache could not be saved:', error.message);
        }
        sourceState = { kind: 'live' };
        renderResume();
    } catch (error) {
        console.warn('Live resume unavailable:', error.message);
        const cached = config ? loadResumeCache(localStorage, config.cache_key, requestUrl) : null;
        if (cached) {
            resume = cached.payload;
            sourceState = { kind: 'cached', cachedAt: cached.cached_at };
            renderResume();
        } else {
            showUnavailable();
        }
    }
}

document.getElementById('language-toggle').addEventListener('click', () => {
    language = nextLanguage(language);
    hasLanguagePreference = true;
    try {
        localStorage.setItem('resume-language', language);
    } catch {
        // Language switching remains available when persistent storage is blocked.
    }
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    history.replaceState({}, '', url);
    if (resume) renderResume();
    else showUnavailable();
});

document.getElementById('retry').addEventListener('click', (event) => {
    event.currentTarget.disabled = true;
    load();
});

const lightbox = document.getElementById('project-lightbox');
document.getElementById('lightbox-close').addEventListener('click', () => lightbox.close());
document.getElementById('lightbox-previous').addEventListener('click', () => {
    galleryIndex = (galleryIndex - 1 + gallery.length) % gallery.length;
    updateLightbox();
});
document.getElementById('lightbox-next').addEventListener('click', () => {
    galleryIndex = (galleryIndex + 1) % gallery.length;
    updateLightbox();
});
lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
});
lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' && gallery.length > 1) {
        galleryIndex = (galleryIndex - 1 + gallery.length) % gallery.length;
        updateLightbox();
    }
    if (event.key === 'ArrowRight' && gallery.length > 1) {
        galleryIndex = (galleryIndex + 1) % gallery.length;
        updateLightbox();
    }
});

renderStaticText();
load();
