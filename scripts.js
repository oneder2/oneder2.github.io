/*
 * 极简风个人简历JavaScript
 * 
 * 功能模块：
 * 1. GitHub项目加载
 * 2. 双语切换系统
 * 3. 平滑滚动导航
 * 4. 响应式交互
 * 
 * 设计理念：
 * - 专注于内容展示，减少复杂交互
 * - 优雅的错误处理
 * - 性能优化
 */

// 全局变量
const GITHUB_USERNAME = 'oneder2';
const REPOS_PER_PAGE = 6;
let currentLang = 'en';

/**
 * 从静态JSON文件加载项目数据
 * 功能：读取本地项目数据文件并展示在简历中
 */
async function loadProjects() {
    const projectList = document.getElementById('project-list');
    
    try {
        // 显示加载状态
        projectList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                ${currentLang === 'zh' ? '正在加载项目...' : 'Loading projects...'}
            </div>
        `;

        // 获取静态项目数据
        const response = await fetch('./projects.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const projects = data.projects.filter(project => project.featured);
        
        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-info-circle"></i>
                    ${currentLang === 'zh' ? '暂无精选项目' : 'No featured projects found'}
                </div>
            `;
            return;
        }

        // 渲染项目列表
        const projectsHTML = projects.map(project => createProjectHTML(project)).join('');
        projectList.innerHTML = projectsHTML;
        
    } catch (error) {
        console.error('Error loading projects:', error);
        projectList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${currentLang === 'zh' ? '加载项目时出错，请稍后重试' : 'Error loading projects, please try again later'}
            </div>
        `;
    }
}

/**
 * 创建单个项目的HTML结构
 * @param {Object} project - 项目对象
 * @returns {string} HTML字符串
 */
function createProjectHTML(project) {
    const name = currentLang === 'zh' ? project.name_zh : project.name;
    const description = currentLang === 'zh' ? project.description_zh : project.description;
    const technologies = currentLang === 'zh' ? project.technologies_zh : project.technologies;
    const technologiesText = technologies.join(' • ');
    
    return `
        <div class="project-item">
            <h3>${name}</h3>
            <p>${description}</p>
            <div class="project-meta">
                <span class="technologies">${technologiesText}</span>
                <span class="date">${currentLang === 'zh' ? '完成于' : 'Completed'} ${project.date}</span>
            </div>
            <div class="project-links">
                <a href="${project.github_url}" target="_blank" class="project-link">
                    <i class="fab fa-github"></i> ${currentLang === 'zh' ? '查看代码' : 'View Code'}
                </a>
                ${project.demo_url ? `
                    <a href="${project.demo_url}" target="_blank" class="project-link">
                        <i class="fas fa-external-link-alt"></i> ${currentLang === 'zh' ? '在线预览' : 'Live Demo'}
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * 初始化语言系统
 * 功能：设置默认语言，绑定语言切换事件
 */
function initLanguageSystem() {
    // 从localStorage读取语言偏好
    const savedLang = localStorage.getItem('resume-language');
    if (savedLang) {
        currentLang = savedLang;
    }
    
    // 更新页面语言
    updateLanguage(currentLang);
    updateLanguageButton(currentLang);
    
    // 绑定语言切换事件
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'zh' : 'en';
            updateLanguage(currentLang);
            updateLanguageButton(currentLang);
            localStorage.setItem('resume-language', currentLang);
            
            // 重新加载项目以更新语言
            loadProjects();
        });
    }
}

/**
 * 更新页面语言
 * @param {string} language - 目标语言 ('en' 或 'zh')
 */
function updateLanguage(language) {
    // 更新所有带有data-en和data-zh属性的元素
    const elements = document.querySelectorAll('[data-en][data-zh]');
    elements.forEach(element => {
        const text = element.getAttribute(`data-${language}`);
        if (text) {
            element.textContent = text;
        }
    });
    
    // 更新页面标题
    const title = document.querySelector('title');
    if (title) {
        title.textContent = language === 'zh' ? 'Gellar - 个人简历' : 'Gellar - Resume';
    }
    
    // 更新HTML lang属性
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en-US';
}

/**
 * 更新语言切换按钮
 * @param {string} language - 当前语言
 */
function updateLanguageButton(language) {
    const langToggle = document.getElementById('lang-toggle');
    const langText = langToggle.querySelector('.lang-text');
    
    if (langText) {
        langText.textContent = language === 'zh' ? 'EN' : '中文';
    }
    
    langToggle.title = language === 'zh' ? 'Switch to English' : '切换到中文';
}

/**
 * 初始化平滑滚动
 * 功能：为导航链接添加平滑滚动效果
 */
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * 初始化滚动效果
 * 功能：添加导航栏背景变化效果
 */
function initScrollEffects() {
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.backgroundColor = 'var(--bg-primary)';
            header.style.backdropFilter = 'none';
        }
    });
}

/**
 * 初始化页面
 * 功能：页面加载完成后执行所有初始化操作
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化各个功能模块
    initLanguageSystem();
    initSmoothScroll();
    initScrollEffects();
    loadProjects();
    
    // 添加页面加载完成的视觉反馈
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

/**
 * 错误处理函数
 * 功能：统一的错误处理和用户提示
 */
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    
    // 如果是网络错误，显示友好的提示
    if (e.error && e.error.message && e.error.message.includes('fetch')) {
        const projectList = document.getElementById('project-list');
        if (projectList && projectList.innerHTML.includes('loading')) {
            projectList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-wifi"></i>
                    ${currentLang === 'zh' ? '网络连接问题，请检查网络后重试' : 'Network connection issue, please check your connection and try again'}
                </div>
            `;
        }
    }
});

/**
 * 性能优化：防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 应用防抖到滚动事件
const debouncedScrollEffect = debounce(() => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(10px)';
    } else {
        header.style.backgroundColor = 'var(--bg-primary)';
        header.style.backdropFilter = 'none';
    }
}, 10);

window.addEventListener('scroll', debouncedScrollEffect);