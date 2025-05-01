// API端点基础URL
export const API_BASE_URL = 'http://localhost:5000/api';

// 配置参数
export const CONFIG = {
  // 认证相关
  auth: {
    tokenStorageKey: 'token',
    userStorageKey: 'user',
    // 登录过期时间（毫秒）
    tokenExpiry: 86400000, // 24小时
  },
  
  // API路径
  api: {
    // 对话相关
    conversations: `${API_BASE_URL}/conversations`,
    messages: (conversationId: string) => `${API_BASE_URL}/conversations/${conversationId}/messages`,
    
    // 认证相关
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    validateToken: `${API_BASE_URL}/auth/validate-token`,
    me: `${API_BASE_URL}/auth/me`,
    
    // 知识图谱相关
    kgQuery: `${API_BASE_URL}/kg/query`,
    kgVisualizationData: `${API_BASE_URL}/kg/visualization-data`,
  },
  
  // UI相关
  ui: {
    // 深色模式
    themeStorageKey: 'theme',
    defaultTheme: 'light',
  }
}; 