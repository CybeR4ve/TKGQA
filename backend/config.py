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
OPENAI_MODEL = 'gpt-4o'

# Neo4j配置
NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')

# MySQL配置
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'password')
MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'tkgqa')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))

# JWT配置
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key_here')
JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))  # 默认24小时

# 聊天历史存储配置
CHAT_HISTORY_DIR = 'chat_histories'
if not os.path.exists(CHAT_HISTORY_DIR):
    os.makedirs(CHAT_HISTORY_DIR)
