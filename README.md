# LLM 聊天应用

一个简洁、现代的聊天应用，支持连接多种大型语言模型（如OpenAI和DeepSeek）并提供流畅的用户体验。

![LLM聊天应用](https://via.placeholder.com/800x450.png?text=LLM+Chat+Application)

## 特性

- 🚀 **流式响应** - 实时显示AI回复，就像在与真人交谈
- 🔄 **多轮对话** - 支持上下文连贯的多轮对话交流
- 🌙 **深色/浅色模式** - 支持浅色和深色界面模式切换
- 📚 **对话历史管理** - 保存、查看和删除历史对话
- 🔌 **多模型支持** - 支持OpenAI和DeepSeek API，可扩展至其他模型
- 💻 **清晰的代码结构** - 前后端分离，模块化设计，容易理解和扩展

## 技术栈

### 后端

- **Flask** - 轻量级Python Web框架
- **OpenAI SDK** - 用于连接OpenAI API
- **DeepSeek集成** - 支持DeepSeek大语言模型调用
- **文件存储** - 简单的JSON文件存储会话和用户数据

### 前端

- **React** - 用于构建用户界面的JavaScript库
- **TypeScript** - 类型安全的JavaScript超集
- **Tailwind CSS** - 用于快速设计的实用CSS框架
- **Vite** - 快速的前端构建工具

## 项目结构

```
project/
├── backend/                # 后端代码
│   ├── app.py              # 主应用入口点
│   ├── config.py           # 配置设置
│   ├── models.py           # 数据模型
│   ├── routes/             # API路由
│   │   ├── auth.py         # 认证API
│   │   ├── chat.py         # 聊天API
│   ├── services/           # 服务层
│   │   ├── llm_service.py  # LLM服务
│   └── .env.example        # 环境变量示例
├── client/                 # 前端代码
│   ├── src/                # 源代码
│   │   ├── components/     # React组件
│   │   ├── App.tsx         # 主应用组件
│   │   ├── types.ts        # TypeScript类型定义
│   ├── index.html          # HTML入口点
│   ├── package.json        # 前端依赖
│   ├── tailwind.config.js  # Tailwind CSS配置
│   └── vite.config.ts      # Vite配置
└── README.md               # 项目文档（当前文件）
```

## 安装与运行

### 前置条件

- Python 3.8+ 和 pip
- Node.js 18+ 和 npm/yarn

### 后端设置

1. 进入后端目录并安装依赖：

   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. 创建 `.env`文件（参考 `.env.example`）并配置您的API密钥：

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   USE_OPENAI=True  # 切换为False使用DeepSeek
   ```
3. 启动后端服务器：

   ```bash
   python app.py
   ```

   服务器将在 http://localhost:5000 运行

### 前端设置

1. 进入前端目录并安装依赖：

   ```bash
   cd client
   npm install
   ```
2. 启动开发服务器：

   ```bash
   npm run dev
   ```

   前端将在 http://localhost:5173 运行

## 使用指南

### 创建新对话

1. 点击界面左侧的"新建对话"按钮
2. 在输入框中输入您的问题或指令
3. 按下回车键或点击发送按钮
4. 观察AI响应实时流式显示

### 管理对话历史

- 左侧面板显示所有历史对话
- 点击任意对话可以继续该对话
- 搜索框可以帮助您查找特定对话
- 删除按钮可以移除不需要的对话

### 切换深色/浅色模式

点击界面右上角的主题切换按钮来改变界面主题。

## 自定义与扩展

### 修改系统提示词

您可以在 `backend/services/llm_service.py`文件中修改系统提示词，自定义AI助手的行为特性。

### 添加新的模型支持

要添加新的LLM支持，可以在 `llm_service.py`中扩展API调用实现，并在 `config.py`中添加相应的配置项。

### 数据存储

默认情况下，对话历史保存在 `chat_histories`目录中的JSON文件中。您可以在 `models.py`中修改存储机制，例如迁移到数据库存储。

## 问题排查

### API连接问题

- 确认您的 `.env`文件中包含正确的API密钥
- 检查API提供商的服务状态
- 查看后端日志中的详细错误信息

### 界面显示问题

- 确保前端和后端都在运行
- 检查浏览器控制台是否有错误
- 确认API路径在前后端匹配

## 贡献指南

欢迎提交问题报告和改进建议。如需贡献代码，请：

1. Fork本仓库
2. 创建您的特性分支
3. 提交变更
4. 推送到分支
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详情见[LICENSE](LICENSE)文件
