from flask import Blueprint, request, jsonify
import json
import sys
import os

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.neo4j_service import neo4j_service
from services.llm_service import generate_cypher, generate_natural_language_response

# 创建蓝图
kg_bp = Blueprint('kg', __name__)

@kg_bp.route('/test', methods=['GET'])
def test_kg_connection():
    """测试知识图谱连接"""
    try:
        result = neo4j_service.test_connection()
        return jsonify({'status': 'success', 'message': result})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@kg_bp.route('/query', methods=['POST'])
def query_knowledge_graph():
    """
    处理知识图谱自然语言查询
    
    请求体:
    {
        "query": "自然语言问题"
    }
    
    响应:
    {
        "query": "原始自然语言问题",
        "cypher": "生成的Cypher查询",
        "result": "查询结果",
        "response": "生成的自然语言响应"
    }
    """
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({'status': 'error', 'message': '缺少查询参数'}), 400
        
        natural_language_query = data['query']
        
        # 1. 生成Cypher查询
        cypher_query = generate_cypher(natural_language_query)
        
        # 2. 执行Cypher查询
        query_result = neo4j_service.run_query(cypher_query)
        
        # 3. 生成自然语言响应
        response = generate_natural_language_response(query_result, natural_language_query)
        
        # 4. 返回结果
        return jsonify({
            'status': 'success',
            'query': natural_language_query,
            'cypher': cypher_query,
            'result': query_result,
            'response': response
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500 