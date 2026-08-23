import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TwinPanel from './components/TwinPanel';
import ChatPanel from './components/ChatPanel';
import MemoryModal from './components/MemoryModal';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const INITIAL_DEMO_MESSAGES = [
  {
    id: 'demo-1',
    sender: 'twin',
    text: "Hello. I'm SecondSelf, your AI digital twin. I can browse the web on Windows, remember personal information, and perform tasks for you. Try asking \"Search Google for Python AI agent tutorials\" or \"Open Google\".",
    timestamp: '10:00 AM'
  }
];

export default function App() {
  const [messages, setMessages] = useState(INITIAL_DEMO_MESSAGES);
  const [lastActivity, setLastActivity] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [memories, setMemories] = useState([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/memory`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.warn('Failed to fetch memories:', err);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
    const interval = setInterval(fetchMemories, 10000);
    return () => clearInterval(interval);
  }, [fetchMemories]);

  const handleSendMessage = async (userText) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. Append User Message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: timeStr
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // 2. Set UI loading & activity state
    setIsThinking(true);
    setLastActivity('analyzing');

    try {
      setLastActivity('thinking');

      // Format conversation history for API
      const historyContext = updatedMessages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch(`${API_BASE_URL}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: userText,
          history: historyContext
        })
      });

      const resData = await res.json();

      if (res.ok) {
        setLastActivity('completed');
        const twinMsg = {
          id: `twin-${Date.now()}`,
          sender: 'twin',
          text: resData.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolCalls: resData.tool_calls || []
        };
        setMessages((prev) => [...prev, twinMsg]);
        fetchMemories();
      } else {
        setLastActivity('error');
        const errorDetail = resData.detail || 'Failed to process task with backend LLM.';
        const twinErrorMsg = {
          id: `twin-error-${Date.now()}`,
          sender: 'twin',
          text: `Configuration or Service Error: ${errorDetail}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, twinErrorMsg]);
      }

    } catch (err) {
      console.error('API Chat request failed:', err);
      setLastActivity('error');
      const networkErrorMsg = {
        id: `twin-net-error-${Date.now()}`,
        sender: 'twin',
        text: `Unable to reach SecondSelf backend server. Please verify the FastAPI service is running at ${API_BASE_URL}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsThinking(false);
      setTimeout(() => {
        setLastActivity(null);
      }, 4000);
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <div className="app-main-layout">
        <TwinPanel
          lastActivity={lastActivity}
          memoryCount={memories.length}
          onOpenModal={() => setIsMemoryModalOpen(true)}
        />
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isThinking={isThinking}
        />
      </div>

      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memories={memories}
        onRefresh={fetchMemories}
      />
    </div>
  );
}
