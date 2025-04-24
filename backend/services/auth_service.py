import bcrypt
import jwt
import uuid
from datetime import datetime, timedelta
import sys
import os

# 添加父目录到路径，以便导入配置
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import JWT_SECRET_KEY, JWT_ACCESS_TOKEN_EXPIRES
from services.mysql_service import mysql_service

class AuthService:
    """身份验证服务类，提供用户注册、登录和JWT令牌管理功能"""
    
    @staticmethod
    def register_user(email, password, name=None):
        """
        注册新用户
        
        Args:
            email: 用户邮箱
            password: 用户密码
            name: 用户名（可选）
            
        Returns:
            注册成功返回用户信息字典，失败返回None
        """
        try:
            # 检查邮箱是否已存在
            existing_user = mysql_service.execute_query(
                "SELECT * FROM users WHERE email = %s", (email,)
            )
            
            if existing_user:
                print(f"邮箱 {email} 已被注册")
                return None
            
            # 生成用户ID
            user_id = str(uuid.uuid4())
            
            # 哈希密码
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # 插入用户记录
            mysql_service.execute_update(
                "INSERT INTO users (id, email, password, name) VALUES (%s, %s, %s, %s)",
                (user_id, email, hashed_password.decode('utf-8'), name or email.split('@')[0])
            )
            
            # 返回用户信息（不包含密码）
            user = mysql_service.execute_query(
                "SELECT id, email, name, created_at FROM users WHERE id = %s", (user_id,)
            )
            
            if user:
                return user[0]
            return None
            
        except Exception as e:
            print(f"注册用户时出错: {str(e)}")
            return None
    
    @staticmethod
    def login_user(email, password):
        """
        用户登录
        
        Args:
            email: 用户邮箱
            password: 用户密码
            
        Returns:
            登录成功返回(用户信息,JWT令牌)元组，失败返回(None,None)
        """
        try:
            # 查询用户
            users = mysql_service.execute_query(
                "SELECT * FROM users WHERE email = %s", (email,)
            )
            
            if not users:
                print(f"未找到邮箱为 {email} 的用户")
                return None, None
            
            user = users[0]
            
            # 验证密码
            if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                print("密码不正确")
                return None, None
            
            # 生成JWT令牌
            token = AuthService.generate_jwt_token(user['id'])
            
            # 返回用户信息（不包含密码）和令牌
            user_info = {k: v for k, v in user.items() if k != 'password'}
            
            return user_info, token
            
        except Exception as e:
            print(f"用户登录时出错: {str(e)}")
            return None, None
    
    @staticmethod
    def generate_jwt_token(user_id):
        """
        生成JWT访问令牌
        
        Args:
            user_id: 用户ID
            
        Returns:
            JWT令牌字符串
        """
        try:
            payload = {
                'exp': datetime.utcnow() + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES),
                'iat': datetime.utcnow(),
                'sub': user_id
            }
            
            return jwt.encode(
                payload,
                JWT_SECRET_KEY,
                algorithm='HS256'
            )
            
        except Exception as e:
            print(f"生成JWT令牌时出错: {str(e)}")
            return None
    
    @staticmethod
    def verify_jwt_token(token):
        """
        验证JWT令牌
        
        Args:
            token: JWT令牌字符串
            
        Returns:
            验证成功返回用户ID，失败返回None
        """
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=['HS256']
            )
            
            return payload['sub']
            
        except jwt.ExpiredSignatureError:
            print("令牌已过期")
            return None
        except jwt.InvalidTokenError:
            print("无效的令牌")
            return None
    
    @staticmethod
    def get_user_by_id(user_id):
        """
        根据ID获取用户信息
        
        Args:
            user_id: 用户ID
            
        Returns:
            用户信息字典，不包含密码
        """
        try:
            users = mysql_service.execute_query(
                "SELECT id, email, name, created_at FROM users WHERE id = %s", (user_id,)
            )
            
            return users[0] if users else None
            
        except Exception as e:
            print(f"获取用户信息时出错: {str(e)}")
            return None

# 创建服务实例
auth_service = AuthService() 