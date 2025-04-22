# LLM Chat Application

这是一个使用大型语言模型API进行对话的应用程序。前端使用React/TypeScript构建，后端使用Flask框架。

## 项目结构

- `src/` - React前端代码
- `app.py` - Flask后端API
- `requirements.txt` - Python依赖

## 安装与运行

### 后端设置

1. 安装Python依赖：

```bash
pip install -r requirements.txt
```

2. 在`app.py`中设置您的API密钥：

```python
API_KEY = "your_api_key_here"  # 替换为您的实际API密钥
```

3. 启动Flask服务器：

```bash
python app.py
```

服务器将在 http://localhost:5000 运行。

### 前端设置

1. 安装Node.js依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

前端将在 http://localhost:5173 (或其他Vite默认端口) 运行。

## 使用方法

1. 打开浏览器访问前端URL
2. 点击"新对话"按钮开始一个新的对话
3. 在输入框中输入消息并发送
4. 系统将通过LLM API生成回复

## 注意事项

- 在生产环境中，应该使用环境变量存储API密钥
- 当前实现使用内存存储对话历史，生产环境应使用数据库
- 默认使用OpenAI的GPT-3.5-turbo模型，可以根据需要修改为其他模型或API

## 自定义LLM API

如果您想使用不同的LLM API，请修改`app.py`中的`get_llm_response`函数。
