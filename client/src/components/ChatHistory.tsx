import React, { useState } from 'react';
import { Search, Clock, Plus, X } from 'lucide-react';
import type { Conversation } from '../types';

interface ChatHistoryProps {
  conversations: Conversation[];
  activeConversation: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ChatHistory({ 
  conversations, 
  activeConversation, 
  onSelectConversation,
  onNewConversation 
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conversation => 
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.messages.some(message => 
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <aside className="w-[30%] h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewConversation}
          className="w-full mb-3 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          新建对话
        </button>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话历史..."
            className="w-full pl-10 pr-9 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-500">
            找到 {filteredConversations.length} 个相关对话
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
              activeConversation === conversation.id ? 'bg-blue-50' : ''
            }`}
          >
            <h3 className="font-medium text-gray-900 truncate">{conversation.title}</h3>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {conversation.messages[conversation.messages.length - 1]?.content || '暂无消息'}
            </p>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(conversation.timestamp).toLocaleDateString('zh-CN')}
            </div>
          </button>
        ))}
        {filteredConversations.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? '没有找到相关对话' : '暂无对话历史'}
          </div>
        )}
      </div>
    </aside>
  );
}