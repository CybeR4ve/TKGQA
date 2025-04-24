from neo4j import GraphDatabase
import sys
import os

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
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except Exception as e:
            print(f"执行Cypher查询时出错: {str(e)}")
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