# Personal Portfolio Website

This repository contains the source code for my personal portfolio website, built with vanilla HTML, CSS, and JavaScript, and deployed on GitHub Pages.

**Live Site &raquo; [https://oneder2.github.io](https://oneder2.github.io)**

## ✨ Features

This website serves as a modern and clean digital business card to showcase my skills, projects, and artwork.

* **Responsive Design**: Provides an optimal viewing experience across a wide range of devices, from mobile phones to desktop computers.
* **About Me**: A dedicated section to introduce my technical background and personal interests.
* **Dynamic Project Showcase**: Automatically fetches and displays my latest and most popular public repositories from GitHub using the GitHub API, eliminating the need for manual updates.
* **Art Gallery**: A clean grid layout to display my art and design work.
* **Social Links**: Easy access to my profiles on GitHub, LinkedIn, and other platforms.

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

## 📜 License

This project is licensed under the [MIT License](./LICENSE).
