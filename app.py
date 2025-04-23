from flask import Flask, request, jsonify, render_template, redirect
from flask_cors import CORS
import os
import json
import uuid
import time
from datetime import datetime
from openai import OpenAI

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# 你应该在生产环境中使用环境变量存储这些值
# OpenAI API key - 在生产环境中应该使用环境变量
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'your_api_key_here')
# 可以根据需要切换不同的API提供商
USE_OPENAI = True  # 设置为False可以使用DeepSeek API

# DeepSeek API 配置
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', 'your_deepseek_api_key_here')
DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
DEEPSEEK_MODEL = 'deepseek-chat'

# OpenAI API 配置
OPENAI_MODEL = 'gpt-3.5-turbo'

# 初始化OpenAI客户端
client = OpenAI(api_key=OPENAI_API_KEY)

# 聊天历史文件存储目录
CHAT_HISTORY_DIR = 'chat_histories'
if not os.path.exists(CHAT_HISTORY_DIR):
    os.makedirs(CHAT_HISTORY_DIR)

# In-memory storage for conversations (replace with a database in production)
conversations = []

# 从文件加载对话历史（如果存在）
def load_conversations_from_files():
    try:
        if os.path.exists(os.path.join(CHAT_HISTORY_DIR, 'conversations.json')):
            with open(os.path.join(CHAT_HISTORY_DIR, 'conversations.json'), 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f'Error loading conversations: {e}')
    return []

# 保存对话历史到文件
def save_conversations_to_files():
    try:
        with open(os.path.join(CHAT_HISTORY_DIR, 'conversations.json'), 'w', encoding='utf-8') as f:
            json.dump(conversations, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f'Error saving conversations: {e}')

# 初始化时加载对话历史
conversations = load_conversations_from_files()

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    return jsonify(conversations)

@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    conversation_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    new_conversation = {
        'id': conversation_id,
        'title': request.json.get('title', f'新对话 {len(conversations) + 1}'),
        'timestamp': timestamp,
        'messages': []
    }
    
    conversations.insert(0, new_conversation)
    save_conversations_to_files()  # 保存到文件
    return jsonify(new_conversation)

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    global conversations
    conversations = [conv for conv in conversations if conv['id'] != conversation_id]
    save_conversations_to_files()  # 保存到文件
    return jsonify({'success': True})

@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
def send_message(conversation_id):
    message_content = request.json.get('content')
    if not message_content:
        return jsonify({'error': '消息内容不能为空'}), 400
    
    # 查找对话
    conversation = next((c for c in conversations if c['id'] == conversation_id), None)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    
    # 创建用户消息
    user_message = {
        'id': str(uuid.uuid4()),
        'content': message_content,
        'sender': 'user',
        'timestamp': datetime.now().isoformat()
    }
    
    # 将用户消息添加到对话中
    conversation['messages'].append(user_message)
    
    # 如果这是第一条消息，更新对话标题
    if len(conversation['messages']) == 1:
        conversation['title'] = message_content[:30] + ('...' if len(message_content) > 30 else '')
    
    # 从 LLM API 获取响应
    try:
        # 传递完整的对话历史给 LLM API
        ai_response = get_llm_response(message_content, conversation['messages'])
        
        # 创建系统消息
        system_message = {
            'id': str(uuid.uuid4()),
            'content': ai_response,
            'sender': 'system',
            'timestamp': datetime.now().isoformat()
        }
        
        # 将系统消息添加到对话中
        conversation['messages'].append(system_message)
        
        # 保存对话历史到文件
        save_conversations_to_files()
        
        return jsonify({
            'userMessage': user_message,
            'systemMessage': system_message
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_llm_response(prompt, conversation_history):
    """
    从大型语言模型 API 获取响应。
    支持 OpenAI API 和 DeepSeek API。
    实现多轮对话的上下文传递。
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
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
        else:
            # 使用 DeepSeek API
            deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            response = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
    
    except Exception as e:
        print(f"调用 LLM API 时出错: {str(e)}")
        return f"生成响应时出错: {str(e)}"



@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    # 获取特定对话的详细信息
    conversation = next((c for c in conversations if c['id'] == conversation_id), None)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    return jsonify(conversation)

# 添加一个路由用于清除所有对话历史（谨慎使用）
@app.route('/api/conversations/clear', methods=['POST'])
def clear_all_conversations():
    global conversations
    conversations = []
    save_conversations_to_files()
    return jsonify({'success': True, 'message': '所有对话已清除'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
