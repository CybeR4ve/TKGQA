from flask import Flask, jsonify, redirect
from flask_cors import CORS
import os
import atexit

# 导入路由蓝图
from routes.chat import chat_bp
from routes.auth import auth_bp
from routes.kg_query import kg_bp

# 导入模型和服务
from models import ConversationModel
from services.mysql_service import mysql_service
from services.neo4j_service import neo4j_service

# 创建Flask应用
app = Flask(__name__)
CORS(app)  # 启用所有路由的CORS

# 注册蓝图
app.register_blueprint(chat_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(kg_bp, url_prefix='/api/kg')

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

# 在应用退出时关闭数据库连接
def close_db_connections():
    try:
        mysql_service.close()
        neo4j_service.close()
        print("数据库连接已关闭")
    except Exception as e:
        print(f"关闭数据库连接时出错: {str(e)}")

# 注册退出处理函数
atexit.register(close_db_connections)

if __name__ == '__main__':
    # 确保在应用启动时加载对话历史
    ConversationModel.load_from_files()
    
    # 测试数据库连接
    print(f"MySQL连接测试: {mysql_service.test_connection()}")
    print(f"Neo4j连接测试: {neo4j_service.test_connection()}")
    
    # 启动应用
    app.run(debug=True, host='0.0.0.0', port=5000)
