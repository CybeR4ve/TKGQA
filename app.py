from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime
from openai import OpenAI

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# 你应该在生产环境中使用环境变量存储这些值
API_KEY = "your_api_key_here"
BASE_URL = "https://api.deepseek.com"  # DeepSeek API 的基础 URL
MODEL_NAME = "deepseek-chat"  # 使用的模型名称

# In-memory storage for conversations (replace with a database in production)
conversations = []

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
    return jsonify(new_conversation)

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
        
        return jsonify({
            'userMessage': user_message,
            'systemMessage': system_message
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_llm_response(prompt, conversation_history):
    """
    从大型语言模型 API 获取响应。
    这个示例使用 DeepSeek API，但你可以替换为任何 LLM API。
    """
    try:
        # 创建 OpenAI 客户端（用于 DeepSeek API，它兼容 OpenAI 的接口）
        client = OpenAI(api_key=API_KEY, base_url=BASE_URL)
        
        # 将对话历史转换为 API 期望的格式
        messages = []
        
        # 添加所有历史消息作为上下文（完整的对话历史）
        for msg in conversation_history:
            role = "user" if msg['sender'] == 'user' else "assistant"
            messages.append({"role": role, "content": msg['content']})
        
        # 如果最后一条消息不是用户的，添加当前提示
        if not messages or messages[-1]['role'] != 'user':
            messages.append({"role": "user", "content": prompt})
        
        # 调用 API
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.7
        )
        
        # 提取助手的消息
        return response.choices[0].message.content
    
    except Exception as e:
        print(f"调用 LLM API 时出错: {str(e)}")
        return f"生成响应时出错: {str(e)}"    

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    global conversations
    conversations = [c for c in conversations if c['id'] != conversation_id]
    return jsonify({'success': True})

@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    # 获取特定对话的详细信息
    conversation = next((c for c in conversations if c['id'] == conversation_id), None)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    return jsonify(conversation)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
