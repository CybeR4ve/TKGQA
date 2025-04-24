import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollbar, setShowScrollbar] = useState(false);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 保存当前滚动位置
      const scrollTop = textarea.scrollTop;
      
      // 重置高度以准确测量内容高度
      textarea.style.height = 'auto';
      
      // 获取内容实际需要的高度
      const scrollHeight = textarea.scrollHeight;
      
      // 设置新高度，最大为200px
      const newHeight = Math.min(scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      
      // 根据内容高度决定是否需要显示滚动条
      setShowScrollbar(scrollHeight > 200);
      
      // 恢复滚动位置
      textarea.scrollTop = scrollTop;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setShowScrollbar(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入您的问题..."
        className={`w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[48px] max-h-[200px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
          showScrollbar ? 'scrollbar-auto-hide' : 'overflow-hidden'
        }`}
        disabled={isLoading || disabled}
      />
      <button
        type="submit"
        disabled={!message.trim() || isLoading || disabled}
        className="absolute right-3 bottom-3 p-2 rounded-full transition-colors"
        title="发送"
      >
        <Send 
          className={`h-5 w-5 ${
            message.trim() && !isLoading && !disabled
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        />
      </button>
    </form>
  );
}