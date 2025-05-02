import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { API_BASE_URL } from '../config';

// Declare NeoVis global variable
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
  onSelectData?: (data: any, type: 'node' | 'relationship') => void;
  autoRunQuery?: boolean;
}

export const GraphVisualization = forwardRef<any, GraphVisualizationProps>(({
  cypher = "MATCH (n)-[r]-(m) RETURN n,r,m LIMIT 50",
  height = "600px",
  width = "100%",
  isDarkMode = false,
  onSelectData,
  autoRunQuery = true
}, ref) => {
  const vizRef = useRef<HTMLDivElement>(null);
  const vizInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<any | null>(null);
  const [dataType, setDataType] = useState<'node' | 'relationship' | null>(null);
  const [prevCypher, setPrevCypher] = useState<string>(cypher);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    // 渲染图谱的方法，供父组件调用
    renderGraph: () => {
      renderGraph();
    },
    zoomIn: (factor: number = 0.2) => {
      if (vizInstanceRef.current && vizInstanceRef.current.network) {
        const currentScale = vizInstanceRef.current.network.getScale();
        vizInstanceRef.current.network.moveTo({
          scale: currentScale + factor
        });
      }
    },
    zoomOut: (factor: number = 0.2) => {
      if (vizInstanceRef.current && vizInstanceRef.current.network) {
        const currentScale = vizInstanceRef.current.network.getScale();
        vizInstanceRef.current.network.moveTo({
          scale: Math.max(0.1, currentScale - factor)
        });
      }
    },
    resetZoom: () => {
      if (vizInstanceRef.current && vizInstanceRef.current.network) {
        vizInstanceRef.current.network.moveTo({
          scale: 1.0
        });
      }
    },
    toggleZoom: () => {
      if (vizInstanceRef.current && vizInstanceRef.current.network) {
        // 获取当前缩放状态
        const currentZoomEnabled = !vizInstanceRef.current._networkOptions || 
                                  !vizInstanceRef.current._networkOptions.interaction || 
                                  vizInstanceRef.current._networkOptions.interaction.zoomView !== false;
        
        // 设置新的缩放状态
        const newZoomable = !currentZoomEnabled;
        
        // 直接设置网络选项
        vizInstanceRef.current.network.setOptions({
          interaction: {
            zoomView: newZoomable
          }
        });
        
        // 保存当前选项状态以便下次切换
        if (!vizInstanceRef.current._networkOptions) {
          vizInstanceRef.current._networkOptions = {};
        }
        if (!vizInstanceRef.current._networkOptions.interaction) {
          vizInstanceRef.current._networkOptions.interaction = {};
        }
        vizInstanceRef.current._networkOptions.interaction.zoomView = newZoomable;
        
        return newZoomable;
      }
      return false;
    },
    fitView: () => {
      if (vizInstanceRef.current && vizInstanceRef.current.network) {
        vizInstanceRef.current.network.fit();
      }
    },
    getScale: () => {
      if (vizInstanceRef.current && vizInstanceRef.current.network) {
        return vizInstanceRef.current.network.getScale();
      }
      return 1;
    }
  }));

  useEffect(() => {
    // Ensure the container has an ID for NeoVis if it doesn't already
    if (vizRef.current && !vizRef.current.id) {
      vizRef.current.id = 'neo4j-graph'; // Assign a default ID
    }

    if (!window.NeoVis) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/neovis.js@2.0.2/dist/neovis.js';
      script.async = true;
      script.onload = () => {
        // 初始加载时不执行查询，等待用户点击"执行查询"按钮
        setIsLoading(false);
      };
      script.onerror = () => {
        setError('加载 NeoVis.js 库失败');
        setIsLoading(false);
      };

      document.body.appendChild(script);

      return () => {
        // Clean up the script tag on component unmount
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    } else {
      // 初始加载时不执行查询，等待用户点击"执行查询"按钮
      setIsLoading(false);
    }
  }, []); // 只在初始加载时运行

  // 监听主题变化，重新渲染图谱
  useEffect(() => {
    if (window.NeoVis && !isLoading && vizInstanceRef.current) {
      renderGraph();
    }
  }, [isDarkMode]);

  // 更新cypher查询参数但不执行查询
  useEffect(() => {
    setPrevCypher(cypher);
  }, [cypher]);

  const renderGraph = async () => {
    // Ensure NeoVis and container are ready
    if (!vizRef.current || !window.NeoVis || !vizRef.current.id) {
       console.warn("NeoVis container not ready or NeoVis not loaded.");
       setIsLoading(false); // Stop loading if prerequisites aren't met
       return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSelectedData(null);
      setDataType(null);
      
      // 如果有onSelectData回调函数，清空选中数据
      if (onSelectData) {
        onSelectData(null, 'node');
      }

      // Clear previous graph instance if it exists and clear container
      // Clearing the container and letting React handle cleanup is often sufficient.
      vizRef.current.innerHTML = '';

      // Note: The original code fetched data from a backend.
      // NeoVis.js typically connects directly to a Neo4j instance.
      // If your backend is *required* to proxy the data, you would need
      // to modify NeoVis or use a different visualization library.
      // Assuming NeoVis connects directly based on its typical usage and the config structure.

      const config = {
        containerId: vizRef.current.id,
        neo4j: {
          // Replace with your actual Neo4j connection details
          serverUrl: "bolt://localhost:7687",
          serverUser: "neo4j",
          serverPassword: "12345678"
        },
        visConfig: { // Retained visConfig from your last provided code
          nodes: {
            font: {
              size: 12,
              color: isDarkMode ? '#ffffff' : '#000000'
              // No background property here
            }
          },
          edges: {
            font: {
              size: 10,
              color: isDarkMode ? '#d1d5db' : '#666666'
              // No background property here
            },
            arrows: {
              to: { enabled: true, scaleFactor: 0.5 }
            }
          }
        },
        labels: {
          "*": { // Default style for all nodes
            caption: "name",
            size: "pagerank", // Assuming pagerank property exists
            community: "community", // Assuming community property exists
            color: isDarkMode ? "#9ca3af" : "#666" // Default color
          },
          "Person": { // Specific style for Person nodes
            caption: "name",
            size: "pagerank",
            community: "community",
            color: isDarkMode ? "#93c5fd" : "#68bdf6" // Blue color
          },
          "Entity": { // Specific style for Entity nodes
            caption: "name",
            size: "pagerank",
            community: "community",
            color: isDarkMode ? "#86efac" : "#6dce9e" // Green color
          },
          // Specific style for Event nodes - Use orange color
          // Keeping this config as it *should* work, and the manual update will override if needed
          "Event": {
            label: "Event", // Explicitly specify the label string
            caption: "name", // You might prefer "eventType" or "originalText" here
            size: "pagerank", // Keep consistent size property or use a fixed size
            community: "community",
            color: isDarkMode ? "#fb923c" : "#f97316" // Orange color for dark and light modes
          }
        },
        relationships: {
          "*": { // Default style for all relationships
            thickness: "weight", // Assuming weight property exists
            caption: "type",
            color: isDarkMode ? "#d1d5db" : "#aaa" // Default color
          }
        },
        initialCypher: cypher,
        backgroundColor: isDarkMode ? "#1f2937" : "#f8f8f8",
        nodeRadius: 25,
        // Add the click to select node/relationship functionality using registerOnEvent
        // This matches the user's provided code structure
      };

      const viz = new window.NeoVis.default(config);
      vizInstanceRef.current = viz;

      // Register node click event (retained user's original logic)
      viz.registerOnEvent("clickNode", (event: any) => {
        const node = event?.node;
        console.log("点击的节点原始数据:", node);

        // Get node's raw properties
        const nodeProperties = node?.properties || {};

        // Try to get properties from different possible locations
        let properties = nodeProperties;
        if (Object.keys(properties).length === 0 && node?.raw?.properties) {
          properties = node.raw.properties;
        }

        const keysToShow = ["name", "type", "eventType", "originalText", "timestampStr"];

        // Create a new object to store properties to display
        const displayData: Record<string, any> = {};

        // Add node type information (retained user's original logic)
        if (node?.labels && node.labels.length > 0) {
          displayData['节点类型'] = node.labels.join(', ');
        }

        // Iterate through all possible property keys
        keysToShow.forEach(key => {
          if (properties[key] !== undefined) {
            displayData[key] = properties[key];
          }
        });

        // If no specified properties found, try to display all available properties
        if (Object.keys(displayData).length === 0) {
          Object.keys(properties).forEach(key => {
            displayData[key] = properties[key];
          });

          // If still no properties, try to display node labels and id
          if (Object.keys(displayData).length === 0 && node?.labels) {
            displayData['labels'] = node.labels.join(', ');
            displayData['id'] = node.id;
            if (node.caption) displayData['caption'] = node.caption;
          }
        }

        setSelectedData(displayData);
        setDataType('node');
        
        // 如果有传入回调函数，则调用
        if (onSelectData) {
          onSelectData(displayData, 'node');
        }
      });

      // Register edge (relationship) click event (retained user's original logic)
      viz.registerOnEvent("clickEdge", (event: any) => {
        const edge = event?.edge;
        console.log("点击的关系原始数据:", edge);

        // Create a new object to store properties to display
        const displayData: Record<string, any> = {};

        // Get relationship type
        let relationType = null;
        if (edge.type) {
          relationType = edge.type;
        } else if (edge.raw && edge.raw.type) {
          relationType = edge.raw.type;
        } else if (typeof edge === 'object') {
          // Iterate through object to find type property
          for (const key in edge) {
            if (key === 'type' && typeof edge[key] === 'string') {
              relationType = edge[key];
              break;
            }
          }
        }

        if (relationType) {
          displayData['关系类型'] = relationType;
        }

        // Find argumentText property (deep search)
        const findArgumentText = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null;

          // Check if current object has argumentText property
          if (obj.argumentText !== undefined) {
            return obj.argumentText;
          }

          // Check properties object
          if (obj.properties && obj.properties.argumentText !== undefined) {
            return obj.properties.argumentText;
          }

          // Recursively check all child objects
          for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              const result = findArgumentText(obj[key]);
              if (result !== null) {
                return result;
              }
            }
          }

          return null;
        };

        const argumentText = findArgumentText(edge);
        if (argumentText !== null) {
          displayData['argumentText'] = argumentText;
        }

        console.log("关系显示数据:", displayData);
        setSelectedData(displayData);
        setDataType('relationship');
        
        // 如果有传入回调函数，则调用
        if (onSelectData) {
          onSelectData(displayData, 'relationship');
        }
      });

      // Re-add completed event listener to manually update Event node colors
      viz.registerOnEvent("completed", () => {
        console.log("渲染完成，尝试手动处理Event节点着色");

        try {
          // Get vis.js network instance
          const network = viz.network;
          if (!network || !network.body || !network.body.data || !network.body.data.nodes) {
            console.error("无法获取网络实例或节点数据集");
            return;
          }

          const nodesDataset = network.body.data.nodes;
          // Get all nodes from the dataset. Use { returnType: 'Object' } to get an object with node ids as keys
          const nodes = nodesDataset.get({ returnType: 'Object' }); 

          const nodesToUpdate: { id: string; color: string | { background: string; border: string; highlight?: { background: string; border: string }; hover?: { background: string; border: string } } }[] = [];

          Object.keys(nodes).forEach((nodeId) => {
            const node = nodes[nodeId];

            if (!node) return; // Skip if node is somehow null/undefined

            let isEvent = false;

            // Check if it's an Event node (using multiple ways to ensure identification)
            // Check labels array (most reliable way from raw data)
            if (node.labels && Array.isArray(node.labels) && node.labels.includes('Event')) {
              isEvent = true;
            } else if (node.raw && node.raw.labels && Array.isArray(node.raw.labels) && node.raw.labels.includes('Event')) {
               isEvent = true;
            }
            // Fallback checks: if labels are not readily available, check eventType property
            else if (node.properties && node.properties.eventType) {
              isEvent = true;
            } else if (node.raw && node.raw.properties && node.raw.properties.eventType) {
              isEvent = true;
            }
            // Check top-level label property (might be set by NeoVis based on config)
            else if (node.label === 'Event') {
                isEvent = true;
            }


            // If it's an Event node, prepare to update color
            if (isEvent) {
              const targetColor = isDarkMode ? "#fb923c" : "#f97316";
              // Check current color to avoid unnecessary updates
              // Note: node.color might be a string or an object depending on initial config/previous updates
              const currentColor = typeof node.color === 'object' ? node.color.background : node.color;

              if (currentColor !== targetColor) {
                // Provide color as a simple string, which vis.js should handle
                nodesToUpdate.push({
                  id: node.id,
                  color: targetColor
                });
                console.log(`准备更新节点 ${node.id} 颜色为 ${targetColor}`);
              }
            }
          });

          // Update nodes in the dataset if there are changes
          if (nodesToUpdate.length > 0) {
             console.log(`更新 ${nodesToUpdate.length} 个节点颜色`);
             nodesDataset.update(nodesToUpdate);
             console.log("节点颜色更新完成");
          }

        } catch (err) {
          console.error("处理Event节点颜色时出错:", err);
           // Log the full error object for more details
           console.error(err);
        }
        
        // 完成加载
        setIsLoading(false);
      });

      // Call render
      viz.render();
      
    } catch (err) {
      setError(`渲染图形失败: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="graph-visualization-container h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-20 z-10">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex items-center">
            <div className={`animate-spin rounded-full h-6 w-6 border-b-2 mr-3 ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
            <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>加载中...</span>
          </div>
        </div>
      )}

      {error && (
        <div className={`absolute top-2 left-2 right-2 p-3 rounded-md flex items-start z-10 ${isDarkMode ? 'bg-red-900/80 border border-red-800 text-red-200' : 'bg-red-100 border border-red-400 text-red-700'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-sm">加载失败</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      <div
        id="neo4j-graph"
        ref={vizRef}
        style={{
          height,
          width,
          backgroundColor: isDarkMode ? "#1f2937" : "#f8f8f8"
        }}
        className="rounded-lg"
      ></div>
    </div>
  );
});
