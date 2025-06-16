document.addEventListener('DOMContentLoaded', function() {
    const username = 'oneder2'; // 你的 GitHub 用户名
    const projectList = document.getElementById('project-list');
    const loadingMessage = document.querySelector('#projects .loading');

    fetch(`https://api.github.com/users/${username}/repos?sort=updated&direction=desc`)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(repos => {
            if (loadingMessage) {
                loadingMessage.remove();
            }

            // 获取 star 最多的前 6 个项目进行展示
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
            if (loadingMessage) {
                loadingMessage.textContent = '无法加载 GitHub 项目。请稍后重试。';
            }
        });
});
