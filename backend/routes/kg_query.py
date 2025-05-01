from flask import Blueprint, request, jsonify, render_template
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
        "query": "自然语言问题",
        "stream": false  // 可选，是否使用流式响应
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
        use_stream = data.get('stream', False)  # 默认不使用流式响应
        print(f"收到知识图谱查询请求: '{natural_language_query}', 流式响应: {use_stream}")
        
        # 1. 生成Cypher查询
        print("步骤1: 生成Cypher查询")
        cypher_query = generate_cypher(natural_language_query)
        print(f"生成的Cypher查询: {cypher_query}")
        
        # 2. 执行Cypher查询
        print("步骤2: 执行Cypher查询")
        query_result = neo4j_service.run_query(cypher_query)
        print(f"查询结果条数: {len(query_result)}")
        
        # 3. 生成自然语言响应
        print(f"步骤3: 生成自然语言响应, 流式: {use_stream}")
        response = generate_natural_language_response(query_result, natural_language_query, stream=False)  # API接口始终用非流式
        print(f"生成的自然语言响应长度: {len(response)}")
        print("知识图谱查询处理完成")
        
        # 4. 返回结果
        return jsonify({
            'status': 'success',
            'query': natural_language_query,
            'cypher': cypher_query,
            'result': query_result,
            'response': response
        })
        
    except Exception as e:
        print(f"知识图谱查询API出错: {str(e)}")
        print(f"错误详情: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@kg_bp.route('/visualization-data', methods=['POST'])
def get_visualization_data():
    """
    获取用于可视化的Neo4j数据
    
    请求体:
    {
        "cypher": "MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 50"  // 自定义Cypher查询
    }
    
    响应:
    {
        "status": "success",
        "data": [...]  // Neo4j查询结果
    }
    """
    try:
        data = request.json
        if not data or 'cypher' not in data:
            # 如果没有提供查询语句，使用默认查询
            cypher_query = "MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 50"
        else:
            cypher_query = data['cypher']
        
        print(f"收到Neo4j可视化数据请求，查询: {cypher_query}")
        
        # 执行Cypher查询
        query_result = neo4j_service.run_query(cypher_query)
        print(f"可视化数据查询结果条数: {len(query_result)}")
        
        return jsonify({
            'status': 'success',
            'data': query_result
        })
        
    except Exception as e:
        print(f"获取Neo4j可视化数据API出错: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500 