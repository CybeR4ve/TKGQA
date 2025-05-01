import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';

// 声明 NeoVis 全局变量
declare global {
  interface Window {
    NeoVis: any;
  }
}

interface GraphVisualizationProps {
  cypher?: string;
  height?: string;
  width?: string;
  isDarkMode?: boolean;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  cypher = "MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 50",
  height = "600px",
  width = "100%",
  isDarkMode = false
}) => {
  const vizRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customCypher, setCustomCypher] = useState(cypher);

  useEffect(() => {
    // 动态加载 NeoVis.js 脚本
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/neovis.js@2.0.2/dist/neovis.js';
    script.async = true;

    script.onload = () => {
      renderGraph();
    };

    script.onerror = () => {
      setError('加载 NeoVis.js 库失败');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const renderGraph = async () => {
    if (!vizRef.current || !window.NeoVis) return;

    try {
      setIsLoading(true);
      setError(null);

      // 获取 Neo4j 数据
      const response = await fetch(`${API_BASE_URL}/kg/visualization-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cypher: customCypher })
      });

      if (!response.ok) {
        throw new Error(`获取图数据失败: ${response.statusText}`);
      }

      // 初始化 NeoVis
      const config = {
        containerId: vizRef.current.id,
        neo4j: {
          serverUrl: "bolt://localhost:7687", // 这里使用后端配置的值
          serverUser: "neo4j",
          serverPassword: "12345678" // 建议通过环境变量或配置文件设置
        },
        labels: {
          // 为所有节点设置默认样式
          "*": {
            caption: "name",
            size: "pagerank",
            community: "community",
            color: isDarkMode ? "#9ca3af" : "#666" // 深浅色模式不同颜色
          },
          // 可以为特定类型的节点设置样式
          "Person": {
            caption: "name",
            size: "pagerank",
            community: "community",
            color: isDarkMode ? "#93c5fd" : "#68bdf6" // 深浅色模式不同颜色
          },
          "Entity": {
            caption: "name",
            size: "pagerank",
            community: "community",
            color: isDarkMode ? "#86efac" : "#6dce9e" // 深浅色模式不同颜色
          }
        },
        relationships: {
          // 为所有关系设置默认样式
          "*": {
            thickness: "weight",
            caption: "type",
            color: isDarkMode ? "#d1d5db" : "#aaa" // 深浅色模式不同颜色
          }
        },
        initialCypher: customCypher,
        backgroundColor: isDarkMode ? "#1f2937" : "#f8f8f8", // 深浅色模式不同背景色
        nodeRadius: 25
      };

      const viz = new window.NeoVis.default(config);
      viz.render();
      setIsLoading(false);
    } catch (err) {
      setError(`渲染图形失败: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  // 当isDarkMode改变时重新渲染图形
  useEffect(() => {
    if (!isLoading && window.NeoVis) {
      renderGraph();
    }
  }, [isDarkMode]);

  const handleCypherChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomCypher(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    renderGraph();
  };

  const inputTextColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const labelTextColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className="graph-visualization-container">
      <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        知识图谱可视化
      </h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-2">
          <label htmlFor="cypher-query" className={`block text-sm font-medium ${labelTextColor}`}>
            Cypher 查询:
          </label>
          <textarea
            id="cypher-query"
            value={customCypher}
            onChange={handleCypherChange}
            className={`w-full p-2 border rounded shadow-sm ${inputBgColor} ${inputTextColor} ${inputBorderColor}`}
            rows={3}
          />
        </div>
        <button
          type="submit"
          className={`px-4 py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded`}
        >
          更新图形
        </button>
      </form>

      {isLoading && (
        <div className="flex justify-center items-center h-24">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
          <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>加载中...</span>
        </div>
      )}

      {error && (
        <div className={`${isDarkMode ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-100 border-red-400 text-red-700'} border px-4 py-3 rounded mb-4`}>
          <p>{error}</p>
        </div>
      )}

      <div 
        id="neo4j-graph" 
        ref={vizRef} 
        style={{ 
          height, 
          width, 
          border: isDarkMode ? '1px solid #374151' : '1px solid #ddd', 
          borderRadius: '4px',
          backgroundColor: isDarkMode ? '#1f2937' : '#f8f8f8'
        }}
      ></div>
    </div>
  );
}; 