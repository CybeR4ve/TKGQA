import React from 'react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'neutral';
  className?: string;
}

export function LoadingIndicator({ 
  size = 'medium',
  color = 'primary',
  className = ''
}: LoadingIndicatorProps) {
  // 根据尺寸配置
  const sizeConfig = {
    small: {
      containerClass: 'space-x-1.5 p-2',
      dotClass: 'w-1.5 h-1.5',
    },
    medium: {
      containerClass: 'space-x-2 p-4',
      dotClass: 'w-2 h-2',
    },
    large: {
      containerClass: 'space-x-3 p-5',
      dotClass: 'w-3 h-3',
    }
  };

  // 根据颜色配置
  const colorConfig = {
    primary: 'bg-blue-500 dark:bg-blue-400',
    secondary: 'bg-purple-500 dark:bg-purple-400',
    neutral: 'bg-gray-400 dark:bg-gray-500',
  };

  const { containerClass, dotClass } = sizeConfig[size];
  const colorClass = colorConfig[color];

  return (
    <div className={`flex justify-center items-center ${containerClass} ${className}`}>
      <div className={`${dotClass} ${colorClass} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
      <div className={`${dotClass} ${colorClass} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
      <div className={`${dotClass} ${colorClass} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
    </div>
  );
}