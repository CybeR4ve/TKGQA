import React, { useState, useRef, useEffect } from 'react';
import { ChatHistory } from './components/ChatHistory';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AuthPopover } from './components/AuthPopover';
import { Moon, Sun, User } from 'lucide-react';
import type { Conversation, Message, User as UserType } from './types';
import { API_BASE_URL, CONFIG } from './config';
import * as api from './services/api';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 检查localStorage或系统首选项以确定初始深色模式状态
    if (typeof window !== 'undefined') {
      // 首先检查localStorage
      const savedTheme = localStorage.getItem(CONFIG.ui.themeStorageKey);
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      // 默认使用浅色模式，不再检查系统首选项
      return false;
    }
    return false;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(() => {
    // 检查本地存储中是否有用户信息和令牌
    const storedUser = localStorage.getItem(CONFIG.auth.userStorageKey);
    const storedToken = localStorage.getItem(CONFIG.auth.tokenStorageKey);
    
    if (storedUser && storedToken) {
      return JSON.parse(storedUser);
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(CONFIG.auth.tokenStorageKey);
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversations on component mount
  useEffect(() => {
    if (user && token) {
      fetchConversations();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  // Fetch all conversations from the API
  const fetchConversations = async () => {
    try {
      const data = await api.fetchConversations();
      // Convert ISO date strings to Date objects
      const formattedData = data.map((conv: any) => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      
      setConversations(formattedData);
      if (formattedData.length > 0 && !activeConversation) {
        setActiveConversation(formattedData[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    setIsLoading(true);
    try {
      const title = `新对话 ${conversations.length + 1}`;
      const newConversation = await api.createConversation(title);
      
      // Convert ISO date string to Date object
      newConversation.timestamp = new Date(newConversation.timestamp);
      
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation.id);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !activeConversation) return;
    
    // Optimistically add user message to UI
    const tempUserMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation) {
        // Update conversation title if it's the first message
        const updatedConv = {
          ...conv,
          messages: [...conv.messages, tempUserMessage],
        };
        if (conv.messages.length === 0) {
          updatedConv.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        }
        return updatedConv;
      }
      return conv;
    }));

    setIsLoading(true);
    
    try {
      // 创建一个临时的系统消息，用于显示流式响应
      const tempSystemMessage: Message = {
        id: 'temp-system-' + Date.now().toString(),
        content: '',
        sender: 'system' as 'system', // 显式指定类型
        timestamp: new Date(),
      };
      
      // 添加临时系统消息到UI
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [...conv.messages, tempSystemMessage],
          };
        }
        return conv;
      }));
      
      // 处理流式数据的函数
      const handleStreamData = (data: any) => {
        if (data.done) {
          // 流式传输完成
          setIsLoading(false);
          
          // 替换临时用户消息和系统消息为最终版本
          setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversation) {
              // 找到并替换临时消息
              const updatedMessages = conv.messages
                .filter(msg => msg.id !== tempUserMessage.id && msg.id !== tempSystemMessage.id);
              
              // 添加最终的用户消息
              const finalUserMessage: Message = {
                ...tempUserMessage,
                id: data.userMessageId || tempUserMessage.id,
              };
              
              // 添加最终的系统消息
              const finalSystemMessage: Message = {
                id: data.message_id,
                content: data.full_response,
                sender: 'system' as 'system', // 显式指定类型
                timestamp: new Date(),
              };
              
              return {
                ...conv,
                messages: [...updatedMessages, finalUserMessage, finalSystemMessage],
              };
            }
            return conv;
          }));
        } else {
          // 更新临时系统消息的内容
          setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversation) {
              const updatedMessages = conv.messages.map(msg => {
                if (msg.id === tempSystemMessage.id) {
                  return {
                    ...msg,
                    content: data.full_response || data.content || msg.content,
                    sender: msg.sender, // 保持原有的sender类型
                  } as Message;
                }
                return msg;
              });
              
              return {
                ...conv,
                messages: updatedMessages,
              };
            }
            return conv;
          }));
        }
      };

      // 创建一个自定义的EventSource实现
      // 因为EventSource默认只支持GET请求，我们使用fetch实现POST请求的流式传输
      const controller = new AbortController();
      const { signal } = controller;
      
      // 发送POST请求并处理流式响应
      fetch(`${API_BASE_URL}/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
        signal,
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        
        function readStream() {
          reader.read().then(({ value, done }) => {
            if (done) {
              setIsLoading(false);
              return;
            }
            
            const text = decoder.decode(value);
            const lines = text.split('\n\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleStreamData(data);
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
            
            readStream();
          }).catch(err => {
            console.error('Stream reading error:', err);
            setIsLoading(false);
            // 显示错误消息
            setConversations(prev => prev.map(conv => {
              if (conv.id === activeConversation) {
                const updatedMessages = conv.messages.map(msg => {
                  if (msg.id === tempSystemMessage.id) {
                    return {
                      ...msg,
                      content: '抱歉，发生了错误，请重试。',
                      sender: msg.sender,
                    } as Message;
                  }
                  return msg;
                });
                
                return {
                  ...conv,
                  messages: updatedMessages,
                };
              }
              return conv;
            }));
          });
        }
        
        readStream();
      }).catch(error => {
        console.error('Fetch error:', error);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error with streaming:', error);
      setIsLoading(false);
    }
  };

  const currentConversation = conversations.find(conv => conv.id === activeConversation);

  // 处理登录和注册
  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      
      // 保存用户信息和令牌
      setUser(data.user);
      setToken(data.token);
      
      // 存储到本地存储
      localStorage.setItem(CONFIG.auth.userStorageKey, JSON.stringify(data.user));
      localStorage.setItem(CONFIG.auth.tokenStorageKey, data.token);
      
      setIsAuthOpen(false);
      return true;
    } catch (error) {
      console.error('登录请求出错:', error);
      return false;
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      await api.register(email, password);
      
      // 注册成功后直接登录
      return await handleLogin(email, password);
    } catch (error) {
      console.error('注册请求出错:', error);
      return false;
    }
  };

  const handleLogout = () => {
    // 清除用户状态和令牌
    setUser(null);
    setToken(null);
    
    // 清除本地存储
    localStorage.removeItem(CONFIG.auth.userStorageKey);
    localStorage.removeItem(CONFIG.auth.tokenStorageKey);
    
    // 清空会话列表
    setConversations([]);
    setActiveConversation('');
    
    setIsAuthOpen(false);
  };

  // 验证存储的令牌
  useEffect(() => {
    const validateToken = async () => {
      // 如果没有令牌，不需要验证
      if (!token) return;
      
      try {
        const data = await api.validateToken(token);
        
        if (!data.valid) {
          // 令牌无效，清除用户状态
          handleLogout();
        } else {
          // 令牌有效，刷新会话列表
          fetchConversations();
        }
      } catch (error) {
        console.error('验证令牌时出错:', error);
      }
    };
    
    validateToken();
  }, [token]);

  // 当用户登录状态变化时，刷新会话列表
  useEffect(() => {
    if (user && token) {
      fetchConversations();
    } else {
      // 用户已登出，清空会话列表
      setConversations([]);
      setActiveConversation('');
    }
  }, [user, token]);

  // 应用深色模式到document.documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(CONFIG.ui.themeStorageKey, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(CONFIG.ui.themeStorageKey, 'light');
    }
  }, [isDarkMode]);

  // 监听系统深色模式变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 删除会话
  const handleDeleteConversation = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== id));
        if (activeConversation === id) {
          setActiveConversation(conversations.length > 1 ? conversations.find(c => c.id !== id)?.id || '' : '');
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // 添加授权头部到请求
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  return (
    <div className={`flex h-screen bg-gray-100 ${isDarkMode ? 'dark' : ''}`}>
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r dark:bg-gray-900 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">智能问答系统</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title={isDarkMode ? "切换至亮色模式" : "切换至深色模式"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setIsAuthOpen(!isAuthOpen)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title={user ? "查看用户信息" : "登录/注册"}
              >
                {user ? (
                  <div className="w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                    {user.email.substring(0, 1).toUpperCase()}
                  </div>
                ) : (
                  <User size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={handleNewConversation}
            disabled={isLoading || !user}
            className={`w-full py-2 rounded ${
              !user 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' 
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700'
            }`}
            title={user ? "新建对话" : "请先登录"}
          >
            新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatHistory
            conversations={conversations}
            activeConversation={activeConversation}
            onSelect={setActiveConversation}
            onDelete={handleDeleteConversation}
          />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            {activeConversation && (
              <div className="py-2">
                <div className="space-y-4">
                  {conversations.find(c => c.id === activeConversation)?.messages.map((message, index) => (
                    <MessageBubble key={message.id || index} message={message} />
                  ))}
                </div>
              </div>
            )}
            {!activeConversation && (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="text-center">
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                    开始一个新的对话
                  </h3>
                  {user ? (
                    <>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        点击左侧的"新建对话"按钮开始交流
                      </p>
                      <button
                        onClick={handleNewConversation}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        新建对话
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        请先登录后开始对话
                      </p>
                      <button
                        onClick={() => setIsAuthOpen(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        登录/注册
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {isLoading && !conversations.find(c => c.id === activeConversation)?.messages.some(m => m.id.startsWith('temp-system-')) && (
              <div className="flex justify-center my-4">
                <LoadingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="border-t dark:border-gray-700">
          <div className="max-w-3xl mx-auto p-4">
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || !activeConversation} />
          </div>
        </div>
      </div>

      {/* 认证弹出框 */}
      {isAuthOpen && (
        <AuthPopover
          onClose={() => setIsAuthOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          user={user}
        />
      )}
    </div>
  );
}

export default App;