import os
from dotenv import load_dotenv

# 加载.env文件中的环境变量
load_dotenv()

# API密钥配置
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'your_api_key_here')
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', 'your_deepseek_api_key_here')

# API提供商配置
USE_OPENAI = os.environ.get('USE_OPENAI', 'True').lower() in ('true', '1', 't')

# API端点配置
DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
DEEPSEEK_MODEL = 'deepseek-chat'
OPENAI_MODEL = 'gpt-3.5-turbo'

# 聊天历史存储配置
CHAT_HISTORY_DIR = 'chat_histories'
if not os.path.exists(CHAT_HISTORY_DIR):
    os.makedirs(CHAT_HISTORY_DIR)
