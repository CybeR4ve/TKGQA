# TKGQA - 时序知识图谱问答系统

一个现代化的知识图谱问答系统，结合时序知识图谱和大型语言模型实现智能问答，支持用户账户管理和对话历史保存。

## 功能特性

- 🧠 **知识图谱查询** - 支持自然语言到Cypher查询的转换，查询复杂关系数据
- 🤖 **LLM问答** - 集成多种大型语言模型(OpenAI/DeepSeek)提供通用问答能力
- 🔄 **智能切换** - 自动识别知识图谱相关查询，在LLM和知识图谱间智能切换
- 👤 **用户账户系统** - 支持用户注册、登录和认证
- 📚 **个人对话历史** - 每个用户可以管理自己的对话历史
- 🌙 **深色/浅色模式** - 支持界面主题切换，提升用户体验
- 🚀 **流式响应** - 实时显示AI回复，带来流畅的交互体验

## 技术栈

### 后端

- **Flask** - Python Web框架
- **Neo4j** - 图数据库，用于存储知识图谱
- **MySQL** - 关系型数据库，存储用户数据和对话历史
- **JWT** - 用于用户身份验证
- **OpenAI/DeepSeek API** - 大语言模型集成

### 前端

- **React** - 用户界面构建
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 快速构建美观界面
- **Vite** - 高效的前端构建工具

## 系统架构

```
project/
├── backend/               # 后端代码
│   ├── app.py             # 应用入口点
│   ├── config.py          # 配置文件
│   ├── models.py          # 数据模型
│   ├── routes/            # API路由
│   │   ├── auth.py        # 认证API
│   │   ├── chat.py        # 聊天API
│   │   ├── kg_query.py    # 知识图谱查询API
│   ├── services/          # 服务层
│   │   ├── llm_service.py # LLM服务
│   │   ├── neo4j_service.py # Neo4j服务
│   │   ├── mysql_service.py # MySQL服务
│   └── .env.example       # 环境变量示例
├── client/                # 前端代码
│   ├── src/               # 源代码
│   │   ├── components/    # React组件
│   │   ├── services/      # 前端服务
│   │   ├── config.ts      # 前端配置
│   │   ├── App.tsx        # 主应用组件
│   │   ├── types.ts       # TypeScript类型定义
│   ├── index.html         # HTML入口
│   ├── package.json       # 前端依赖
│   ├── tailwind.config.js # Tailwind CSS配置
└── README.md              # 项目文档
```

## 安装与运行

### 前置条件

- Python 3.8+
- Node.js 18+
- Neo4j 5.0+
- MySQL 8.0+

### 数据库设置

1. 启动Neo4j数据库
   ```bash
   # 确保Neo4j服务运行在默认端口(7687)
   # 或者在.env配置文件中修改连接参数
   ```

2. 配置MySQL数据库
   ```sql
   CREATE DATABASE tkgqa;
   ```

### 后端设置

1. 进入后端目录并安装依赖：
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. 创建并配置.env文件：
   ```
   # API配置
   OPENAI_API_KEY=your_openai_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   USE_OPENAI=True  # 或False以使用DeepSeek
   
   # Neo4j配置
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   
   # MySQL配置
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=tkgqa
   MYSQL_PORT=3306
   
   # JWT配置
   JWT_SECRET_KEY=your_jwt_secret_key
   JWT_ACCESS_TOKEN_EXPIRES=86400  # 24小时
   ```

3. 启动后端服务器：
   ```bash
   python app.py
   ```
   服务将在 http://localhost:5000 运行

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

### 用户注册和登录

1. 点击右上角的用户图标打开登录/注册弹窗
2. 填写邮箱和密码进行注册或登录
3. 登录后可以创建和管理私人对话

### 使用知识图谱问答

1. 输入与知识图谱相关的问题，如：
   - "谁是XX的创始人？"
   - "XX事件与YY事件之间有什么关系？"
   - "XX组织在2022年参与了哪些活动？"

2. 系统会自动识别并处理为知识图谱查询，显示：
   - 查询过程状态
   - 最终的自然语言回答
   - 查询来源标识

### 一般LLM对话

1. 输入任何普通问题或指令
2. LLM会根据上下文提供回答

### 管理对话

- 点击左侧"新建对话"创建会话
- 点击任意历史对话继续交流
- 使用对话旁的删除按钮移除不需要的对话

## 系统原理

### 知识图谱查询流程

1. 用户输入自然语言问题
2. 系统检测是否是知识图谱相关查询
3. 使用LLM将自然语言转换为Cypher查询语句
4. 执行Cypher查询获取知识图谱数据
5. 使用LLM将查询结果格式化为自然语言回答
6. 返回最终结果给用户

### 用户认证机制

- 使用JWT(JSON Web Token)进行身份验证
- 令牌保存在本地存储，有效期为24小时
- API请求通过Authorization头部传递令牌

## 配置与自定义

### 修改系统提示词

编辑`backend/services/llm_service.py`中的`system_prompt`变量来自定义AI行为。

### 调整知识图谱查询检测

编辑`backend/routes/chat.py`中的`KG_QUERY_PATTERNS`正则表达式列表。

### 前端配置

编辑`client/src/config.ts`修改API端点和其他前端配置。

## 问题排查

### 知识图谱连接问题

- 确认Neo4j数据库正在运行
- 验证`.env`中的连接参数正确
- 使用`/api/kg/test`端点测试连接

### 用户认证问题

- 检查MySQL连接是否正常
- 确认JWT密钥配置正确
- 查看后端日志中的详细错误信息


## 许可证

本项目采用[MIT](https://www.mit-license.org/)许可证
