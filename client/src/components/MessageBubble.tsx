import React from 'react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  
  // 检查是否为知识图谱查询进度消息
  const isKGQueryProgress = 
    message.content.includes('正在查询知识图谱') || 
    message.content.includes('查询语句已生成') || 
    message.content.includes('查询完成，生成回答中');
  
  // 处理文本内容，支持Markdown
  let content = message.content;
  
  // 对特殊内容做样式处理
  const renderContent = () => {
    if (isUser) {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
    
    if (isKGQueryProgress) {
      // 为进度消息添加动画效果
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full mr-2"></div>
            <p className="text-gray-600 dark:text-gray-300 italic">正在处理知识图谱查询...</p>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      );
    }
    
    // 普通消息，使用Markdown渲染
    return (
      <ReactMarkdown
        className="whitespace-pre-wrap prose dark:prose-invert prose-sm max-w-none"
        components={{
          // @ts-ignore
          a: ({node, ...props}) => (
            <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />
          ),
          // @ts-ignore
          code: ({node, ...props}) => (
            <code {...props} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 p-0.5 rounded text-sm" />
          ),
          // @ts-ignore
          pre: ({node, ...props}) => (
            <pre {...props} className="bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };
  
  return (
    <div className="mb-4 max-w-3xl mx-auto">
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
          className={`rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white dark:bg-blue-700'
              : 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          } max-w-[85%]`}
      >
          {renderContent()}
        </div>
      </div>
      <div className={`text-xs mt-1 ${
        isUser ? 'text-right' : 'text-left'
      } text-gray-500 dark:text-gray-400`}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}