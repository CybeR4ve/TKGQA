import React, { useState } from 'react';
import { Search, X, Trash2, Calendar } from 'lucide-react';
import type { Conversation } from '../types';

interface ChatHistoryProps {
  conversations: Conversation[];
  activeConversation: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ChatHistory({ 
  conversations, 
  activeConversation, 
  onSelect,
  onDelete 
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conversation => 
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.messages.some(message => 
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // 提取最新消息和时间的辅助函数
  const getLatestMessage = (conv: Conversation) => {
    const userMessages = conv.messages.filter(m => m.sender === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  };
  
  // 获取日期显示格式
  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    // 检查是否是今天
    if (messageDate.toDateString() === today.toDateString()) {
      return `今天 ${messageDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    }
    
    // 检查是否是昨天
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `昨天 ${messageDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    }
    
    // 其他日期显示完整日期
    return messageDate.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-2">
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-750 px-2 py-3 z-10">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话历史..."
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm transition-all"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {searchQuery && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 px-1">
            找到 {filteredConversations.length} 个相关对话
          </div>
        )}
      </div>
      
      <div className="mt-2 space-y-2 pb-4">
        {filteredConversations.map((conversation) => {
          const latestMessage = getLatestMessage(conversation);
          const hasMessages = conversation.messages.length > 0;
          const messagePreview = hasMessages 
            ? (conversation.messages[conversation.messages.length - 1]?.content || '').substring(0, 60) 
            : '暂无消息';
          
          return (
          <div
            key={conversation.id}
              className={`relative group rounded-lg overflow-hidden transition-all duration-200 ${
                activeConversation === conversation.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 shadow-sm' 
                  : 'hover:bg-white dark:hover:bg-gray-800 border-l-4 border-transparent'
            }`}
          >
            <button
              onClick={() => onSelect(conversation.id)}
                className="w-full p-3 text-left transition-colors pr-12"
            >
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate text-sm ${
                      activeConversation === conversation.id
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {conversation.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 break-all">
                      {messagePreview}
            </p>
                    <div className="flex items-center mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(conversation.timestamp)}
                    </div>
                  </div>
            </div>
          </button>
            <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              title="删除对话"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          );
        })}
        {filteredConversations.length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm m-2 border border-gray-200 dark:border-gray-700">
            {searchQuery ? '没有找到相关对话' : '暂无对话历史'}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {searchQuery ? '尝试其他关键词' : '点击"新建对话"开始聊天吧'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}