from flask import Blueprint, request, jsonify, Response
import json
import uuid
from datetime import datetime
from models import ConversationModel
import sys
import os

# 添加父目录到路径，以便导入LLM服务
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.llm_service import get_llm_response

# 创建蓝图
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/conversations', methods=['GET'])
def get_conversations():
    """获取所有对话"""
    return jsonify(ConversationModel.get_all())

@chat_bp.route('/conversations', methods=['POST'])
def create_conversation():
    """创建新对话"""
    title = request.json.get('title', None)
    new_conversation = ConversationModel.create(title)
    return jsonify(new_conversation)

@chat_bp.route('/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """获取特定对话"""
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    return jsonify(conversation)

@chat_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """删除特定对话"""
    ConversationModel.delete(conversation_id)
    return jsonify({'success': True})

@chat_bp.route('/conversations/clear', methods=['POST'])
def clear_all_conversations():
    """清除所有对话"""
    ConversationModel.clear_all()
    return jsonify({'success': True, 'message': '所有对话已清除'})

# 移除非流式消息API端点，只保留下面的流式API

@chat_bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
def send_message(conversation_id):
    """流式发送消息并获取响应"""
    message_content = request.json.get('content')
    if not message_content:
        return jsonify({'error': '消息内容不能为空'}), 400
    
    # 查找对话
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    
    # 创建用户消息
    user_message = ConversationModel.add_message(conversation_id, message_content, 'user')
    user_message_id = user_message['id']
    
    # 创建系统消息占位符
    system_message = ConversationModel.add_message(conversation_id, '', 'system')
    system_message_id = system_message['id']
    
    # 使用流式模式获取LLM响应
    try:
        # 获取流式响应
        stream_response = get_llm_response(message_content, conversation['messages'][:-1])
        
        def generate():
            full_response = ""
            
            # 对于流式响应处理
            for chunk in stream_response:
                if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        full_response += content
                        # 发送数据到前端
                        yield f"data: {json.dumps({'content': content, 'full_response': full_response, 'message_id': system_message_id, 'userMessageId': user_message_id})}\n\n"
            
            # 更新完整的消息内容
            for conv in ConversationModel.conversations:
                if conv['id'] == conversation_id:
                    for msg in conv['messages']:
                        if msg['id'] == system_message_id:
                            msg['content'] = full_response
                            break
            
            ConversationModel.save_to_files()
            
            # 发送完成信号
            yield f"data: {json.dumps({'done': True, 'message_id': system_message_id, 'userMessageId': user_message_id, 'full_response': full_response})}\n\n"
        
        # 设置流式响应的头部
        headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',  # 禁用Nginx缓冲
            'Connection': 'keep-alive'
        }
        
        return Response(generate(), mimetype='text/event-stream', headers=headers)
        
    except Exception as e:
        # 如果出错，删除最后添加的系统消息
        for conv in ConversationModel.conversations:
            if conv['id'] == conversation_id:
                conv['messages'] = [msg for msg in conv['messages'] if msg['id'] != system_message_id]
                break
        
        ConversationModel.save_to_files()
        print(f"流式响应错误: {str(e)}")
        return jsonify({'error': str(e)}), 500
