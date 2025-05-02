import React, { useState, useEffect, useRef } from 'react';
import { GraphVisualization } from './GraphVisualization';
import { CONFIG } from '../config';

export const GraphPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedData, setSelectedData] = useState<any | null>(null);
  const [dataType, setDataType] = useState<'node' | 'relationship' | null>(null);
  const [customCypher, setCustomCypher] = useState<string>("MATCH (n)-[r]-(m) RETURN n,r,m LIMIT 50");
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [lockDragging, setLockDragging] = useState<boolean>(false);
  const [fitView, setFitView] = useState<boolean>(false);
  const vizRef = useRef<any>(null);
  
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

  // 处理节点或关系选择
  const handleDataSelect = (data: any, type: 'node' | 'relationship') => {
    setSelectedData(data);
    setDataType(type);
  };

  // 处理查询语句变更
  const handleCypherChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomCypher(e.target.value);
  };
  
  // 处理提交查询
  const handleSubmitQuery = () => {
    setIsLoading(true);
    
    // 调用图谱组件的renderGraph方法
    if (vizRef.current && vizRef.current.renderGraph) {
      vizRef.current.renderGraph();
    }
    
    // 设置一个短暂的延迟以显示加载状态
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  };
  
  // 关闭详情面板
  const handleCloseDetails = () => {
    setSelectedData(null);
    setDataType(null);
  };
  
  // 处理缩放
  const handleZoomIn = () => {
    if (vizRef.current && vizRef.current.zoomIn) {
      vizRef.current.zoomIn(0.2);
    }
    setZoom(prev => Math.min(prev + 0.2, 3));
  };
  
  const handleZoomOut = () => {
    if (vizRef.current && vizRef.current.zoomOut) {
      vizRef.current.zoomOut(0.2);
    }
    setZoom(prev => Math.max(prev - 0.2, 0.3));
  };
  
  const handleResetZoom = () => {
    if (vizRef.current && vizRef.current.resetZoom) {
      vizRef.current.resetZoom();
    }
    setZoom(1);
  };
  
  // 处理锁定滚轮缩放
  const handleToggleZoom = () => {
    try {
      if (vizRef.current && vizRef.current.toggleZoom) {
        const isZoomable = vizRef.current.toggleZoom();
        setLockDragging(!isZoomable); // 更新状态，用于按钮显示
      }
    } catch (error) {
      console.error("切换缩放功能时出错:", error);
    }
  };
  
  // 处理适应视图
  const handleFitView = () => {
    if (vizRef.current && vizRef.current.fitView) {
      vizRef.current.fitView();
      setFitView(true);
      setTimeout(() => setFitView(false), 300);
    }
  };

  const inputTextColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const labelTextColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className={`h-full overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* 页面头部 */}
      <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <h1 className={`text-xl font-bold flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            知识图谱可视化
          </h1>
        </div>
      </div>
      
      {/* 主要内容区域 - 左右布局 */}
      <div className="h-[calc(100%-3.5rem)] flex">
        {/* 左侧面板 - 查询和设置 */}
        <div className={`w-80 border-r overflow-y-auto ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="cypher-query" className={`block text-sm font-medium ${labelTextColor}`}>
                  Cypher 查询语句
                </label>
                <span className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Neo4j查询
                </span>
              </div>
              <textarea
                id="cypher-query"
                value={customCypher}
                onChange={handleCypherChange}
                className={`w-full p-3 border rounded-md shadow-sm font-mono text-sm ${inputBgColor} ${inputTextColor} ${inputBorderColor} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150`}
                rows={6}
                placeholder="例如: MATCH (n)-[r]-(m) RETURN n,r,m LIMIT 50"
              />
            </div>
            
            <button
              type="button"
              onClick={handleSubmitQuery}
              disabled={isLoading}
              className={`w-full px-4 py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition duration-150 flex items-center justify-center shadow-sm mb-6 disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  执行中...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  执行查询
                </>
              )}
            </button>
            
            {/* 图谱操作控制 */}
            <div className={`p-4 rounded-lg border mb-4 ${isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-medium mb-3 ${labelTextColor} flex items-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                图谱操作控制
              </h3>
              
              {/* 缩放控制 */}
              <div className="mb-4">
                <p className={`text-xs ${labelTextColor} mb-2`}>缩放控制:</p>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleZoomOut}
                    className={`flex-1 p-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} text-xs flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={handleResetZoom}
                    className={`flex-1 p-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} text-xs flex items-center justify-center`}
                  >
                    <span>{Math.round(zoom * 100)}%</span>
                  </button>
                  
                  <button 
                    onClick={handleZoomIn}
                    className={`flex-1 p-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} text-xs flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* 视图控制 */}
              <div className="space-y-2">
                <button 
                  onClick={handleToggleZoom}
                  className={`w-full p-2 rounded-md ${
                    lockDragging 
                      ? (isDarkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800') 
                      : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                  } text-xs flex items-center justify-center`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {lockDragging ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    )}
                  </svg>
                  {lockDragging ? '允许滚轮缩放' : '锁定滚轮缩放'}
                </button>
                
                <button 
                  onClick={handleFitView}
                  className={`w-full p-2 rounded-md ${
                    fitView 
                      ? (isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800') 
                      : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                  } text-xs flex items-center justify-center`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                  适应视图
                </button>
              </div>
            </div>
            
            {/* 使用帮助 */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-medium mb-3 ${labelTextColor} flex items-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                使用帮助
              </h3>
              <ul className={`space-y-2 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>输入Cypher查询语句后点击"执行查询"</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>点击节点查看详细信息</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>点击关系线条查看关系属性</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>使用控制面板调整图谱大小和位置</span>
                </li>
                <li className="flex">
                  <span className="mr-2">•</span>
                  <span>点击"适应视图"以显示完整图谱</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* 右侧面板 - 图谱展示和节点详情 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 图谱展示区域 */}
          <div className={`flex-1 overflow-hidden p-4 ${selectedData ? '' : 'pb-0'}`}>
            <div className={`h-full rounded-xl overflow-hidden shadow-lg ${isDarkMode ? 'ring-1 ring-gray-700' : ''}`}>
              <GraphVisualization 
                height="100%"
                width="100%"
                isDarkMode={isDarkMode}
                cypher={customCypher}
                onSelectData={handleDataSelect}
                ref={vizRef}
                autoRunQuery={false}
              />
            </div>
          </div>
          
          {/* 节点详情区域（根据是否有选中数据显示） */}
          {selectedData && (
            <div className={`border-t p-3 overflow-y-auto ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`} style={{ height: '35%' }}>
              <div className="flex items-center mb-2">
                <span className={`inline-flex items-center justify-center p-1.5 rounded-md mr-2 ${
                  dataType === 'node'
                    ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                    : (isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800')
                }`}>
                  {dataType === 'node' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  )}
                </span>
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {dataType === 'node' ? '节点详情' : '关系详情'}
                </h3>
                <button 
                  className={`ml-auto text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  onClick={handleCloseDetails}
                >
                  关闭
                </button>
              </div>
              
              <div className={`rounded-md ${isDarkMode ? 'bg-gray-750' : 'bg-white'} p-3`}>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(selectedData || {}).map(([key, value]) => (
                    <div key={key} className={typeof value === 'string' && value.length > 100 ? 'col-span-2' : ''}>
                      <dt className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{key}</dt>
                      <dd className="mt-1">
                        {typeof value === 'string' && value.length > 100 ? (
                          <pre className={`whitespace-pre-wrap break-words p-2 rounded-md text-xs ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            {String(value)}
                          </pre>
                        ) : (
                          <span>{String(value)}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 