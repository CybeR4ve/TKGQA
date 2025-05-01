import React, { useState, useRef, useEffect } from 'react';
import { ChatHistory } from './components/ChatHistory';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AuthPopover } from './components/AuthPopover';
import { GraphPage } from './components/GraphPage';
import { Moon, Sun, User, BarChart2 } from 'lucide-react';
import type { Conversation, Message, User as UserType } from './types';
import { API_BASE_URL, CONFIG } from './config';
import * as api from './services/api';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
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
  const [currentView, setCurrentView] = useState<'chat' | 'graph'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 添加控制器引用，用于中断请求
  const abortControllerRef = useRef<AbortController | null>(null);
  // 添加标志，标识是否是用户主动中断
  const isUserAbortingRef = useRef<boolean>(false);

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
      setIsLoadingConversations(true);
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
        
        // 按时间戳倒序排序，确保最新的对话显示在最前面
        formattedData.sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // 保持当前选中的会话
        const currentActiveConv = activeConversation;
        
        setConversations(formattedData);
        if (formattedData.length > 0 && !currentActiveConv) {
          setActiveConversation(formattedData[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleNewConversation = async () => {
    setIsLoading(true);
    try {
      const title = `新对话 ${conversations.length + 1}`;
      const newConversation = await api.createConversation(title);
      
      // Convert ISO date string to Date object
      newConversation.timestamp = new Date(newConversation.timestamp);
      
      // 确保新创建的对话始终在最顶部
      setConversations((prev: Conversation[]) => {
        // 添加新对话并按时间戳排序
        return [newConversation, ...prev].sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime());
      });
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
          
          // 重置中断控制器
          abortControllerRef.current = null;
          
          // 替换临时用户消息和系统消息为最终版本
          setConversations((prev: Conversation[]) => {
            // 先找到当前会话
            const currentConv = prev.find((conv: Conversation) => conv.id === activeConversation);
            if (!currentConv) return prev;
            
            // 更新当前会话
            const updatedConv = {
              ...currentConv,
              timestamp: new Date(), // 更新时间戳
              messages: currentConv.messages
                .filter((msg: Message) => msg.id !== tempUserMessage.id && msg.id !== tempSystemMessage.id)
                .concat([
                  {
                    ...tempUserMessage,
                    id: data.userMessageId || tempUserMessage.id,
                  },
                  {
                    id: data.message_id,
                    content: data.full_response,
                    sender: 'system' as 'system',
                    timestamp: new Date(),
                  }
                ])
            };
            
            // 从列表中移除旧版本会话
            const otherConvs = prev.filter((conv: Conversation) => conv.id !== activeConversation);
            
            // 按时间戳排序
            return [updatedConv, ...otherConvs].sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime());
          });
        } else if (data.title_updated) {
          // 处理标题更新
          setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => {
            if (conv.id === data.conversation_id) {
              return {
                ...conv,
                title: data.new_title,
                timestamp: new Date() // 更新时间戳
              };
            }
            return conv;
          }).sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime())); // 重新排序
        } else {
          // 更新临时系统消息的内容
          setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => {
            if (conv.id === activeConversation) {
              const updatedMessages = conv.messages.map((msg: Message) => {
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

      // 创建一个新的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;
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
            
            // 区分用户主动中断和真正的错误
            if (isUserAbortingRef.current) {
              // 用户主动中断，保留已生成的内容
              setConversations(prev => prev.map(conv => {
                if (conv.id === activeConversation) {
                  const updatedMessages = conv.messages.map(msg => {
                    if (msg.id === tempSystemMessage.id) {
                      return {
                        ...msg,
                        content: msg.content + '\n\n*生成已被用户中断*',
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
              
              // 重置中断标志
              isUserAbortingRef.current = false;
            } else {
              // 真正的错误
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
            }
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
      setIsLoadingAuth(true);
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
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      setIsLoadingAuth(true);
      await api.register(email, password);
      
      // 注册成功后直接登录
      return await handleLogin(email, password);
    } catch (error) {
      console.error('注册请求出错:', error);
      setIsLoadingAuth(false);
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

  // 添加中断生成的函数
  const handleAbortGeneration = async () => {
    if (!activeConversation) return;
    
    try {
      // 设置标志，标识这是用户主动中断
      isUserAbortingRef.current = true;
      
      // 1. 中断当前的fetch请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // 2. 通知后端中断生成
      await fetch(`${API_BASE_URL}/conversations/${activeConversation}/abort`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('中断生成时出错:', error);
      // 即使出错也要重置加载状态
      setIsLoading(false);
      // 重置中断标志
      isUserAbortingRef.current = false;
    }
  };

  // 添加重新生成消息功能的处理函数
  const handleRegenerateMessage = async (messageId: string) => {
    if (!activeConversation || isLoading) return;
    
    // 获取当前会话
    const conversation = conversations.find(conv => conv.id === activeConversation);
    if (!conversation) return;
    
    // 找到要重新生成的系统消息
    const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || conversation.messages[messageIndex].sender !== 'system') return;
    
    // 找到该系统消息前最近的用户消息
    let userMessageIndex = -1;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (conversation.messages[i].sender === 'user') {
        userMessageIndex = i;
        break;
      }
    }
    
    if (userMessageIndex === -1) return;
    
    // 获取用户消息内容
    const userMessage = conversation.messages[userMessageIndex];
    
    // 移除此系统消息之后的所有消息（包括此系统消息）
    const updatedMessages = conversation.messages.slice(0, messageIndex);
    
    // 更新对话显示，在UI上立即移除这些消息
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation) {
        return {
          ...conv,
          messages: updatedMessages
        };
      }
      return conv;
    }));
    
    // 设置加载状态
    setIsLoading(true);
    
    try {
      // 创建一个临时的系统消息，用于显示流式响应
      const tempSystemMessage: Message = {
        id: 'temp-system-' + Date.now().toString(),
        content: '',
        sender: 'system' as 'system',
        timestamp: new Date(),
      };
      
      // 添加临时系统消息到UI
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [...updatedMessages, tempSystemMessage],
          };
        }
        return conv;
      }));
      
      // 创建一个新的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;
      
      // 发送POST请求并处理流式响应
      fetch(`${API_BASE_URL}/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          content: userMessage.content,
          regenerate: true, // 标记这是重新生成请求
          fromMessageIndex: userMessageIndex // 告诉后端从哪条消息开始重新生成
        }),
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
                  // 使用外部的handleStreamData函数处理数据
                  if (data.content || data.full_response) {
                    // 更新临时系统消息的内容
                    setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => {
                      if (conv.id === activeConversation) {
                        const updatedMessages = conv.messages.map((msg: Message) => {
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
                  } else if (data.done) {
                    // 流式传输完成
                    setIsLoading(false);
                    
                    // 重置中断控制器
                    abortControllerRef.current = null;
                    
                    // 替换临时系统消息为最终版本
                    setConversations((prev: Conversation[]) => {
                      // 先找到当前会话
                      const currentConv = prev.find((conv: Conversation) => conv.id === activeConversation);
                      if (!currentConv) return prev;
                      
                      // 更新当前会话
                      const updatedConv = {
                        ...currentConv,
                        timestamp: new Date(), // 更新时间戳
                        messages: currentConv.messages
                          .filter((msg: Message) => msg.id !== tempSystemMessage.id)
                          .concat([
                            {
                              id: data.message_id,
                              content: data.full_response,
                              sender: 'system' as 'system',
                              timestamp: new Date(),
                            }
                          ])
                      };
                      
                      // 从列表中移除旧版本会话
                      const otherConvs = prev.filter((conv: Conversation) => conv.id !== activeConversation);
                      
                      // 按时间戳排序
                      return [updatedConv, ...otherConvs].sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime());
                    });
                  } else if (data.title_updated) {
                    // 处理标题更新
                    setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => {
                      if (conv.id === data.conversation_id) {
                        return {
                          ...conv,
                          title: data.new_title,
                          timestamp: new Date() // 更新时间戳
                        };
                      }
                      return conv;
                    }).sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime())); // 重新排序
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
            
            readStream();
          }).catch(err => {
            console.error('Stream reading error:', err);
            setIsLoading(false);
            
            // 区分用户主动中断和真正的错误
            if (isUserAbortingRef.current) {
              // 用户主动中断，保留已生成的内容
              setConversations(prev => prev.map(conv => {
                if (conv.id === activeConversation) {
                  const updatedMessages = conv.messages.map(msg => {
                    if (msg.id === tempSystemMessage.id) {
                      return {
                        ...msg,
                        content: msg.content + '\n\n*生成已被用户中断*',
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
              
              // 重置中断标志
              isUserAbortingRef.current = false;
            } else {
              // 真正的错误
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
            }
          });
        }
        
        readStream();
      }).catch(error => {
        console.error('Fetch error:', error);
        setIsLoading(false);
      });
    
    } catch (error) {
      console.error('Error regenerating message:', error);
      setIsLoading(false);
    }
  };

  // 处理用户消息编辑的函数
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation || isLoading) return;
    
    // 获取当前会话
    const conversation = conversations.find(conv => conv.id === activeConversation);
    if (!conversation) return;
    
    // 找到要编辑的用户消息
    const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || conversation.messages[messageIndex].sender !== 'user') return;
    
    // 更新对话中的用户消息内容
    const updatedMessages = [...conversation.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: newContent
    };
    
    // 无论如何都截断到当前用户消息（只保留该用户消息及之前的内容）
    updatedMessages.splice(messageIndex + 1);
    
    // 更新对话显示，在UI上更新这些消息
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation) {
        return {
          ...conv,
          messages: updatedMessages
        };
      }
      return conv;
    }));
    
    // 设置加载状态
    setIsLoading(true);
    
    try {
      // 创建一个临时的系统消息，用于显示流式响应
      const tempSystemMessage: Message = {
        id: 'temp-system-' + Date.now().toString(),
        content: '',
        sender: 'system' as 'system',
        timestamp: new Date(),
      };
      
      // 添加临时系统消息到UI
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [...updatedMessages, tempSystemMessage],
          };
        }
        return conv;
      }));
      
      // 创建一个新的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;
      
      // 发送POST请求并处理流式响应
      fetch(`${API_BASE_URL}/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          content: newContent,
          regenerate: true, // 标记这是重新生成请求
          fromMessageIndex: messageIndex // 告诉后端从哪条消息开始重新生成
        }),
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
                  // 使用外部的handleStreamData函数处理数据
                  if (data.content || data.full_response) {
                    // 更新临时系统消息的内容
                    setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => {
                      if (conv.id === activeConversation) {
                        const updatedMessages = conv.messages.map((msg: Message) => {
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
                  } else if (data.done) {
                    // 流式传输完成
                    setIsLoading(false);
                    
                    // 重置中断控制器
                    abortControllerRef.current = null;
                    
                    // 替换临时系统消息为最终版本
                    setConversations((prev: Conversation[]) => {
                      // 先找到当前会话
                      const currentConv = prev.find((conv: Conversation) => conv.id === activeConversation);
                      if (!currentConv) return prev;
                      
                      // 更新当前会话
                      const updatedConv = {
                        ...currentConv,
                        timestamp: new Date(), // 更新时间戳
                        messages: currentConv.messages
                          .filter((msg: Message) => msg.id !== tempSystemMessage.id)
                          .concat([
                            {
                              id: data.message_id,
                              content: data.full_response,
                              sender: 'system' as 'system',
                              timestamp: new Date(),
                            }
                          ])
                      };
                      
                      // 从列表中移除旧版本会话
                      const otherConvs = prev.filter((conv: Conversation) => conv.id !== activeConversation);
                      
                      // 按时间戳排序
                      return [updatedConv, ...otherConvs].sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime());
                    });
                  } else if (data.title_updated) {
                    // 处理标题更新
                    setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => {
                      if (conv.id === data.conversation_id) {
                        return {
                          ...conv,
                          title: data.new_title,
                          timestamp: new Date() // 更新时间戳
                        };
                      }
                      return conv;
                    }).sort((a: Conversation, b: Conversation) => b.timestamp.getTime() - a.timestamp.getTime())); // 重新排序
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
            
            readStream();
          }).catch(err => {
            console.error('Stream reading error:', err);
            setIsLoading(false);
            
            // 区分用户主动中断和真正的错误
            if (isUserAbortingRef.current) {
              // 用户主动中断，保留已生成的内容
              setConversations(prev => prev.map(conv => {
                if (conv.id === activeConversation) {
                  const updatedMessages = conv.messages.map(msg => {
                    if (msg.id === tempSystemMessage.id) {
                      return {
                        ...msg,
                        content: msg.content + '\n\n*生成已被用户中断*',
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
              
              // 重置中断标志
              isUserAbortingRef.current = false;
            } else {
              // 真正的错误
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
            }
          });
        }
        
        readStream();
      }).catch(error => {
        console.error('Fetch error:', error);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error with editing message:', error);
      setIsLoading(false);
    }
  };

  // 添加处理重命名对话的函数
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await api.updateConversationTitle(id, newTitle);
      setConversations(prev => prev.map(conv => {
        if (conv.id === id) {
          return {
            ...conv,
            title: newTitle
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  return (
    <div className={`flex h-screen flex-col ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100'}`}>
      {/* 顶部导航栏 */}
      <header className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} py-3 px-4 flex justify-between items-center`}>
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">TKGQA 系统</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-4 py-2 rounded-md ${
                currentView === 'chat' 
                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-500 text-white') 
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')
              }`}
            >
              聊天
            </button>
            <button
              onClick={() => setCurrentView('graph')}
              className={`px-4 py-2 rounded-md flex items-center ${
                currentView === 'graph' 
                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-500 text-white') 
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')
              }`}
            >
              <BarChart2 className="w-4 h-4 mr-1" />
              图谱可视化
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const newMode = !isDarkMode;
              setIsDarkMode(newMode);
              localStorage.setItem(CONFIG.ui.themeStorageKey, newMode ? 'dark' : 'light');
            }}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            aria-label="切换深色模式"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsAuthOpen(!isAuthOpen)}
              className={`p-2 rounded-full ${
                isDarkMode ? 'bg-gray-700 text-blue-300' : 'bg-gray-200 text-blue-500'
              } flex items-center`}
              aria-label="用户账户"
            >
              <User className="w-5 h-5" />
            </button>
            {isAuthOpen && (
              <AuthPopover
                onClose={() => setIsAuthOpen(false)}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
                isLoading={isLoadingAuth}
                user={user}
              />
            )}
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'chat' ? (
          <>
            {/* 侧边栏 - 对话列表 */}
            <div className="w-72 bg-white border-r dark:bg-gray-800 dark:border-gray-700 flex flex-col shadow-sm">
              <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">智能问答系统</h1>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-750">
                <button
                  onClick={handleNewConversation}
                  disabled={isLoading || !user}
                  className={`w-full py-2.5 px-4 rounded-lg ${
                    !user 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700'
                  } flex items-center justify-center shadow-sm transition-colors`}
                  title={user ? "新建对话" : "请先登录"}
                >
                  {isLoading ? (
                    <LoadingIndicator size="small" color="neutral" className="py-0" />
                  ) : "新建对话"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-750">
                {isLoadingConversations ? (
                  <div className="flex justify-center py-4">
                    <LoadingIndicator color="primary" />
                  </div>
                ) : (
                <ChatHistory
                  conversations={conversations}
                  activeConversation={activeConversation}
                  onSelect={setActiveConversation}
                  onDelete={handleDeleteConversation}
                  onRefreshConversations={fetchConversations}
                />
                )}
              </div>
            </div>

            {/* 主内容区域 - 更现代化的设计 */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative">
              {/* 消息区域 */}
              <div className="flex-1 overflow-y-auto input-scrollbar p-4 bg-gray-100 dark:bg-gray-850">
                <div className="max-w-3xl mx-auto">
                  {activeConversation && (
                    <div className="py-2">
                      <div className="space-y-4">
                        {conversations.find(c => c.id === activeConversation)?.messages.map((message, index) => (
                          <MessageBubble 
                            key={message.id || index} 
                            message={message} 
                            onRegenerate={message.sender === 'system' ? handleRegenerateMessage : undefined}
                            onEditMessage={message.sender === 'user' ? handleEditMessage : undefined}
                          />
                        ))}
                      </div>
                  </div>
                  )}
                  {!activeConversation && (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                      <div className="text-center mt-20 max-w-md w-full mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-6">
                          开始一个新的对话
                        </h3>
                        {user ? (
                          <>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                              点击左侧的"新建对话"按钮开始交流
                            </p>
                            <button
                              onClick={handleNewConversation}
                              disabled={isLoading}
                              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center mx-auto shadow-sm transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                              {isLoading ? (
                                <LoadingIndicator size="small" color="neutral" className="py-0" />
                              ) : "新建对话"}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                              请先登录后开始对话
                            </p>
                            <button
                              onClick={() => setIsAuthOpen(true)}
                              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center mx-auto shadow-sm transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                              {isLoadingAuth && !isAuthOpen ? (
                                <LoadingIndicator size="small" color="neutral" className="py-0" />
                              ) : "登录/注册"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                )}
                  {/* 加载指示器 */}
                  {isLoading && (
                    <div className="flex justify-center my-4">
                      <LoadingIndicator color="primary" size="medium" />
                    </div>
                  )}
                <div ref={messagesEndRef} />
                </div>
              </div>
              
              {/* 输入区域 */}
              <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="max-w-3xl mx-auto p-3">
                  <ChatInput 
                    onSendMessage={handleSendMessage} 
                    onAbortGeneration={handleAbortGeneration} 
                    disabled={isLoading || !activeConversation} 
                    isLoading={isLoading} 
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <GraphPage />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;