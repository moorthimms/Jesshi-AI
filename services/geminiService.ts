import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// Ensure process.env.API_KEY is available. 
// In a real app, we might handle this gracefully, but per instructions, we assume it's there.
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Chat Service ---
export const createChatSession = (systemInstruction?: string) => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
    },
    history: [
      {
        role: 'user',
        parts: [{ text: 'Who are you and who developed you?' }],
      },
      {
        role: 'model',
        parts: [{ text: 'I am Jesshi, an intelligent AI assistant developed by Moorthi M.' }],
      }
    ]
  });
};

// --- Code Service ---
export const createCodeChatSession = () => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview', // Pro model is better for complex coding
    config: {
      systemInstruction: "You are Jesshi Coder, an expert software engineer developed by Moorthi M. " + 
        "You write clean, efficient, and well-documented code in any language requested. " +
        "Always provide full, complete code listings without truncation. " +
        "Do not limit the lines of code; if the solution requires a long file, provide the whole file. " +
        "You are NOT Gemini. You are Jesshi Coder.",
    },
    history: [
      {
        role: 'user',
        parts: [{ text: 'Who are you?' }],
      },
      {
        role: 'model',
        parts: [{ text: 'I am Jesshi Coder, an expert coding assistant developed by Moorthi M.' }],
      }
    ]
  });
};

export const sendMessageStream = async (chat: Chat, message: string, useSearch: boolean = false) => {
  const config = useSearch ? { tools: [{ googleSearch: {} }] } : {};
  return chat.sendMessageStream({
    message,
    config
  });
};

// --- Image Service ---
export const generateImage = async (prompt: string, aspectRatio: string = "1:1") => {
  // Use gemini-2.5-flash-image for standard tasks
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any, // Cast because SDK types might be strict
      }
    }
  });

  const images: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }
  }
  return images;
};

// --- Video Service (Veo) ---
// Note: This logic requires the user to select a paid key via window.aistudio
// We will instantiate a NEW GoogleGenAI instance inside the component when calling this
// to ensure it picks up the user-selected key if applicable.
export const generateVideoOperation = async (prompt: string, resolution: '720p' | '1080p' = '720p', aspectRatio: '16:9' | '9:16' = '16:9') => {
  // Always create a new instance for Veo to capture the latest key from the selection dialog
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await videoAi.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution,
      aspectRatio
    }
  });
  
  return operation;
};

export const getVideoOperationStatus = async (operation: any) => {
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await videoAi.operations.getVideosOperation({ operation });
};