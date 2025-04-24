from flask import Blueprint, request, jsonify
from functools import wraps
import sys
import os

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.auth_service import auth_service

# 创建蓝图
auth_bp = Blueprint('auth', __name__)

# JWT认证装饰器
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 从请求头中获取token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': '缺少认证令牌'}), 401
        
        # 验证token
        user_id = auth_service.verify_jwt_token(token)
        if not user_id:
            return jsonify({'error': '无效或已过期的令牌'}), 401
        
        # 获取用户信息
        current_user = auth_service.get_user_by_id(user_id)
        if not current_user:
            return jsonify({'error': '未找到用户'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册API"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password:
        return jsonify({'error': '邮箱和密码不能为空'}), 400
    
    user = auth_service.register_user(email, password, name)
    if not user:
        return jsonify({'error': '此邮箱已被注册'}), 400
    
    return jsonify({'success': True, 'user': user}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录API"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': '邮箱和密码不能为空'}), 400
    
    user, token = auth_service.login_user(email, password)
    if not user or not token:
        return jsonify({'error': '邮箱或密码不正确'}), 401
    
    return jsonify({
        'success': True,
        'user': user,
        'token': token
    })

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """获取当前用户信息API"""
    return jsonify({
        'success': True,
        'user': current_user
    })

@auth_bp.route('/validate-token', methods=['POST'])
def validate_token():
    """验证令牌有效性API"""
    data = request.json
    token = data.get('token')
    
    if not token:
        return jsonify({'error': '缺少令牌'}), 400
    
    user_id = auth_service.verify_jwt_token(token)
    if not user_id:
        return jsonify({'valid': False}), 200
    
    current_user = auth_service.get_user_by_id(user_id)
    if not current_user:
        return jsonify({'valid': False}), 200
    
    return jsonify({
        'valid': True,
        'user': current_user
    })
