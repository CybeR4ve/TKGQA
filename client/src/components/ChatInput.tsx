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
  const [isFocused, setIsFocused] = useState(false);

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
      
      // 提交后重新聚焦输入框
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative mx-2">
      <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
            placeholder="输入您的问题..."
          style={{
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-primary)',
          }}
          className={`w-full px-4 py-3.5 pr-10 rounded-xl border ${
            isFocused 
              ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30 dark:border-blue-500' 
              : 'border-gray-300 dark:border-gray-600'
          } focus:outline-none resize-none min-h-[54px] max-h-[200px] ${
            showScrollbar ? 'input-scrollbar' : 'overflow-hidden'
          } transition-colors shadow-sm`}
        disabled={isLoading || disabled}
          aria-label="输入消息"
          />
        <button
          type="submit"
        disabled={!message.trim() || isLoading || disabled}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200 ${
            message.trim() && !isLoading && !disabled
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
          title="发送消息"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}