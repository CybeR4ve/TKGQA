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
        - 提醒用户可以使用"使用知识图谱查询..."触发查询，用来查询近期的金融事件
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
        print(f"开始将自然语言转换为Cypher查询: '{natural_language_query}'")
        
        # 系统提示词，指导LLM如何生成Cypher查询
        system_prompt = """你是一个专业的知识图谱查询专家。你的任务是将用户的自然语言问题，严格按照提供的Neo4j图谱模式，根据给定的类型，识别属于哪个类型，生成对应的Cypher查询语句。

- **节点:**
  - **`:Entity`**: 实体节点，属性有 `entityId` (唯一ID), `name` (名称), `type` (类型，包括：'Date', 'Number', 'Text', '人物', '企业', '地点', '机构')。**注意：**查询时，不要使用Date，而是使用下方的`timestampStr`属性。
  - **`:Event`**: 事件节点，属性有 `eventId` (唯一ID), `eventType` (事件类型"), `timestampStr` (时间戳字符串), `triggerText` (触发词), `originalText` (原文片段)。  **注意:** `timestampStr` 属性存储事件发生的时间，**精确格式为 `"YYYY-MM-DD HH:MM:SS"`**。这是一个字符串属性，可以直接进行字符串比较和排序。事件类型包括：'中标', '亏损', '企业上市', '企业收购', '企业融资', '公司上市', '股东减持', '股东分红', '股东增持', '股份回购'
- **关系:**
  - **实体间关系**: 连接两个 `:Entity` 节点。关系类型包括: '上市公司', '中标公司', '中标日期', '中标标的', '中标金额', '事件时间', '亏损变化', '交易完成时间', '交易股票/股份数量', '交易金额', '公司名称', '净亏损', '减持方', '减持部分占总股本比例', '分红时间', '分红股份数量', '回购完成时间', '回购方', '回购股份数量', '增持方', '投资方', '披露时间', '招标方', '收购方', '收购标的', '每股交易价格', '每股分配', '每股派发现金红利', '环节', '股票简称', '融资轮次', '融资金额', '被投资方', '被收购方', '财报周期'。
    - 示例: `(:Entity)-[:中标日期]->(:Entity)`
  -**事件-实体关系 (论元)**: 连接 `:Event` 节点和 `:Entity` 节点。关系类型对应事件论元角色。           
    - 示例: `(:Event)-[:参与方]->(:Entity)` (关系可能带有属性，如 `argumentText`)
  -**如何使用时间属性 (`timestampStr`) 进行查询:**
    - 你可以使用 `timestampStr` 属性来过滤特定日期或时间范围内的事件，例如: `WHERE e.timestampStr >= '起始日期时间' AND e.timestampStr <= '结束日期时间'`
    - 你可以使用 `timestampStr` 属性对事件进行排序，例如: `ORDER BY e.timestampStr ASC` (升序) 或 `DESC` (降序)
    - 你可以使用字符串比较操作 (`>`, `<`, `>=`, `<=`, `=`) 来比较时间戳字符串，也可以使用 `STARTS WITH` 进行前缀匹配（例如按年份过滤）。
    - 可供查询的范围是2024年12月到2025年4月。

    **要求:**
    - 严格遵守上述图谱模式中列出的节点标签、属性名称、关系类型和时间格式。
    - 只输出 Cypher 查询语句，不要包含任何解释性文字、前缀或额外的符号。
    - 查询语句务必要包含originalText，不要省略。

    查询示例：
    问题： 2025年4月，英伟达发生了哪些事件？
    查询语句：MATCH (c:Entity {name: '英伟达'})<-[r]-(e:Event)
WHERE e.timestampStr >= '2025-04-01 00:00:00' AND e.timestampStr <= '2025-04-30 23:59:59'
RETURN e.eventType, e.timestampStr, e.triggerText, e.originalText
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"将以下问题转换为Cypher查询语句：{natural_language_query}"}
        ]
        
        # 调用LLM API生成Cypher查询
        response = None
        if USE_OPENAI:
            print("使用OpenAI API生成Cypher查询")
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,  # 低温度以获得更确定性的结果
                max_tokens=500,
            )
        else:
            print("使用DeepSeek API生成Cypher查询")
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )
        
        # 提取生成的Cypher查询语句
        cypher_query = response.choices[0].message.content.strip()
        print(f"生成的Cypher查询语句: {cypher_query}")
        return cypher_query
        
    except Exception as e:
        print(f"生成Cypher查询时出错: {str(e)}")
        raise Exception(f"生成Cypher查询时出错: {str(e)}")

def generate_natural_language_response(query_result, original_query, conversation_history=None, stream=False):
    """
    将图数据库查询结果转换为自然语言响应
    
    Args:
        query_result (list): 图数据库查询结果
        original_query (str): 原始用户问题
        conversation_history (list): 对话历史，默认为None
        stream (bool): 是否使用流式响应，默认为False
        
    Returns:
        str或generator: 如果stream=False，返回字符串；如果stream=True，返回流式响应对象
    """
    try:
        print(f"开始将查询结果转换为自然语言响应")
        print(f"原始问题: '{original_query}'")
        print(f"查询结果数量: {len(query_result)}")
        print(f"是否使用流式响应: {stream}")
        print(f"是否有对话历史: {conversation_history is not None}")
        
        # 系统提示词，指导LLM如何将查询结果转换为自然语言
        system_prompt = """你是一个知识图谱查询解释专家。你的任务是将Neo4j查询结果转换为流畅、自然的语言解释，再根据用户提出的原始问题，将查询结果与你的知识结合，给出最终的回答。

        遵循以下要求:
        1. 回答应直接、明确地解答用户的原始问题，同时要将查询结果与你的知识结合，对查询得到的结果作出适当的补充与扩展。
        2. 如果结果为空，请友好地指出没有找到相关信息，但可以结合你的知识，给出可能的回答
        3. 不要提及技术细节如"查询"、"Neo4j"或"Cypher"
        4. 对于时间相关的查询，确保清晰地表达时间关系
        5. 对于复杂的结果，进行适当的总结和概括 
        6. 如果查询到的结果中有与问题无关的项，无需指出，**直接忽略**
        7. 当有对话历史时，使用这些上下文信息使你的回答更加相关和个性化。
        """
        
        # 将查询结果转换为字符串
        result_str = json.dumps(query_result, ensure_ascii=False)
        
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        
        # 如果有对话历史，添加到消息中
        if conversation_history:
            # 添加最多5轮对话历史作为上下文，避免上下文过长
            recent_history = conversation_history[-10:]
            for msg in recent_history:
                role = "user" if msg['sender'] == 'user' else "assistant"
                messages.append({"role": role, "content": msg['content']})
                
            # 添加最新的查询请求
            messages.append({"role": "user", "content": f"我想知道：{original_query}\n\n查询结果：{result_str}\n\n请将这些信息转换为自然语言回答。"})
        else:
            # 无对话历史时的简单请求
            messages.append({"role": "user", "content": f"原始问题：{original_query}\n\n查询结果：{result_str}\n\n请将这些信息转换为自然语言回答。"})
        
        # 调用LLM API生成自然语言响应
        if USE_OPENAI:
            print("使用OpenAI API生成自然语言响应")
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=stream
            )
        else:
            print("使用DeepSeek API生成自然语言响应")
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=stream
            )
        
        if stream:
            # 如果是流式响应，直接返回响应对象
            print("返回流式响应对象")
            return response
        else:
            # 提取生成的自然语言响应
            natural_language = response.choices[0].message.content.strip()
            print(f"生成的自然语言响应: '{natural_language[:100]}...(截断)'")
            return natural_language
        
    except Exception as e:
        print(f"生成自然语言响应时出错: {str(e)}")
        raise Exception(f"生成自然语言响应时出错: {str(e)}")

def generate_title_for_conversation(user_message, system_response):
    """
    根据最近的对话生成一个简洁的标题
    
    Args:
        user_message (str): 用户的消息内容
        system_response (str): 系统的响应内容
        
    Returns:
        str: 生成的对话标题
    """
    try:
        print(f"开始为对话生成标题")
        
        # 系统提示词，指导LLM如何生成标题
        system_prompt = """你是一个专业的对话标题生成助手。请根据给定的对话内容，生成一个简洁明了的标题。
        
        要求:
        1. 标题应简短精炼，不超过10个汉字
        2. 标题应能准确反映对话的主要内容或主题
        3. 标题应具有描述性，避免过于笼统的词语
        4. 不要使用引号或其他特殊符号
        5. 只输出标题文本，不要包含任何解释、前缀或额外符号
        """
        
        # 将对话内容截断，只保留前200个字符，避免内容过长
        truncated_user_message = user_message[:200] + ("..." if len(user_message) > 200 else "")
        truncated_system_response = system_response[:200] + ("..." if len(system_response) > 200 else "")
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"对话内容:\n用户: {truncated_user_message}\n系统: {truncated_system_response}\n\n请根据以上对话生成一个简短的标题。"}
        ]
        
        # 调用LLM API生成标题
        if USE_OPENAI:
            print("使用OpenAI API生成对话标题")
            response = openai_client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=20,
            )
        else:
            print("使用DeepSeek API生成对话标题")
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=20,
            )
        
        # 提取生成的标题
        title = response.choices[0].message.content.strip()
        print(f"生成的对话标题: '{title}'")
        return title
        
    except Exception as e:
        print(f"生成对话标题时出错: {str(e)}")
        # 如果生成标题失败，返回一个默认标题
        return "新对话"
