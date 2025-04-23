from openai import OpenAI
import os
import sys

# 添加父目录到路径，以便导入配置
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    OPENAI_API_KEY, 
    DEEPSEEK_API_KEY, 
    DEEPSEEK_BASE_URL, 
    OPENAI_MODEL, 
    DEEPSEEK_MODEL, 
    USE_OPENAI
)

# 初始化OpenAI客户端
openai_client = OpenAI(api_key=OPENAI_API_KEY)

def get_llm_response(prompt, conversation_history):
    """
    从大型语言模型 API 获取流式响应。
    支持 OpenAI API 和 DeepSeek API。
    实现多轮对话的上下文传递。
    
    Args:
        prompt (str): 用户输入的提示
        conversation_history (list): 对话历史
        
    Returns:
        generator: 返回流式响应对象
    """
    try:
        # 将对话历史转换为 API 期望的格式
        messages = []
        
        # 添加系统消息
        system_prompt = """你是一个智能助手，擅长回答各类问题并提供详细解释。
        - 你应该保持友好、有礼貌的语气
        - 对于专业问题，提供深入详细的分析和解释
        - 对于有争议的话题，展示不同观点并保持中立
        - 当用户提问不清晰时，可以礼貌地请求澄清
        - 如果你不确定某个事实，坦诚承认而不是提供错误信息
        - 避免生成有害、不适当或违反道德的内容
        - 你可以使用emoji来增加表达的生动性😊
        - 列表和数字条目应该使用markdown格式
        """
        messages.append({"role": "system", "content": system_prompt})
        
        # 添加所有历史消息作为上下文（完整的对话历史）
        for msg in conversation_history:
            role = "user" if msg['sender'] == 'user' else "assistant"
            messages.append({"role": role, "content": msg['content']})
        
        print(f"发送到 LLM API 的消息: {messages}")
        
        if USE_OPENAI:
            # 使用 OpenAI API
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True
            )
            
            return response  # 返回流式响应对象
        else:
            # 使用 DeepSeek API
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True
            )
            
            return response  # 返回流式响应对象
    
    except Exception as e:
        print(f"调用 LLM API 时出错: {str(e)}")
        raise Exception(f"生成响应时出错: {str(e)}")
