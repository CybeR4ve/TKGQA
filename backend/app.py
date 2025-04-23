from flask import Flask, jsonify, redirect
from flask_cors import CORS
import os

# 导入路由蓝图
from routes.chat import chat_bp
from routes.auth import auth_bp

# 导入模型
from models import ConversationModel

# 创建Flask应用
app = Flask(__name__)
CORS(app)  # 启用所有路由的CORS

# 注册蓝图
app.register_blueprint(chat_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')

# 首页路由（如果前后端在一起部署）
@app.route('/')
def index():
    return redirect('/index.html')

# 健康检查路由
@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "message": "API服务正常运行"
    })

# 错误处理
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': '找不到该API路由'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '服务器内部错误'}), 500

if __name__ == '__main__':
    # 确保在应用启动时加载对话历史
    ConversationModel.load_from_files()
    # 启动应用
    app.run(debug=True, host='0.0.0.0', port=5000)
