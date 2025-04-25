from flask import Blueprint, request, jsonify, Response
import json
import uuid
from datetime import datetime
import sys
import os
import re

# 添加父目录到路径，以便导入LLM服务和Neo4j服务
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.llm_service import get_llm_response, generate_cypher, generate_natural_language_response
from services.neo4j_service import neo4j_service
from services.mysql_service import mysql_service
from routes.auth import token_required
from models import ConversationModel

# 创建蓝图
chat_bp = Blueprint('chat', __name__)

# 判断查询是否为知识图谱查询的正则模式
KG_QUERY_PATTERNS = [
    r'.*图谱.*',
    r'.*谁是.*',
    r'.*什么时候.*',
    r'.*在哪里.*',
    r'.*之间的关系.*',
    r'.*如何影响.*',
    r'.*属于.*',
    r'.*发生了什么.*',
]

def is_kg_query(query):
    """判断是否为知识图谱查询"""
    for pattern in KG_QUERY_PATTERNS:
        if re.search(pattern, query, re.IGNORECASE):
            return True
    return False

@chat_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """获取当前用户的所有对话"""
    # 查询当前用户的对话ID
    user_conversations = mysql_service.execute_query(
        "SELECT conversation_id FROM user_conversations WHERE user_id = %s",
        (current_user['id'],)
    )
    
    # 获取用户的对话ID列表
    user_conversation_ids = [uc['conversation_id'] for uc in user_conversations]
    
    # 如果用户没有对话，返回空列表
    if not user_conversation_ids:
        return jsonify([])
    
    # 过滤出属于用户的对话
    user_conversations_data = [
        conv for conv in ConversationModel.get_all() 
        if conv['id'] in user_conversation_ids
    ]
    
    return jsonify(user_conversations_data)

@chat_bp.route('/conversations', methods=['POST'])
@token_required
def create_conversation(current_user):
    """创建新对话并关联到当前用户"""
    data = request.json
    title = data.get('title', f'新对话 {len(ConversationModel.conversations) + 1}')
    
    conversation_id = str(uuid.uuid4())
    conversation = {
        'id': conversation_id,
        'title': title,
        'timestamp': datetime.now().isoformat(),
        'messages': []
    }
    
    # 添加到对话列表
    ConversationModel.conversations.append(conversation)
    
    # 创建用户-对话关联
    try:
        mysql_service.execute_update(
            "INSERT INTO user_conversations (user_id, conversation_id) VALUES (%s, %s)",
            (current_user['id'], conversation_id)
        )
        print(f"为用户 {current_user['id']} 创建了新对话 {conversation_id}")
    except Exception as e:
        print(f"创建用户-对话关联时出错: {str(e)}")
        # 如果关联创建失败，从列表中移除对话
        ConversationModel.conversations = [c for c in ConversationModel.conversations if c['id'] != conversation_id]
        return jsonify({'error': '创建对话失败'}), 500
    
    ConversationModel.save_to_files()
    return jsonify(conversation)

@chat_bp.route('/conversations/<conversation_id>', methods=['GET'])
@token_required
def get_conversation(current_user, conversation_id):
    """获取特定对话，需要验证所有权"""
    # 检查对话是否属于当前用户
    is_owner = mysql_service.execute_query(
        "SELECT 1 FROM user_conversations WHERE user_id = %s AND conversation_id = %s",
        (current_user['id'], conversation_id)
    )
    
    if not is_owner:
        return jsonify({'error': '无权限访问此对话'}), 403
    
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    return jsonify(conversation)

@chat_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
@token_required
def delete_conversation(current_user, conversation_id):
    """删除特定对话，需要验证所有权"""
    # 检查对话是否属于当前用户
    is_owner = mysql_service.execute_query(
        "SELECT 1 FROM user_conversations WHERE user_id = %s AND conversation_id = %s",
        (current_user['id'], conversation_id)
    )
    
    if not is_owner:
        return jsonify({'error': '无权限删除此对话'}), 403
    
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    
    # 删除对话
    ConversationModel.conversations = [c for c in ConversationModel.conversations if c['id'] != conversation_id]
    
    # 删除用户-对话关联
    mysql_service.execute_update(
        "DELETE FROM user_conversations WHERE user_id = %s AND conversation_id = %s",
        (current_user['id'], conversation_id)
    )
    
    ConversationModel.save_to_files()
    return jsonify({'status': 'success'})

@chat_bp.route('/conversations/clear', methods=['POST'])
@token_required
def clear_all_conversations(current_user):
    """清除当前用户的所有对话"""
    # 获取用户的所有对话ID
    user_conversations = mysql_service.execute_query(
        "SELECT conversation_id FROM user_conversations WHERE user_id = %s",
        (current_user['id'],)
    )
    
    user_conversation_ids = [uc['conversation_id'] for uc in user_conversations]
    
    # 从对话列表中移除用户的对话
    ConversationModel.conversations = [
        c for c in ConversationModel.conversations 
        if c['id'] not in user_conversation_ids
    ]
    
    # 删除所有用户-对话关联
    mysql_service.execute_update(
        "DELETE FROM user_conversations WHERE user_id = %s",
        (current_user['id'],)
    )
    
    ConversationModel.save_to_files()
    return jsonify({'success': True, 'message': '所有对话已清除'})

@chat_bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
@token_required
def send_message(current_user, conversation_id):
    """流式发送消息并获取响应，需要验证所有权"""
    # 检查对话是否属于当前用户
    is_owner = mysql_service.execute_query(
        "SELECT 1 FROM user_conversations WHERE user_id = %s AND conversation_id = %s",
        (current_user['id'], conversation_id)
    )
    
    if not is_owner:
        return jsonify({'error': '无权限向此对话发送消息'}), 403
    
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    
    data = request.json
    message_content = data.get('content', '')
    
    if not message_content:
        return jsonify({'error': '消息内容不能为空'}), 400
    
    # 创建用户消息
    user_message_id = str(uuid.uuid4())
    user_message = {
        'id': user_message_id,
        'content': message_content,
        'sender': 'user',
        'timestamp': datetime.now().isoformat()
    }
    
    # 创建系统消息
    system_message_id = str(uuid.uuid4())
    system_message = {
        'id': system_message_id,
        'content': '',
        'sender': 'system',
        'timestamp': datetime.now().isoformat()
    }
    
    # 添加消息到对话
    conversation['messages'].append(user_message)
    conversation['messages'].append(system_message)
    
    # 判断是否为知识图谱查询
    is_knowledge_graph_query = is_kg_query(message_content)
    
    # 使用流式模式获取LLM响应
    try:
        if is_knowledge_graph_query:
            # 知识图谱查询处理
            def generate():
                # 发送处理中的状态
                yield f"data: {json.dumps({'content': '正在查询知识图谱...', 'full_response': '正在查询知识图谱...', 'message_id': system_message_id, 'userMessageId': user_message_id})}\n\n"
                
                try:
                    # 1. 生成Cypher查询
                    cypher_query = generate_cypher(message_content)
                    # 发送Cypher生成完成的状态
                    progress_message = "正在查询知识图谱...\n查询语句已生成，正在执行..."
                    yield f"data: {json.dumps({'content': '查询语句已生成，正在执行...', 'full_response': progress_message, 'message_id': system_message_id, 'userMessageId': user_message_id})}\n\n"
                    
                    # 2. 执行Cypher查询
                    query_result = neo4j_service.run_query(cypher_query)
                    # 发送查询完成的状态
                    progress_message = "正在查询知识图谱...\n查询语句已生成，正在执行...\n查询完成，生成回答中..."
                    yield f"data: {json.dumps({'content': '查询完成，生成回答中...', 'full_response': progress_message, 'message_id': system_message_id, 'userMessageId': user_message_id})}\n\n"
                    
                    # 3. 生成自然语言响应
                    response = generate_natural_language_response(query_result, message_content)
                    
                    # 构建完整响应内容
                    full_response = f"{response}\n\n---\n*通过知识图谱查询生成的回答*"
                    
                    # 更新完整的消息内容
                    for conv in ConversationModel.conversations:
                        if conv['id'] == conversation_id:
                            for msg in conv['messages']:
                                if msg['id'] == system_message_id:
                                    msg['content'] = full_response
                                    break
                    
                    ConversationModel.save_to_files()
                    
                    # 发送完成信号
                    yield f"data: {json.dumps({'content': full_response, 'full_response': full_response, 'done': True, 'message_id': system_message_id, 'userMessageId': user_message_id})}\n\n"
                
                except Exception as e:
                    error_message = f"知识图谱查询出错: {str(e)}"
                    print(error_message)
                    
                    # 更新错误消息
                    for conv in ConversationModel.conversations:
                        if conv['id'] == conversation_id:
                            for msg in conv['messages']:
                                if msg['id'] == system_message_id:
                                    msg['content'] = error_message
                                    break
                    
                    ConversationModel.save_to_files()
                    
                    # 发送错误信号
                    yield f"data: {json.dumps({'content': error_message, 'full_response': error_message, 'done': True, 'message_id': system_message_id, 'userMessageId': user_message_id})}\n\n"
        else:
            # 常规LLM响应处理
        # 获取流式响应
            stream_response = get_llm_response(message_content, conversation['messages'][:-2])
        
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
        print(f"处理消息时出错: {str(e)}")
        return jsonify({'error': f'处理消息时出错: {str(e)}'}), 500
