import React, { useState, useRef, useEffect } from 'react';
import { ChatHistory } from './components/ChatHistory';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import type { Conversation, Message } from './types';

// API endpoints
const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  // Fetch all conversations from the API
  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`);
      if (response.ok) {
        const data = await response.json();
        // Convert ISO date strings to Date objects
        const formattedData = data.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        setConversations(formattedData);
        if (formattedData.length > 0 && !activeConversation) {
          setActiveConversation(formattedData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `新对话 ${conversations.length + 1}`,
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        // Convert ISO date string to Date object
        newConversation.timestamp = new Date(newConversation.timestamp);
        
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversation(newConversation.id);
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !activeConversation) return;
    
    // Optimistically add user message to UI
    const tempUserMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation) {
        // Update conversation title if it's the first message
        const updatedConv = {
          ...conv,
          messages: [...conv.messages, tempUserMessage],
        };
        if (conv.messages.length === 0) {
          updatedConv.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        }
        return updatedConv;
      }
      return conv;
    }));

    // Send message to API
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace optimistic user message with actual one from server and add system response
        setConversations(prev => prev.map(conv => {
          if (conv.id === activeConversation) {
            // Find and replace the temporary user message
            const updatedMessages = conv.messages.filter(msg => msg.id !== tempUserMessage.id);
            
            // Add the actual messages from the server
            const userMessage = {
              ...data.userMessage,
              timestamp: new Date(data.userMessage.timestamp)
            };
            
            const systemMessage = {
              ...data.systemMessage,
              timestamp: new Date(data.systemMessage.timestamp)
            };
            
            return {
              ...conv,
              messages: [...updatedMessages, userMessage, systemMessage],
            };
          }
          return conv;
        }));
      } else {
        // If there was an error, keep the optimistic message but show an error
        console.error('Error sending message:', await response.text());
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentConversation = conversations.find(conv => conv.id === activeConversation);

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatHistory
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onNewConversation={handleNewConversation}
      />
      
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {currentConversation?.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              开始新的对话...
            </div>
          ) : (
            currentConversation?.messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;