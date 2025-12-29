import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Terminal, User, Copy, Check } from 'lucide-react';
import { createCodeChatSession, sendMessageStream } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Chat } from '@google/genai';

// Simple component to render text with code block detection
const CodeMessageRenderer: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split by markdown code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 w-full">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          // Regex to match ```language\n code ```
          const match = part.match(/^```(\w+)?\n([\s\S]*)```$/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3); // Fallback

          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-[#1e1e1e] shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-slate-700">
                <span className="text-xs font-mono text-slate-400 lowercase">{lang || 'code'}</span>
                <button 
                  onClick={() => handleCopy(code, index)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {copiedIndex === index ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                  {copiedIndex === index ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-sm text-slate-200 leading-relaxed tab-4">{code}</pre>
              </div>
            </div>
          );
        }
        // Regular text
        if (!part.trim()) return null;
        return <div key={index} className="whitespace-pre-wrap leading-relaxed">{part}</div>;
      })}
    </div>
  );
};

const CodeView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = createCodeChatSession();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping || !chatSessionRef.current) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
        isLoading: true
      }]);

      const result = await sendMessageStream(chatSessionRef.current, userText);
      
      let fullText = '';
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, text: fullText } 
              : msg
          ));
        }
      }

      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId ? { ...msg, isLoading: false } : msg
      ));

    } catch (error) {
      console.error("Code Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "// Error generating code. Please try again.",
        timestamp: Date.now(),
        isLoading: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-[#161b22]">
        <div className="w-8 h-8 rounded bg-green-900/30 flex items-center justify-center border border-green-800">
           <Terminal size={18} className="text-green-500" />
        </div>
        <div>
           <h3 className="font-semibold text-slate-200 font-mono">Jesshi Code Studio</h3>
           <p className="text-xs text-slate-500 font-mono">Unlimited Code Generation • Gemini 3.0 Pro</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 font-mono">
            <Terminal size={48} className="mb-4" />
            <p className="text-center">Ready to code.<br/>Ask for any language, any complexity.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700 mt-1">
                <Terminal size={16} className="text-green-400" />
              </div>
            )}
            
            <div className={`max-w-[95%] lg:max-w-[85%] space-y-2 min-w-0 overflow-hidden`}>
              {msg.role === 'user' ? (
                 <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-none whitespace-pre-wrap">
                    {msg.text}
                 </div>
              ) : (
                 <div className="text-slate-300">
                    <CodeMessageRenderer text={msg.text} />
                 </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#161b22] border-t border-slate-800">
        <div className="relative flex items-center gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
               }
            }}
            placeholder="Describe the code you need..."
            disabled={isTyping}
            className="flex-1 bg-[#0d1117] text-slate-100 placeholder-slate-600 px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all disabled:opacity-50 font-mono text-sm resize-none h-[50px] max-h-[150px] scrollbar-hide"
            style={{ minHeight: '50px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-green-700 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="text-center mt-2">
           <span className="text-[10px] text-slate-600 font-mono">Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};

export default CodeView;