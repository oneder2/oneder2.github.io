document.addEventListener('DOMContentLoaded', function() {
    const username = 'oneder2'; // 你的 GitHub 用户名
    const repoName = 'oneder2.github.io'; // 你的仓库名称

    // 调用函数加载项目和美术作品
    loadProjects(username);
    loadGalleryImages(username, repoName);
});

/**
 * 从 GitHub API 加载项目并显示在页面上
 * @param {string} username - GitHub 用户名
 */
function loadProjects(username) {
    const projectList = document.getElementById('project-list');
    const loadingMessage = projectList.querySelector('.loading');

    fetch(`https://api.github.com/users/${username}/repos?sort=updated&direction=desc`)
        .then(response => {
            if (!response.ok) throw new Error('网络响应错误 (项目)');
            return response.json();
        })
        .then(repos => {
            if (loadingMessage) loadingMessage.remove();

            const sortedRepos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
            const topRepos = sortedRepos.slice(0, 6);

            topRepos.forEach(repo => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';
                projectCard.innerHTML = `
                    <h3>${repo.name}</h3>
                    <p>${repo.description || '暂无描述'}</p>
                    <a href="${repo.html_url}" target="_blank" class="project-link">在 GitHub 上查看 &rarr;</a>
                `;
                projectList.appendChild(projectCard);
            });
        })
        .catch(error => {
            console.error('无法获取 GitHub 项目:', error);
            if (loadingMessage) loadingMessage.textContent = '无法加载 GitHub 项目。';
        });
}

/**
 * 从 GitHub 仓库的 'images' 文件夹加载图片并显示在画廊中
 * @param {string} username - GitHub 用户名
 * @param {string} repoName - 仓库名称
 */
function loadGalleryImages(username, repoName) {
    const galleryGrid = document.getElementById('gallery-grid');
    const loadingMessage = galleryGrid.querySelector('.loading');
    const imageFolderPath = 'images'; // 存放美术作品的文件夹

    // 使用 GitHub API 获取文件夹内容
    fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${imageFolderPath}`)
        .then(response => {
            if (!response.ok) throw new Error('网络响应错误 (美术作品)');
            return response.json();
        })
        .then(files => {
            if (loadingMessage) loadingMessage.remove();

            // 定义允许的图片文件扩展名
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

            files.forEach(file => {
                // 检查文件是否为图片，并且不是头像和背景图
                const isImage = imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                const isExcluded = file.name === 'profile.jpg' || file.name === 'hero-bg.jpg';
                
                if (file.type === 'file' && isImage && !isExcluded) {
                    const galleryItem = document.createElement('div');
                    galleryItem.className = 'gallery-item';
                    
                    const img = document.createElement('img');
                    img.src = file.path; // 使用相对路径
                    img.alt = file.name;

                    galleryItem.appendChild(img);
                    galleryGrid.appendChild(galleryItem);
                }
            });
        })
        .catch(error => {
            console.error('无法获取美术作品:', error);
            if (loadingMessage) loadingMessage.textContent = '无法加载美术作品。';
        });
}

