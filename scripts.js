const UI = {
    en: {
        navProfile: 'Profile', navExperience: 'Experience', navProjects: 'Projects',
        recordLabel: 'Professional record', downloadPdf: 'Download PDF', updated: 'Updated',
        contact: 'Contact', skills: 'Skills', profile: 'Profile', experience: 'Experience',
        education: 'Education', projects: 'Selected projects', loading: 'Loading resume...',
        loadErrorTitle: 'Resume data could not be loaded.',
        loadErrorBody: 'Run the site through a local web server and try again.',
        footerLabel: 'Structured resume', schemaLabel: 'Schema', present: 'Present',
        source: 'Source', demo: 'Live site', case_study: 'Case study',
        creator: 'Creator', contributor: 'Contributor', collaborator: 'Collaborator',
    },
    zh: {
        navProfile: '简介', navExperience: '经历', navProjects: '项目',
        recordLabel: '职业履历', downloadPdf: '下载 PDF', updated: '更新于',
        contact: '联系方式', skills: '专业技能', profile: '个人简介', experience: '工作经历',
        education: '教育经历', projects: '精选项目', loading: '正在加载简历...',
        loadErrorTitle: '无法加载简历数据。', loadErrorBody: '请通过本地 Web 服务器运行站点后重试。',
        footerLabel: '结构化简历', schemaLabel: '数据规范', present: '至今',
        source: '源代码', demo: '在线访问', case_study: '项目详情',
        creator: '创建者', contributor: '参与者', collaborator: '协作者',
    },
};

const CONTACT_ICONS = {
    email: 'fa-solid fa-envelope', phone: 'fa-solid fa-phone', website: 'fa-solid fa-globe',
    github: 'fa-brands fa-github', linkedin: 'fa-brands fa-linkedin-in',
    location: 'fa-solid fa-location-dot', other: 'fa-solid fa-link',
};

let resume;
let language = new URLSearchParams(window.location.search).get('lang')
    || localStorage.getItem('resume-language') || 'en';
if (!['en', 'zh'].includes(language)) language = 'en';

function localized(value) {
    return value?.[language] ?? '';
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
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
        if (value) node.textContent = value;
    });
    const toggle = document.getElementById('language-toggle');
    toggle.querySelector('span').textContent = language === 'zh' ? 'EN' : '中文';
    toggle.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换到中文');
}

function renderProfile() {
    const profile = resume.profile;
    const name = localized(profile.name);
    document.title = `${name} | ${localized(profile.headline)}`;
    document.getElementById('nav-name').textContent = name;
    document.getElementById('profile-name').textContent = name;
    document.getElementById('footer-name').textContent = name;
    document.getElementById('profile-headline').textContent = localized(profile.headline);
    document.getElementById('profile-location').lastChild.textContent = ` ${localized(profile.location)}`;
    document.getElementById('profile-summary').textContent = localized(profile.summary);
    const avatar = document.getElementById('profile-avatar');
    avatar.src = profile.avatar;
    avatar.alt = language === 'zh' ? `${name} 的照片` : `Portrait of ${name}`;
    document.getElementById('updated-at').textContent = resume.updated_at;
    document.getElementById('record-version').textContent = `v${resume.schema_version}`;
    document.getElementById('footer-version').textContent = `v${resume.schema_version}`;
    document.getElementById('pdf-download').href = `downloads/${resume.settings.pdf.filename[language]}`;
}

function renderContacts() {
    const list = document.getElementById('contact-list');
    list.replaceChildren();
    resume.profile.contacts.forEach((contact) => {
        const item = element('li');
        const link = element('a');
        link.href = contact.url;
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
    resume.skills.forEach((group) => {
        const section = element('section', 'skill-group');
        section.append(element('h3', '', localized(group.name)));
        const items = element('ul', 'skill-items');
        group.items.forEach((skill) => items.append(element('li', '', skill)));
        section.append(items);
        list.append(section);
    });
}

function renderHighlights(parent, highlights) {
    const lines = Array.isArray(highlights) ? highlights : localized(highlights);
    if (!lines?.length) return;
    const list = element('ul', 'highlights');
    lines.forEach((line) => list.append(element('li', '', line)));
    parent.append(list);
}

function renderTimeline(collectionName) {
    const section = document.getElementById(collectionName);
    const entries = resume[collectionName].filter((entry) => entry.visibility.includes('web'));
    section.hidden = entries.length === 0;
    document.querySelector(`[data-section-link="${collectionName}"]`)?.toggleAttribute('hidden', entries.length === 0);
    if (entries.length === 0) return;
    const list = document.getElementById(`${collectionName}-list`);
    list.replaceChildren();
    entries.forEach((entry) => {
        const article = element('article', 'timeline-entry');
        const body = element('div', 'entry-body');
        const heading = element('div', 'entry-heading');
        heading.append(element('h3', '', localized(entry.title)), element('span', 'entry-id', entry.id));
        body.append(heading, element('p', 'entry-organization', localized(entry.organization)));
        if (entry.summary) body.append(element('p', 'entry-summary', localized(entry.summary)));
        renderHighlights(body, entry.highlights);
        article.append(element('time', 'entry-date', formatRange(entry)), body);
        list.append(article);
    });
}

function renderProjects() {
    const list = document.getElementById('project-list');
    list.replaceChildren();
    resume.projects.filter((project) => project.featured && project.visibility.includes('web'))
        .forEach((project) => {
            const article = element('article', 'project-entry');
            const top = element('div', 'project-topline');
            top.append(element('span', 'project-id', project.id), element('time', 'project-date', formatRange(project)));
            const heading = element('div', 'project-heading');
            heading.append(element('h3', '', localized(project.name)));
            if (project.involvement) heading.append(element('span', 'involvement', UI[language][project.involvement]));
            article.append(top, heading, element('p', 'project-summary', localized(project.summary)));
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

function render() {
    renderStaticText();
    renderProfile();
    renderContacts();
    renderSkills();
    renderTimeline('experience');
    renderTimeline('education');
    renderProjects();
    document.getElementById('resume-content').setAttribute('aria-busy', 'false');
}

async function initialize() {
    renderStaticText();
    try {
        const response = await fetch('./api/v1/resume.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        resume = await response.json();
        if (!localStorage.getItem('resume-language') && !new URLSearchParams(window.location.search).has('lang')) {
            language = resume.settings.default_language;
        }
        render();
    } catch (error) {
        console.error('Unable to load resume data:', error);
        document.getElementById('resume-content').hidden = true;
        document.getElementById('load-error').hidden = false;
    }
}

document.getElementById('language-toggle').addEventListener('click', () => {
    language = language === 'en' ? 'zh' : 'en';
    localStorage.setItem('resume-language', language);
    if (resume) render();
    else renderStaticText();
});

initialize();
