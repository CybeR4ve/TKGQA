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

def get_llm_response(prompt, conversation_history, stream=False):
    """
    从大型语言模型 API 获取响应。
    支持 OpenAI API 和 DeepSeek API。
    实现多轮对话的上下文传递。
    可选流式传输模式。
    
    Args:
        prompt (str): 用户输入的提示
        conversation_history (list): 对话历史
        stream (bool): 是否使用流式响应
        
    Returns:
        str 或 generator: 如果stream=False，返回文本响应；如果stream=True，返回流式响应对象
    """
    try:
        # 将对话历史转换为 API 期望的格式
        messages = []
        
        # 添加系统消息
        messages.append({"role": "system", "content": "你是一个有用的助手。请提供有帮助、安全、准确的信息。"})
        
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
                stream=stream
            )
            
            if stream:
                return response  # 返回流式响应对象
            else:
                return response.choices[0].message.content
        else:
            # 使用 DeepSeek API
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=stream
            )
            
            if stream:
                return response  # 返回流式响应对象
            else:
                return response.choices[0].message.content
    
    except Exception as e:
        print(f"调用 LLM API 时出错: {str(e)}")
        raise Exception(f"生成响应时出错: {str(e)}")
