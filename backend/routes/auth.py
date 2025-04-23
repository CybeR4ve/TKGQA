from flask import Blueprint, request, jsonify
from models import UserModel

# 创建蓝图
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册API"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password:
        return jsonify({'error': '邮箱和密码不能为空'}), 400
    
    user = UserModel.register(email, password, name)
    if not user:
        return jsonify({'error': '此邮箱已被注册'}), 400
    
    return jsonify(user)

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录API"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': '邮箱和密码不能为空'}), 400
    
    user = UserModel.login(email, password)
    if not user:
        return jsonify({'error': '邮箱或密码不正确'}), 401
    
    return jsonify(user)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """用户登出API（简单实现，实际应用中应处理会话或令牌）"""
    return jsonify({'success': True})

@auth_bp.route('/user', methods=['GET'])
def get_current_user():
    """获取当前用户信息API（简单实现，实际应用中应从会话或令牌中获取用户ID）"""
    # 这里为了演示，返回一个模拟用户
    if not UserModel.users:
        return jsonify({'error': '未找到用户'}), 404
    
    user = UserModel.users[0]
    user_info = {k: v for k, v in user.items() if k != 'password'}
    return jsonify(user_info)
