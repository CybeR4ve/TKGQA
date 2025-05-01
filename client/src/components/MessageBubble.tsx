import React from 'react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { RefreshCw } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  
  // 检查是否为知识图谱查询进度消息
  const isKGQueryProgress = 
    message.content.includes('正在查询知识图谱') || 
    message.content.includes('查询语句已生成') || 
    message.content.includes('查询完成，生成回答中');
  
  // 进度消息渲染
  const renderProgressMessage = () => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center">
          <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full mr-2"></div>
          <p className="text-gray-600 dark:text-gray-300 italic">正在处理知识图谱查询...</p>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs">
          <p className="break-words">{message.content}</p>
        </div>
      </div>
    );
  };
  
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
  };
  
  return (
    <div className="mb-4 max-w-3xl mx-auto">
      {isUser ? (
        // 用户消息 - 使用气泡和右对齐
        <div className="flex justify-end">
          <div className="bg-blue-600 text-white dark:bg-blue-700 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] shadow-sm">
            <p className="break-words">{message.content}</p>
          </div>
        </div>
      ) : (
        // 系统消息 - 无气泡，左对齐
        <div className="flex flex-col justify-start">
          <div className="text-gray-800 dark:text-gray-200 max-w-[85%]">
            {isKGQueryProgress ? (
              renderProgressMessage()
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkBreaks, remarkGfm]}
                className="prose dark:prose-invert prose-sm max-w-none prose-p:mb-2 prose-p:last:mb-0"
                components={{
                  p: ({node, ...props}) => (
                    <p {...props} className="mb-3 last:mb-0" />
                  ),
                  a: ({node, ...props}) => (
                    <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />
                  ),
                  code: ({node, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !className || !match;
                    return isInline ? 
                      <code {...props} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-1 py-0.5 rounded text-sm">{children}</code> :
                      <code {...props} className="block bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{children}</code>;
                  },
                  pre: ({node, ...props}) => (
                    <pre {...props} className="bg-gray-200 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto text-sm my-3" />
                  ),
                  ul: ({node, ...props}) => (
                    <ul {...props} className="list-disc pl-5 mb-3" />
                  ),
                  ol: ({node, ...props}) => (
                    <ol {...props} className="list-decimal pl-5 mb-3" />
                  ),
                  li: ({node, ...props}) => (
                    <li {...props} className="mb-1 last:mb-0" />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote {...props} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-3" />
                  ),
                  h1: ({node, ...props}) => (
                    <h1 {...props} className="text-xl font-bold mb-3 mt-4" />
                  ),
                  h2: ({node, ...props}) => (
                    <h2 {...props} className="text-lg font-bold mb-2 mt-4" />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 {...props} className="text-md font-bold mb-2 mt-3" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          
          {/* 重新生成按钮 - 仅对系统消息显示 */}
          {!isKGQueryProgress && onRegenerate && (
            <div className="flex mt-1 ml-1">
              <button 
                onClick={handleRegenerate}
                className="flex items-center text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="重新生成回答"
              >
                <RefreshCw size={14} className="mr-1" />
                <span>重新生成</span>
              </button>
            </div>
          )}
        </div> 
      )}
    </div>
  );
}