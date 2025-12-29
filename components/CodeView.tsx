import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Terminal, User, Copy, Check, Maximize2 } from 'lucide-react';
import { createCodeChatSession, sendMessageStream } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Chat } from '@google/genai';

// Dedicated CodeBlock component for better performance and styling
const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Trigger Prism highlight when code or language changes
    if (codeRef.current && (window as any).Prism) {
      (window as any).Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e1e] shadow-2xl group ring-1 ring-black/50 transition-all hover:shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)]">
      {/* Mac-style Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-black/20 select-none">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm" />
           <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm" />
           <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm" />
        </div>
        
        <span className="text-xs font-mono text-slate-500 font-medium group-hover:text-slate-300 transition-colors uppercase tracking-wider">
          {language || 'plaintext'}
        </span>

        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg active:scale-95"
        >
          {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      
      {/* Content */}
      <div className="relative overflow-x-auto custom-scrollbar bg-[#1e1e1e]">
        <pre className="!m-0 !p-5 !bg-transparent !text-[13px] md:!text-sm !font-['JetBrains_Mono'] leading-relaxed">
          <code ref={codeRef} className={`language-${language || 'plaintext'}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

// Component to split message text and render code blocks
const CodeMessageRenderer: React.FC<{ text: string }> = ({ text }) => {
  // Regex to match markdown code blocks: ```language\n code ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 w-full">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/^```(\w+)?\n([\s\S]*)```$/);
          // If regex matches, use captured language; else remove backticks
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3).replace(/^\n/, '');
          
          return <CodeBlock key={index} language={lang} code={code} />;
        }
        
        // Regular text rendering
        if (!part.trim()) return null;
        return (
          <div key={index} className="whitespace-pre-wrap leading-relaxed text-slate-300 font-sans px-1">
            {part}
          </div>
        );
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
    <div className="flex flex-col h-full bg-[#0d1117] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-slate-800 flex items-center justify-between bg-[#161b22]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-900/50 to-emerald-900/50 flex items-center justify-center border border-green-800/50 shadow-lg shadow-green-900/20">
             <Terminal size={18} className="text-green-400" />
          </div>
          <div>
             <h3 className="font-semibold text-slate-100 font-sans tracking-tight">Jesshi Code Studio</h3>
             <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               Gemini 2.0 Flash Active
             </p>
          </div>
        </div>
        <div className="hidden sm:flex gap-2">
           <div className="px-3 py-1 bg-[#0d1117] border border-slate-700 rounded-md text-[10px] font-mono text-slate-400">TypeScript</div>
           <div className="px-3 py-1 bg-[#0d1117] border border-slate-700 rounded-md text-[10px] font-mono text-slate-400">Python</div>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 font-mono">
            <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 border border-slate-700">
               <Terminal size={40} className="text-slate-400" />
            </div>
            <p className="text-center text-sm md:text-base">Ready to code.<br/>Ask for any language, any complexity.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] flex items-center justify-center flex-shrink-0 border border-slate-700 shadow-lg mt-1">
                <Terminal size={14} className="text-green-400" />
              </div>
            )}
            
            <div className={`max-w-[95%] lg:max-w-[85%] min-w-0`}>
              {msg.role === 'user' ? (
                 <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-2xl rounded-br-sm shadow-xl font-sans text-sm md:text-base border border-blue-500/50">
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                 </div>
              ) : (
                 <div className="text-slate-300 w-full">
                    <CodeMessageRenderer text={msg.text} />
                 </div>
              )}
              
              {msg.role === 'model' && msg.isLoading && !msg.text && (
                 <div className="flex gap-1 mt-2 ml-2">
                    <div className="w-1.5 h-1.5 bg-green-500/50 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-green-500/50 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-green-500/50 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                 </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700 mt-1">
                <User size={14} className="text-slate-400" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="relative z-20 p-4 bg-[#161b22] border-t border-slate-800">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-[#0d1117] border border-slate-700 p-2 rounded-xl focus-within:ring-2 focus-within:ring-green-500/50 focus-within:border-green-500/50 transition-all shadow-lg">
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
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 px-3 py-2 focus:outline-none font-mono text-sm resize-none scrollbar-hide max-h-[200px]"
            style={{ minHeight: '44px', height: 'auto' }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="p-2.5 bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-green-900/20"
          >
            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="text-center mt-3">
           <span className="text-[10px] text-slate-600 font-mono flex justify-center items-center gap-4">
             <span>Shift + Enter for new line</span>
             <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
             <span>Markdown Supported</span>
           </span>
        </div>
      </div>
    </div>
  );
};

export default CodeView;