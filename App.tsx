import React, { useState } from 'react';
import { MessageSquare, Mic, Image as ImageIcon, Film, Menu, X, Code } from 'lucide-react';
import ChatView from './components/ChatView';
import LiveView from './components/LiveView';
import ImagineView from './components/ImagineView';
import VideoView from './components/VideoView';
import CodeView from './components/CodeView';
import { AppMode } from './types';

function App() {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.CHAT:
        return <ChatView />;
      case AppMode.LIVE:
        return <LiveView />;
      case AppMode.IMAGE:
        return <ImagineView />;
      case AppMode.VIDEO:
        return <VideoView />;
      case AppMode.CODE:
        return <CodeView />;
      default:
        return <ChatView />;
    }
  };

  const NavItem = ({ mode, icon: Icon, label }: { mode: AppMode; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveMode(mode);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeMode === mode
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl h-full flex-shrink-0 z-20">
        <div className="mb-8 px-2 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
            J
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Jesshi AI</h1>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <NavItem mode={AppMode.CHAT} icon={MessageSquare} label="Chat & Search" />
          <NavItem mode={AppMode.CODE} icon={Code} label="Code Studio" />
          <NavItem mode={AppMode.LIVE} icon={Mic} label="Jesshi Live" />
          <NavItem mode={AppMode.IMAGE} icon={ImageIcon} label="Imagine" />
          <NavItem mode={AppMode.VIDEO} icon={Film} label="Veo Video" />
        </nav>

        <div className="mt-auto px-4 py-4 text-xs text-slate-500 border-t border-slate-800">
          <p>Powered by Jesshi 2.5 & 3.0 Models</p>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-lg p-4 md:hidden flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-xl font-bold">Jesshi AI</h1>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400">
              <X />
            </button>
          </div>
          <nav className="space-y-4">
            <NavItem mode={AppMode.CHAT} icon={MessageSquare} label="Chat & Search" />
            <NavItem mode={AppMode.CODE} icon={Code} label="Code Studio" />
            <NavItem mode={AppMode.LIVE} icon={Mic} label="Jesshi Live" />
            <NavItem mode={AppMode.IMAGE} icon={ImageIcon} label="Imagine" />
            <NavItem mode={AppMode.VIDEO} icon={Film} label="Veo Video" />
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0 z-20">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs font-bold">J</div>
             <span className="font-bold">Jesshi AI</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="text-slate-300">
            <Menu />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
          
          <div className="h-full max-w-7xl mx-auto relative z-10 flex flex-col">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;