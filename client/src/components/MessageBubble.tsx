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
  
  // 检查是否为知识图谱查询结果
  const isKGQueryResult = !isUser && message.content.includes('*通过知识图谱查询生成的回答*');
  
  // 处理知识图谱查询结果内容
  const renderKGQueryResult = () => {
    // 分割内容和标记
    const parts = message.content.split(/\n+---\n+/);
    const mainContent = parts[0];
    const signature = parts.length > 1 ? parts[1] : '*通过知识图谱查询生成的回答*';
  
    // 将主内容分成段落，并用自定义样式显示
    const paragraphs = mainContent
      .split(/\n{2,}/)   // 根据两个或更多换行符分割段落
      .filter(p => p.trim().length > 0);  // 移除空段落
    
    return (
      <div className="space-y-2">
        {/* 主要内容 */}
        <div>
          {paragraphs.map((paragraph, index) => {
            // 检查是否为列表项
            if (/^\d+\.\s/.test(paragraph)) {
              // 数字列表项
              return (
                <div key={index} className="mb-2">
                  {paragraph}
                </div>
              );
            } else if (/^[•-]\s/.test(paragraph)) {
              // 项目符号列表项
              return (
                <div key={index} className="mb-2">
                  {paragraph}
                </div>
              );
            } else {
              // 普通段落
              return (
                <div key={index} className="mb-2">
                  {paragraph}
                </div>
              );
    }
          })}
        </div>
        
        {/* 分隔线和签名 */}
        <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
          {signature}
        </div>
      </div>
    );
  };
  
  // 进度消息渲染
  const renderProgressMessage = () => {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full mr-2"></div>
            <p className="text-gray-600 dark:text-gray-300 italic">正在处理知识图谱查询...</p>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="mb-4 max-w-3xl mx-auto">
      {isUser ? (
        // 用户消息 - 使用气泡和右对齐
        <div className="flex justify-end">
          <div className="bg-blue-600 text-white dark:bg-blue-700 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] shadow-sm">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ) : (
        // 系统消息 - 无气泡，左对齐
        <div className="flex justify-start">
          <div className="text-gray-800 dark:text-gray-200 max-w-[85%]">
            {isKGQueryProgress ? (
              renderProgressMessage()
            ) : isKGQueryResult ? (
              renderKGQueryResult()
            ) : (
              <ReactMarkdown
                className="whitespace-pre-wrap prose dark:prose-invert prose-sm max-w-none"
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
      </div>
      )}
    </div>
  );
}