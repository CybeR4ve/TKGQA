import json
import os
import uuid
from datetime import datetime
from config import CHAT_HISTORY_DIR

# 聊天会话模型
class ConversationModel:
    conversations = []
    
    @staticmethod
    def load_from_files():
        """从文件加载对话历史"""
        try:
            if os.path.exists(os.path.join(CHAT_HISTORY_DIR, 'conversations.json')):
                with open(os.path.join(CHAT_HISTORY_DIR, 'conversations.json'), 'r', encoding='utf-8') as f:
                    ConversationModel.conversations = json.load(f)
                    return ConversationModel.conversations
        except Exception as e:
            print(f'Error loading conversations: {e}')
        return []
    
    @staticmethod
    def save_to_files():
        """保存对话历史到文件"""
        try:
            with open(os.path.join(CHAT_HISTORY_DIR, 'conversations.json'), 'w', encoding='utf-8') as f:
                json.dump(ConversationModel.conversations, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f'Error saving conversations: {e}')
    
    @staticmethod
    def get_all():
        """获取所有对话"""
        return ConversationModel.conversations
    
    @staticmethod
    def get_by_id(conversation_id):
        """根据ID获取特定对话"""
        return next((c for c in ConversationModel.conversations if c['id'] == conversation_id), None)
    
    @staticmethod
    def create(title=None):
        """创建新对话"""
        conversation_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        if not title:
            title = f'新对话 {len(ConversationModel.conversations) + 1}'
            
        new_conversation = {
            'id': conversation_id,
            'title': title,
            'timestamp': timestamp,
            'messages': []
        }
        
        ConversationModel.conversations.insert(0, new_conversation)
        ConversationModel.save_to_files()
        return new_conversation
    
    @staticmethod
    def delete(conversation_id):
        """删除特定对话"""
        ConversationModel.conversations = [c for c in ConversationModel.conversations if c['id'] != conversation_id]
        ConversationModel.save_to_files()
        return True
    
    @staticmethod
    def add_message(conversation_id, content, sender):
        """向对话添加消息"""
        conversation = ConversationModel.get_by_id(conversation_id)
        if not conversation:
            return None
            
        message_id = str(uuid.uuid4())
        message = {
            'id': message_id,
            'content': content,
            'sender': sender,
            'timestamp': datetime.now().isoformat()
        }
        
        conversation['messages'].append(message)
        
        # 如果这是第一条消息，更新对话标题
        if len(conversation['messages']) == 1:
            conversation['title'] = content[:30] + ('...' if len(content) > 30 else '')
            
        ConversationModel.save_to_files()
        return message
    
    @staticmethod
    def clear_all():
        """清除所有对话"""
        ConversationModel.conversations = []
        ConversationModel.save_to_files()
        return True

# 用户模型（简单实现，实际应用中应使用数据库）
class UserModel:
    users = []
    
    @staticmethod
    def register(email, password, name=None):
        """注册新用户"""
        # 检查邮箱是否已被注册
        if any(u['email'] == email for u in UserModel.users):
            return None
            
        user_id = str(uuid.uuid4())
        user = {
            'id': user_id,
            'email': email,
            'password': password,  # 实际应用中应该加密存储
            'name': name or email.split('@')[0],
            'avatar': None,
            'created_at': datetime.now().isoformat()
        }
        
        UserModel.users.append(user)
        return {k: v for k, v in user.items() if k != 'password'}
    
    @staticmethod
    def login(email, password):
        """用户登录"""
        user = next((u for u in UserModel.users if u['email'] == email and u['password'] == password), None)
        if not user:
            return None
            
        return {k: v for k, v in user.items() if k != 'password'}

# 初始化时加载对话
ConversationModel.conversations = ConversationModel.load_from_files()
