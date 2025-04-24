import mysql.connector
import sys
import os

# 添加父目录到路径，以便导入配置
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT

class MySQLService:
    """MySQL数据库服务类，提供与关系型数据库的交互功能"""
    
    _instance = None
    
    def __new__(cls):
        """实现单例模式"""
        if cls._instance is None:
            cls._instance = super(MySQLService, cls).__new__(cls)
            cls._instance._connect()
            cls._instance._create_tables()
        return cls._instance
    
    def _connect(self):
        """连接到MySQL数据库"""
        try:
            self.connection = mysql.connector.connect(
                host=MYSQL_HOST,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                port=MYSQL_PORT,
                connection_timeout=180,  # 增加连接超时时间
                autocommit=True  # 自动提交事务，减少连接保持时间
            )
            print("MySQL数据库连接成功！")
        except mysql.connector.Error as err:
            print(f"MySQL数据库连接失败: {err}")
            # 如果数据库不存在，则创建
            if err.errno == mysql.connector.errorcode.ER_BAD_DB_ERROR:
                self._create_database()
            else:
                raise
    
    def _create_database(self):
        """创建数据库（如果不存在）"""
        try:
            conn = mysql.connector.connect(
                host=MYSQL_HOST,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                port=MYSQL_PORT
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE {MYSQL_DATABASE}")
            cursor.close()
            conn.close()
            print(f"数据库 {MYSQL_DATABASE} 创建成功！")
            # 重新连接到新创建的数据库
            self._connect()
        except mysql.connector.Error as err:
            print(f"创建数据库失败: {err}")
            raise
    
    def _create_tables(self):
        """创建必要的表（如果不存在）"""
        cursor = self.connection.cursor()
        
        # 创建用户表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # 创建用户-会话关联表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_conversations (
            user_id VARCHAR(36),
            conversation_id VARCHAR(36),
            PRIMARY KEY (user_id, conversation_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        ''')
        
        self.connection.commit()
        cursor.close()
        print("数据表检查/创建完成！")
    
    def execute_query(self, query, params=None):
        """执行查询并返回结果"""
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute(query, params or ())
        result = cursor.fetchall()
        cursor.close()
        return result
    
    def execute_update(self, query, params=None):
        """执行更新操作并返回影响的行数"""
        cursor = self.connection.cursor()
        cursor.execute(query, params or ())
        self.connection.commit()
        affected_rows = cursor.rowcount
        cursor.close()
        return affected_rows
    
    def close(self):
        """关闭数据库连接"""
        if hasattr(self, 'connection') and self.connection.is_connected():
            self.connection.close()
            print("MySQL数据库连接关闭！")
    
    def test_connection(self):
        """测试数据库连接是否正常"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT 'Connection successful' AS result")
            result = cursor.fetchone()
            cursor.close()
            return result[0]
        except Exception as e:
            return f"Connection failed: {str(e)}"

# 创建服务实例
mysql_service = MySQLService() 