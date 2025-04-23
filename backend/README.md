# LLM Chat Application - 后端

这是LLM聊天应用的后端部分，使用Flask框架构建。

## 特性

- 支持OpenAI和DeepSeek API
- 流式响应支持
- 对话历史管理
- 简单的文件存储系统
- RESTful API设计

## 目录结构

- `app.py` - 主应用入口和API路由
- `requirements.txt` - Python依赖
- `.env.example` - 环境变量示例

## 安装与运行

1. 创建并激活虚拟环境（推荐）：

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

2. 安装依赖：

```bash
pip install -r requirements.txt
```

3. 创建.env文件并设置API密钥：

```bash
cp .env.example .env
# 然后编辑.env文件，填入你的API密钥
```

4. 启动服务器：

```bash
python app.py
```

服务器将在 http://localhost:5000 运行。

## API端点

- `GET /api/conversations` - 获取所有对话
- `POST /api/conversations` - 创建新对话
- `GET /api/conversations/:id` - 获取特定对话
- `DELETE /api/conversations/:id` - 删除特定对话
- `POST /api/conversations/:id/messages` - 发送消息
- `POST /api/conversations/:id/stream` - 流式发送消息
- `POST /api/conversations/clear` - 清除所有对话

## 自定义LLM API

如果你想使用不同的LLM API，请修改`app.py`中的`get_llm_response`函数。
