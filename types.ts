export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CODE = 'CODE'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isLoading?: boolean;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface GeneratedVideo {
  url: string;
  prompt: string;
  timestamp: number;
}

// Global declaration for the aistudio object
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}