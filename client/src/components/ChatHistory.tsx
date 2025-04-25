import React, { useState } from 'react';
import { Search, Clock, Plus, X, Trash2 } from 'lucide-react';
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话历史..."
            className="w-full pl-9 pr-9 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
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
      
      <div className="mt-2">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`relative group border-b dark:border-gray-700 ${
              activeConversation === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <button
              onClick={() => onSelect(conversation.id)}
              className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors pr-10"
            >
              <h3 className="font-medium text-gray-900 dark:text-white truncate text-sm">{conversation.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {conversation.messages[conversation.messages.length - 1]?.content || '暂无消息'}
            </p>
              <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
              {new Date(conversation.timestamp).toLocaleDateString('zh-CN')}
            </div>
          </button>
            <button 
              onClick={() => onDelete(conversation.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="删除对话"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {filteredConversations.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery ? '没有找到相关对话' : '暂无对话历史'}
          </div>
        )}
      </div>
    </div>
  );
}