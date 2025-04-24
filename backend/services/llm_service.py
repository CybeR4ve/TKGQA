from openai import OpenAI
import os
import sys
import json

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

def generate_cypher(natural_language_query):
    """
    将自然语言查询转换为Cypher查询语句
    
    Args:
        natural_language_query (str): 用户的自然语言问题
        
    Returns:
        str: 生成的Cypher查询语句
    """
    try:
        # 系统提示词，指导LLM如何生成Cypher查询
        system_prompt = """你是一个专业的知识图谱查询专家。你的任务是将用户的自然语言问题转换为准确的Cypher查询语句。
        
        知识图谱具有以下特性:
        - 使用Neo4j存储的时序知识图谱
        - 包含事件、人物、组织、地点、时间等实体
        - 实体间的关系包括：参与、发生于、位于、隶属于等
        - 时间属性通常存储为实体的属性，例如 timestamp, date 等
        
        请生成符合以下要求的Cypher查询:
        1. 能够准确反映用户问题的语义
        2. 适当使用Neo4j的时序查询能力
        3. 考虑实体间的关系和属性
        4. 仅返回Cypher查询语句，不包含任何解释或注释
        5. 查询应该尽量简洁高效
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"将以下问题转换为Cypher查询语句：{natural_language_query}"}
        ]
        
        # 调用LLM API生成Cypher查询
        response = None
        if USE_OPENAI:
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,  # 低温度以获得更确定性的结果
                max_tokens=500,
            )
        else:
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )
        
        # 提取生成的Cypher查询语句
        cypher_query = response.choices[0].message.content.strip()
        return cypher_query
        
    except Exception as e:
        print(f"生成Cypher查询时出错: {str(e)}")
        raise Exception(f"生成Cypher查询时出错: {str(e)}")

def generate_natural_language_response(query_result, original_query):
    """
    将图数据库查询结果转换为自然语言响应
    
    Args:
        query_result (list): 图数据库查询结果
        original_query (str): 原始用户问题
        
    Returns:
        str: 自然语言响应
    """
    try:
        # 系统提示词，指导LLM如何将查询结果转换为自然语言
        system_prompt = """你是一个知识图谱查询解释专家。你的任务是将Neo4j查询结果转换为流畅、自然的语言解释。

        遵循以下要求:
        1. 回答应直接、明确地解答用户的原始问题
        2. 使用简洁、易懂的语言
        3. 如果结果为空，请友好地指出没有找到相关信息
        4. 不要提及技术细节如"查询"、"Neo4j"或"Cypher"
        5. 对于时间相关的查询，确保清晰地表达时间关系
        6. 对于复杂的结果，进行适当的总结和概括
        """
        
        # 将查询结果转换为字符串
        result_str = json.dumps(query_result, ensure_ascii=False)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"原始问题：{original_query}\n\n查询结果：{result_str}\n\n请将这些信息转换为自然语言回答。"}
        ]
        
        # 调用LLM API生成自然语言响应
        response = None
        if USE_OPENAI:
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
            )
        else:
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
            )
        
        # 提取生成的自然语言响应
        natural_language = response.choices[0].message.content.strip()
        return natural_language
        
    except Exception as e:
        print(f"生成自然语言响应时出错: {str(e)}")
        raise Exception(f"生成自然语言响应时出错: {str(e)}")
