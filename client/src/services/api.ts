import { API_BASE_URL, CONFIG } from '../config';

// 获取本地存储的令牌
const getToken = () => localStorage.getItem(CONFIG.auth.tokenStorageKey);

// 基本的fetch包装器，自动添加认证头
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // 处理认证错误
  if (response.status === 401) {
    // 令牌过期或无效，清除本地存储
    localStorage.removeItem(CONFIG.auth.tokenStorageKey);
    localStorage.removeItem(CONFIG.auth.userStorageKey);
    // 重定向到登录页
    window.location.href = '/login';
    throw new Error('认证已过期，请重新登录');
  }

  return response;
};

// 获取所有会话
export const fetchConversations = async () => {
  try {
    const response = await fetchWithAuth(CONFIG.api.conversations);
    
    if (!response.ok) {
      throw new Error(`获取会话失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取会话时出错:', error);
    throw error;
  }
};

// 创建新会话
export const createConversation = async (title: string) => {
  try {
    const response = await fetchWithAuth(CONFIG.api.conversations, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    
    if (!response.ok) {
      throw new Error(`创建会话失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('创建会话时出错:', error);
    throw error;
  }
};

// 获取特定会话的消息
export const fetchMessages = async (conversationId: string) => {
  try {
    const response = await fetchWithAuth(`${CONFIG.api.conversations}/${conversationId}`);
    
    if (!response.ok) {
      throw new Error(`获取消息失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取消息时出错:', error);
    throw error;
  }
};

// 发送消息
export const sendMessage = async (conversationId: string, content: string) => {
  try {
    const response = await fetchWithAuth(CONFIG.api.messages(conversationId), {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      throw new Error(`发送消息失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('发送消息时出错:', error);
    throw error;
  }
};

// 更新对话标题
export const updateConversationTitle = async (conversationId: string, title: string) => {
  try {
    const response = await fetchWithAuth(`${CONFIG.api.conversations}/${conversationId}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    });
    
    if (!response.ok) {
      throw new Error(`更新标题失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('更新标题时出错:', error);
    throw error;
  }
};

// 请求生成对话标题
export const generateConversationTitle = async (conversationId: string) => {
  try {
    const response = await fetchWithAuth(`${CONFIG.api.conversations}/${conversationId}/generate-title`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`生成标题失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('生成标题时出错:', error);
    throw error;
  }
};

// 删除会话
export const deleteConversation = async (conversationId: string) => {
  try {
    const response = await fetchWithAuth(`${CONFIG.api.conversations}/${conversationId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`删除会话失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('删除会话时出错:', error);
    throw error;
  }
};

// 用户登录
export const login = async (email: string, password: string) => {
  try {
    const response = await fetch(CONFIG.api.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('登录时出错:', error);
    throw error;
  }
};

// 用户注册
export const register = async (email: string, password: string) => {
  try {
    const response = await fetch(CONFIG.api.register, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error(`注册失败: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('注册时出错:', error);
    throw error;
  }
};

// 验证令牌
export const validateToken = async (token: string) => {
  try {
    const response = await fetch(CONFIG.api.validateToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    
    return await response.json();
  } catch (error) {
    console.error('验证令牌时出错:', error);
    throw error;
  }
}; 