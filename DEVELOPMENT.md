# 开发文档 - Personal Portfolio Website

## 项目概述
这是一个基于纯HTML、CSS和JavaScript的个人作品集网站，展示个人项目、艺术作品和联系方式。

## 技术栈
- **前端**: HTML5, CSS3, JavaScript (ES6)
- **部署**: GitHub Pages
- **API**: GitHub API (用于动态加载项目)

## 项目结构
```
oneder2.github.io/
├── _site/                 # 网站根目录（GitHub Pages部署目录）
│   ├── index.html        # 主页面
│   ├── style.css         # 样式文件
│   └── scripts.js        # JavaScript功能
├── images/               # 图片资源
│   ├── profile.jpg       # 头像图片（需要添加）
│   ├── hero-bg.jpg       # 背景图片（需要添加）
│   └── *.png             # 艺术作品图片
├── README.md             # 项目说明文档
├── DEVELOPMENT.md        # 开发文档（本文件）
└── LICENSE               # 开源协议
```

## 开发规范

### 1. 文件注释规范
- **文件头部**: 每个文件开头必须包含文件用途说明
- **函数注释**: 所有函数前必须有JSDoc格式注释
- **复杂逻辑**: 复杂业务逻辑必须添加行内注释
- **HTML注释**: 页面各个区块必须标明用途和修改说明

### 2. 代码组织
- CSS使用CSS变量进行主题管理
- JavaScript函数按功能模块化组织
- 图片资源按类型分类存放

### 3. 响应式设计
- 移动端优先的响应式设计
- 使用Flexbox和Grid布局
- 断点: 768px (移动端/桌面端)

### 4. 性能优化
- 图片懒加载
- CSS和JS文件压缩
- 使用CDN加载外部资源

## 功能模块

### 1. 导航栏 (Navigation)
- 固定顶部导航
- 平滑滚动到对应区域
- 响应式移动端菜单

### 2. 英雄区域 (Hero Section)
- 全屏背景图片
- 个人介绍和CTA按钮
- 渐变遮罩效果

### 3. 关于我 (About Section)
- 个人简介
- 头像展示
- 技能描述

### 4. 项目展示 (Projects Section)
- 动态从GitHub API获取项目
- 按星标数排序
- 项目卡片展示

### 5. 艺术作品 (Gallery Section)
- 从GitHub仓库动态加载图片
- 网格布局展示
- 点击放大功能（待实现）

### 6. 联系方式 (Contact Section)
- 社交媒体链接
- 邮箱联系方式

## API集成

### GitHub API
- **用户仓库**: `https://api.github.com/users/{username}/repos`
- **仓库内容**: `https://api.github.com/repos/{username}/{repo}/contents/{path}`
- **错误处理**: 网络请求失败时的用户友好提示

## 开发环境设置
1. Fork本仓库到个人GitHub账户
2. 重命名为 `{username}.github.io`
3. 修改 `scripts.js` 中的GitHub用户名
4. 替换个人图片和内容
5. 提交更改，GitHub Pages自动部署

## 测试规范
- 前端功能测试：验证页面交互和API调用
- 响应式测试：不同设备尺寸下的显示效果
- 性能测试：页面加载速度和资源优化
- 浏览器兼容性：主流浏览器测试

## 待完善功能
- [ ] 移动端导航菜单
- [ ] 图片画廊放大查看
- [ ] 加载动画效果
- [ ] 更完善的错误处理
- [ ] 页面SEO优化
- [ ] 无障碍访问支持

## 部署说明
- 使用GitHub Pages自动部署
- 主分支的 `_site` 目录作为网站根目录
- 每次提交后自动构建和部署

## 贡献指南
1. 遵循现有代码风格
2. 添加适当的注释和文档
3. 确保响应式设计兼容性
4. 测试所有功能正常工作
5. 更新相关文档
