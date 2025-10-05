# Muyao Niu's Professional Resume

A clean, minimalist professional resume website optimized for GitHub Pages. Built with vanilla HTML, CSS, and JavaScript, featuring a modern design focused on showcasing technical skills and professional experience.

**Live Site &raquo; [https://oneder2.github.io](https://oneder2.github.io)**

## ✨ Features

This website serves as a professional digital resume, optimized for business and technical contexts.

* **Clean Minimalist Design**: Professional, business-appropriate layout with excellent readability
* **Responsive Design**: Optimized for desktop, tablet, and mobile devices
* **Bilingual Support**: Complete English and Chinese language support with dynamic language switching
* **Dynamic Project Showcase**: Automatically fetches and displays GitHub repositories with project details
* **Technical Skills Display**: Organized skill categories with clean, scannable layout
* **Print-Friendly**: Optimized styles for PDF printing and offline viewing
* **Fast Loading**: Lightweight design with minimal resource requirements
* **Professional Presentation**: Suitable for business meetings and professional networking
* **Contact Integration**: Easy access to professional profiles and contact information
* **Performance Optimized**: Minimal JavaScript and CSS for fast loading times

## 🚀 Tech Stack

* **HTML5**: For the structure and content of the website.
* **CSS3**: For styling, layout, and animations, utilizing modern features like Flexbox and Grid.
* **JavaScript (ES6)**: For dynamic functionality, primarily using the `fetch` API to interact with the GitHub API and load project data.

## 🔧 Getting Started & Customization

If you'd like to use this template for your own portfolio, follow these steps:

### 1. Fork this Repository

Click the **Fork** button at the top right of this page to copy this repository to your own GitHub account.

### 2. Rename the Repository

Rename the forked repository to `your-github-username.github.io`. For example, if your username is `johndoe`, the repository should be named `johndoe.github.io`.

### 3. Customize the Content

Modify the following files in your repository:

* **`index.html`**:
    * Change the website title in the `<title>` tag.
    * Replace all instances of `[Your Name]` with your actual name or nickname.
    * Update the personal bio in the `#hero` and `#about` sections.
    * In the `#contact` section, update the `href` attributes with links to your own social media profiles (e.g., LinkedIn, Email).
* **`script.js`**:
    * Find the line `const username = 'oneder2';` and replace `'oneder2'` with **your GitHub username**. This will ensure the site fetches your projects.
* **/images/ folder**:
    * Replace `profile.jpg` with your own profile picture.
    * Replace `hero-bg.jpg` with a background image of your choice.
    * Replace `art1.jpg`, `art2.jpg`, etc., with your own artwork. Ensure the filenames match the `<img>` tags in the `#gallery` section of `index.html`.

### 4. Push and Deploy

Commit and push your changes to your repository. GitHub Pages will automatically build and deploy your site within a few minutes. You can then access it at `https://your-github-username.github.io`.

## 📁 Project Structure

```
oneder2.github.io/
├── _site/                    # 网站根目录（GitHub Pages部署目录）
│   ├── index.html           # 简历主页面（极简设计）
│   ├── style.css            # 极简风格样式文件
│   └── scripts.js           # 简历功能JavaScript
├── static/                  # 静态资源目录
│   ├── assets/              # 个人资源
│   │   └── profile.jpg      # 个人头像
│   ├── backgrounds/         # 背景图片（备用）
│   ├── icons/              # 图标文件（预留）
│   └── README.md           # 静态资源说明文档
├── images/                  # 原始图片资源（保留备份）
├── test/                    # 测试文件
│   ├── frontend-tests.html  # 前端功能测试
│   └── README.md           # 测试说明文档
├── docs/                    # 文档文件
│   ├── resume-redesign-summary.md  # 简历改造总结
│   └── visual-enhancement-v1.4.md  # 视觉美化文档
├── DEVELOPMENT.md          # 开发文档
├── README.md               # 项目说明文档
└── LICENSE                 # 开源协议
```

## 🔧 Development & Testing

### Development Documentation
详细的开发规范和架构说明请参考 [DEVELOPMENT.md](./DEVELOPMENT.md)

### Testing
项目包含完整的前端功能测试：
- 打开 `test/frontend-tests.html` 运行测试
- 测试覆盖页面加载、API连接、响应式设计等功能
- 详细的测试说明请参考 [test/README.md](./test/README.md)

## 📝 Recent Updates

### v2.3 - 页面布局优化
- ✅ **减少左右空白**：将布局比例从1:4:1调整为0.5:9:0.5，大幅增加内容区域宽度
- ✅ **优化背景颜色**：柔化和暗化背景色调，使用更舒适的浅灰蓝色系
- ✅ **提升内容宽度**：最大内容宽度从800px增加到1000px
- ✅ **统一布局比例**：导航栏、主内容区域、页脚使用一致的布局比例
- ✅ **增强视觉舒适度**：背景色从纯白调整为柔和的浅灰蓝色

### v2.2 - 项目信息更新
- ✅ **更新实际项目**：根据用户提供的真实项目信息更新projects.json
- ✅ **添加Mentia项目**：AI驱动的个人工作空间，使用PostgreSQL+pgvector+Django+Next.js
- ✅ **添加FindU项目**：AI需求生成器，使用Django+Next.js+SQLite+Qwen
- ✅ **添加SurfSmart项目**：2025 UMD BitCamp AI网站研究工具，使用React+Flask+MongoDB+Langchain
- ✅ **添加Twilight Zone游戏**：Unity 2D恐怖游戏，使用C#+Unity+Aseprite+Krita
- ✅ **项目信息完善**：包含完整的中英文描述、技术栈和项目链接

### v2.1 - 页面显示修复
- ✅ **修复头像路径问题**：修正HTML中头像图片路径从`static/assets/profile.jpg`到`assets/profile.jpg`
- ✅ **验证文件加载**：确认CSS、JavaScript和JSON文件都能正确加载
- ✅ **功能测试**：通过本地服务器测试验证所有页面功能正常
- ✅ **路径优化**：统一静态资源路径结构，确保部署一致性

### v2.0 - 简历页面改造
- ✅ **重大改造**：将作品集网站改造为专业简历页面
- ✅ **极简设计**：采用专业、简洁的设计理念，适合商务场合
- ✅ **结构优化**：重新设计页面结构，专注于简历内容展示
- ✅ **性能提升**：大幅减少资源大小，提升加载速度
- ✅ **打印优化**：添加专门的打印样式，支持PDF导出
- ✅ **移除冗余**：删除艺术作品展示等非简历相关内容
- ✅ **保留核心**：维持双语支持和GitHub项目展示功能
- ✅ **文档更新**：创建简历改造总结文档

### v1.4 - 页面美化升级
- ✅ 修复导航栏排序问题，优化布局和间距
- ✅ 调整背景透明度，增强内容对比度和可读性
- ✅ 增强交互效果，添加丰富的悬停动画
- ✅ 优化字体排版，提升视觉层次和可读性
- ✅ 添加微妙背景动画和阴影呼吸效果
- ✅ 增强页脚视觉设计，添加渐变装饰
- ✅ 完善响应式设计，确保所有设备完美显示

### v1.3 - 背景和多语言版本
- ✅ 配置全站背景图片功能，集成title-bg.jpg
- ✅ 实现中英文双语言支持，完整翻译所有内容
- ✅ 添加语言切换器，支持动态语言切换
- ✅ 本地存储语言偏好，记住用户选择
- ✅ 优化背景显示效果，添加半透明遮罩和毛玻璃效果

### v1.2 - 视觉美化版本
- ✅ 重新组织静态资源到static目录，按用途分类管理
- ✅ 全面美化页面视觉设计，采用现代化UI风格
- ✅ 优化色彩搭配，使用渐变和现代配色方案
- ✅ 添加Google Fonts字体支持，提升文字显示效果

### v1.1 - 功能完善版本
- ✅ 修复图片路径问题，确保艺术作品正常显示
- ✅ 完善响应式导航栏，移动端体验优化
- ✅ 添加图片lightbox功能，支持点击放大查看
- ✅ 改进错误处理和用户体验
- ✅ 添加加载动画和页面过渡效果

## 📜 License

This project is licensed under the [MIT License](./LICENSE).
