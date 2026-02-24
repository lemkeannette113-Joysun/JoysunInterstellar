# Joy星际先锋 (Joy Interstellar Pioneer)

一个基于 React + Vite + HTML5 Canvas 构建的高性能太空射击游戏。

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <你的仓库地址>
cd joy-interstellar-pioneer
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
在根目录创建 `.env` 文件，并添加你的 Gemini API Key：
```env
GEMINI_API_KEY=你的_API_KEY
```

### 4. 启动开发服务器
```bash
npm run dev
```

## 📦 部署到 Vercel

1. 将代码推送至 GitHub 仓库。
2. 在 [Vercel 控制台](https://vercel.com/) 点击 "Add New" -> "Project"。
3. 导入你的 GitHub 仓库。
4. 在 **Environment Variables** 部分，添加：
   - `GEMINI_API_KEY`: 你的 Gemini API 密钥。
5. 点击 "Deploy"。

## 🎨 自定义资源

你可以通过替换 `public/assets/` 目录下的文件来更改游戏外观和音效：
- `player.png`: 主角战机
- `enemy_basic.png`: 基础敌机
- `enemy_fast.png`: 快速敌机
- `enemy_heavy.png`: 重型敌机
- `shoot.mp3`: 开火音效
- `explosion.mp3`: 爆炸音效
- `background_music.mp3`: 背景音乐 (循环播放)

## 🛠 技术栈
- **React 19**: UI 框架
- **Vite**: 构建工具
- **Tailwind CSS 4**: 样式处理
- **Motion**: 动画效果
- **HTML5 Canvas**: 游戏渲染引擎
- **Lucide React**: 图标库
