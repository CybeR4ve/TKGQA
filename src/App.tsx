import React, { useState, useRef, useEffect } from 'react';
import { ChatHistory } from './components/ChatHistory';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import type { Conversation, Message } from './types';

// API endpoints
const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  // Fetch all conversations from the API
  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`);
      if (response.ok) {
        const data = await response.json();
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
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `新对话 ${conversations.length + 1}`,
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        // Convert ISO date string to Date object
        newConversation.timestamp = new Date(newConversation.timestamp);
        
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversation(newConversation.id);
      }
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
      fetch(`${API_BASE_URL}/conversations/${activeConversation}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatHistory
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onNewConversation={handleNewConversation}
      />
      
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {currentConversation?.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              开始新的对话...
            </div>
          ) : (
            currentConversation?.messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;