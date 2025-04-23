# LLM Chat Application - 前端

这是LLM聊天应用的前端部分，使用React、TypeScript和Tailwind CSS构建。

## 特性

- 响应式UI设计，适配各种屏幕尺寸
- 深色/浅色模式切换
- 用户认证界面（登录/注册）
- 聊天历史管理
- 流式响应支持，实时显示AI回复

## 目录结构

- `src/` - 源代码目录
  - `components/` - React组件
  - `App.tsx` - 主应用组件
  - `types.ts` - TypeScript类型定义
- `public/` - 静态资源
- `package.json` - 依赖配置
- `tailwind.config.js` - Tailwind CSS配置

## 安装与运行

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 构建生产版本：

```bash
npm run build
```

## 与后端通信

前端通过API与后端通信，主要包括以下端点：

- `/api/conversations` - 获取和创建对话
- `/api/conversations/:id` - 获取、删除特定对话
- `/api/conversations/:id/messages` - 发送消息
- `/api/conversations/:id/stream` - 流式获取响应
- `/api/auth/login` - 用户登录
- `/api/auth/register` - 用户注册

确保后端服务器正在运行并配置了正确的CORS设置。
