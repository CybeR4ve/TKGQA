import React, { useState, useEffect } from 'react';
import { GraphVisualization } from './GraphVisualization';
import { CONFIG } from '../config';

export const GraphPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 检查当前主题模式
  useEffect(() => {
    const checkDarkMode = () => {
      const savedTheme = localStorage.getItem(CONFIG.ui.themeStorageKey);
      setIsDarkMode(savedTheme === 'dark');
    };

    // 初始检查
    checkDarkMode();

    // 监听本地存储变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CONFIG.ui.themeStorageKey) {
        checkDarkMode();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 监听文档类名变化 (可选的额外检查)
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-850 text-white' : 'bg-gray-100'}`}>
      <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        知识图谱可视化
      </h1>
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <GraphVisualization 
          height="700px"
          width="100%"
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}; 