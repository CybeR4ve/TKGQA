from neo4j import GraphDatabase
import sys
import os
import json

# 添加父目录到路径，以便导入配置
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

class Neo4jService:
    """
    Neo4j数据库服务类，提供与图数据库的交互功能
    """
    
    _instance = None
    
    def __new__(cls):
        """实现单例模式"""
        if cls._instance is None:
            cls._instance = super(Neo4jService, cls).__new__(cls)
            cls._instance.driver = GraphDatabase.driver(
                NEO4J_URI, 
                auth=(NEO4J_USER, NEO4J_PASSWORD)
            )
        return cls._instance
    
    def close(self):
        """关闭数据库连接"""
        if self.driver:
            self.driver.close()
    
    def run_query(self, query, parameters=None):
        """
        执行Cypher查询
        
        Args:
            query: Cypher查询语句
            parameters: 查询参数字典
            
        Returns:
            查询结果列表，每项为字典形式
        """
        try:
            print(f"执行Cypher查询: {query}")
            print(f"参数: {parameters or {}}")
            
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                results = [record.data() for record in result]
                
                # 以易读的格式输出结果
                print(f"查询结果 (共{len(results)}条记录):")
                if results:
                    # 最多打印前5条结果，避免日志过多
                    for i, record in enumerate(results[:5]):
                        print(f"  记录 {i+1}: {json.dumps(record, ensure_ascii=False)}")
                    if len(results) > 5:
                        print(f"  ... 还有 {len(results) - 5} 条记录 ...")
                else:
                    print("  查询结果为空")
                
                return results
        except Exception as e:
            print(f"执行Cypher查询时出错: {str(e)}")
            print(f"查询语句: {query}")
            raise
    
    def test_connection(self):
        """测试Neo4j连接是否正常"""
        try:
            result = self.run_query("RETURN 'Connection successful' AS message")
            return result[0]['message'] if result else "No result"
        except Exception as e:
            return f"Connection failed: {str(e)}"

# 创建服务实例
neo4j_service = Neo4jService() 