import React, { useState } from 'react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { RefreshCw, Copy, Check, Edit2, X, Send } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export function MessageBubble({ message, onRegenerate, onEditMessage }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  
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
  
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      
      // 2秒后重置复制状态
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
    }
  };
  
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleConfirmEdit = () => {
    if (onEditMessage && editContent.trim() !== '') {
      onEditMessage(message.id, editContent);
      setIsEditing(false);
    }
  };
  
  return (
    <div className="mb-4 max-w-3xl mx-auto">
      {isUser ? (
        // 用户消息 - 使用气泡和右对齐
        <div className="flex flex-col items-end">
          {isEditing ? (
            // 编辑模式
            <div className="bg-blue-50 dark:bg-gray-800 rounded-xl p-3 max-w-[85%] w-full border border-blue-200 dark:border-gray-700">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                placeholder="编辑你的消息..."
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X size={16} className="mr-1" />
                  <span>取消</span>
                </button>
                <button
                  onClick={handleConfirmEdit}
                  className="flex items-center px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded transition-colors"
                >
                  <Send size={16} className="mr-1" />
                  <span>确定</span>
                </button>
              </div>
            </div>
          ) : (
            // 显示模式
            <div className="bg-blue-600 text-white dark:bg-blue-700 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] shadow-sm">
              <p className="break-words">{message.content}</p>
            </div>
          )}
          
          {/* 用户消息的操作按钮 */}
          {!isEditing && onEditMessage && (
            <div className="mt-1 mr-1">
              <button
                onClick={handleStartEdit}
                className="flex items-center text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="编辑消息"
              >
                <Edit2 size={14} className="mr-1" />
                <span>编辑</span>
              </button>
            </div>
          )}
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
          
          {/* 操作按钮 - 仅对系统消息显示 */}
          {!isKGQueryProgress && (
            <div className="flex mt-1 ml-1 space-x-4">
              {/* 重新生成按钮 */}
              {onRegenerate && (
                <button 
                  onClick={handleRegenerate}
                  className="flex items-center text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="重新生成回答"
                >
                  <RefreshCw size={14} className="mr-1" />
                  <span>重新生成</span>
                </button>
              )}
              
              {/* 复制按钮 */}
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="复制到剪贴板"
              >
                {isCopied ? (
                  <>
                    <Check size={14} className="mr-1 text-green-500" />
                    <span className="text-green-500">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div> 
      )}
    </div>
  );
}