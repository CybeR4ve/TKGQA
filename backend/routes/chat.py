from flask import Blueprint, request, jsonify, Response
import json
import uuid
from datetime import datetime
import sys
import os
import re

# 添加父目录到路径，以便导入LLM服务和Neo4j服务
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.llm_service import get_llm_response, generate_cypher, generate_natural_language_response, generate_title_for_conversation
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
    
    # 按时间戳倒序排序（最新的在前面）
    user_conversations_data.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify(user_conversations_data)

@chat_bp.route('/conversations', methods=['POST'])
@token_required
def create_conversation(current_user):
    """创建新对话并关联到当前用户"""
    data = request.json
    title = data.get('title', '新对话')
    
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
    
    # 更新对话的时间戳为当前时间，确保活跃的对话显示在最前面
    conversation['timestamp'] = datetime.now().isoformat()
    
    # 如果是新对话（没有之前的消息）且标题是默认的"新对话"，才设置截断标题
    if len(conversation['messages']) == 2 and conversation['title'] == '新对话':
        # 截取前9个字符并添加省略号
        truncated_title = message_content[:9] + "..." if len(message_content) > 9 else message_content
        conversation['title'] = truncated_title
        ConversationModel.save_to_files()
    
    # 判断是否为知识图谱查询
    is_knowledge_graph_query = is_kg_query(message_content)
    
    # 如果对话消息数量达到2条（1个用户消息+1个系统回复），则异步生成标题
    # 在响应结束后触发标题生成任务
    should_generate_title = len(conversation['messages']) == 2
    
    # 使用流式模式获取LLM响应
    try:
        if is_knowledge_graph_query:
            # 处理知识图谱查询，提取不带提示词的原始查询
            original_query = message_content.replace("使用知识图谱查询", "").strip()
            
            # 初始化完整响应变量
            full_response = ""
            
            def generate_kg_stream():
                nonlocal full_response
                
                # 立即发送正在处理的状态
                progress_update = "正在查询知识图谱..."
                full_response = progress_update
                yield f"data: {json.dumps({'content': progress_update, 'full_response': full_response})}\n\n"
                
                # 生成Cypher查询
                cypher_query = generate_cypher(original_query)
                
                # 发送进度更新 - 查询已生成
                progress_update = "查询语句已生成，正在执行查询..."
                full_response = progress_update
                yield f"data: {json.dumps({'content': progress_update, 'full_response': full_response})}\n\n"
                
                # 执行Neo4j查询
                query_result = neo4j_service.run_query(cypher_query)
                
                # 发送进度更新 - 查询完成
                progress_update = "查询完成，生成回答中..."
                full_response = progress_update
                yield f"data: {json.dumps({'content': progress_update, 'full_response': full_response})}\n\n"
                
                # 使用流式响应生成自然语言解释
                nl_response = generate_natural_language_response(query_result, original_query, stream=True)
                
                # 初始化累积响应
                accumulated_content = ""
                
                # 处理流式响应
                for chunk in nl_response:
                    if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                        content = chunk.choices[0].delta.content or ""
                        accumulated_content += content
                        full_response = f"{accumulated_content}\n\n---\n*基于知识图谱查询*"
                        yield f"data: {json.dumps({'content': content, 'full_response': full_response})}\n\n"
                
                # 更新系统消息
                system_message['content'] = full_response
                
                # 保存更新的对话
                ConversationModel.save_to_files()
                
                # 发送结束标记
                yield f"data: {json.dumps({'done': True, 'message_id': system_message_id, 'userMessageId': user_message_id, 'full_response': full_response})}\n\n"
                
                # 在响应结束后，如果是新对话的第一次交互，异步生成标题
                if should_generate_title:
                    try:
                        # 获取用户消息和系统回复
                        user_message = conversation['messages'][0]['content']
                        system_message_content = full_response
                        
                        # 生成标题
                        new_title = generate_title_for_conversation(user_message, system_message_content)
                        
                        # 更新对话标题
                        conversation['title'] = new_title
                        
                        # 更新时间戳
                        conversation['timestamp'] = datetime.now().isoformat()
                        
                        ConversationModel.save_to_files()
                        
                        # 发送标题更新通知
                        yield f"data: {json.dumps({'title_updated': True, 'conversation_id': conversation_id, 'new_title': new_title})}\n\n"
                    except Exception as e:
                        print(f"生成标题时出错: {str(e)}")
                        # 失败时不中断主流程
                
            return Response(generate_kg_stream(), mimetype='text/event-stream')
            
        else:
            # 普通LLM对话，使用流式响应
            # 获取完整的对话历史，不包括当前创建的系统消息
            conversation_history = conversation['messages'][:-1]
            
            # 获取流式响应
            response = get_llm_response(message_content, conversation_history)
            
            # 初始化完整响应变量
            full_response = ""
            
            def generate_stream():
                nonlocal full_response
                
                for chunk in response:
                    if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                        content = chunk.choices[0].delta.content or ""
                        full_response += content
                        yield f"data: {json.dumps({'content': content, 'full_response': full_response})}\n\n"
                
                # 更新系统消息
                system_message['content'] = full_response
                
                # 保存更新的对话
                ConversationModel.save_to_files()
                
                # 发送结束标记
                yield f"data: {json.dumps({'done': True, 'message_id': system_message_id, 'userMessageId': user_message_id, 'full_response': full_response})}\n\n"
                
                # 在响应结束后，如果是新对话的第一次交互，异步生成标题
                if should_generate_title:
                    try:
                        # 获取用户消息和系统回复
                        user_message = conversation['messages'][0]['content']
                        system_message_content = full_response
                        
                        # 生成标题
                        new_title = generate_title_for_conversation(user_message, system_message_content)
                        
                        # 更新对话标题
                        conversation['title'] = new_title
                        
                        # 更新时间戳
                        conversation['timestamp'] = datetime.now().isoformat()
                        
                        ConversationModel.save_to_files()
                        
                        # 发送标题更新通知
                        yield f"data: {json.dumps({'title_updated': True, 'conversation_id': conversation_id, 'new_title': new_title})}\n\n"
                    except Exception as e:
                        print(f"生成标题时出错: {str(e)}")
                        # 失败时不中断主流程
            
            return Response(generate_stream(), mimetype='text/event-stream')
    
    except Exception as e:
        print(f"处理消息时出错: {str(e)}")
        return jsonify({'error': f'处理消息时出错: {str(e)}'}), 500

@chat_bp.route('/conversations/<conversation_id>/title', methods=['PUT'])
@token_required
def update_conversation_title(current_user, conversation_id):
    """手动更新对话标题，需要验证所有权"""
    # 检查对话是否属于当前用户
    is_owner = mysql_service.execute_query(
        "SELECT 1 FROM user_conversations WHERE user_id = %s AND conversation_id = %s",
        (current_user['id'], conversation_id)
    )
    
    if not is_owner:
        return jsonify({'error': '无权限修改此对话'}), 403
    
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    
    data = request.json
    new_title = data.get('title')
    
    if not new_title:
        return jsonify({'error': '标题不能为空'}), 400
    
    # 更新标题
    conversation['title'] = new_title
    
    # 更新时间戳
    conversation['timestamp'] = datetime.now().isoformat()
    
    ConversationModel.save_to_files()
    
    return jsonify({'success': True, 'conversation_id': conversation_id, 'title': new_title})

@chat_bp.route('/conversations/<conversation_id>/generate-title', methods=['POST'])
@token_required
def generate_title(current_user, conversation_id):
    """基于对话内容自动生成标题，需要验证所有权"""
    # 检查对话是否属于当前用户
    is_owner = mysql_service.execute_query(
        "SELECT 1 FROM user_conversations WHERE user_id = %s AND conversation_id = %s",
        (current_user['id'], conversation_id)
    )
    
    if not is_owner:
        return jsonify({'error': '无权限修改此对话'}), 403
    
    conversation = ConversationModel.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': '未找到对话'}), 404
    
    # 获取消息
    messages = conversation['messages']
    
    # 确保有足够的消息进行标题生成
    if len(messages) < 2:
        return jsonify({'error': '对话内容不足，无法生成标题', 'success': False}), 400
    
    # 找到最近的一对用户消息和系统回复
    user_message = None
    system_response = None
    
    for i in range(len(messages) - 1):
        if messages[i]['sender'] == 'user' and messages[i+1]['sender'] == 'system':
            user_message = messages[i]['content']
            system_response = messages[i+1]['content']
            # 我们找到了最新的一对，但继续循环找到最后一对
    
    if not user_message or not system_response:
        return jsonify({'error': '找不到有效的对话内容', 'success': False}), 400
    
    try:
        # 生成标题
        new_title = generate_title_for_conversation(user_message, system_response)
        
        # 确保标题不为空
        if not new_title or new_title.strip() == "":
            new_title = "新对话"
        
        # 更新标题
        conversation['title'] = new_title
        
        # 更新时间戳
        conversation['timestamp'] = datetime.now().isoformat()
        
        ConversationModel.save_to_files()
        
        return jsonify({
            'success': True, 
            'conversation_id': conversation_id, 
            'title': new_title
        })
    except Exception as e:
        print(f"生成标题时出错: {str(e)}")
        return jsonify({
            'error': f'生成标题时出错: {str(e)}', 
            'success': False
        }), 500
