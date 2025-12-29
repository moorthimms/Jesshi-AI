import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// Ensure process.env.API_KEY is available. 
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
    model: 'gemini-3-pro-preview', // Use Pro for complex coding tasks
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
  // Use Gemini 2.5 Flash Image for generation
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any
        }
      }
    });

    const images: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
        }
      }
    }
    
    if (images.length === 0) {
      throw new Error("No image data received from the model.");
    }
    
    return images;
  } catch (error: any) {
    console.error("Image generation failed:", error);
    if (error.message?.includes('404') || error.message?.includes('not found')) {
        throw new Error("Model not found. Please select a Paid API Key (Billing Project).");
    }
    throw error;
  }
};

export const editImage = async (prompt: string, base64Image: string, mimeType: string = 'image/png') => {
  // Use Gemini 2.5 Flash Image for editing (Multimodal input)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1" // Default for edited output
        }
      }
    });

    const images: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
        }
      }
    }
    
    if (images.length === 0) {
      throw new Error("No edited image data received.");
    }

    return images;
  } catch (error: any) {
    console.error("Image edit failed:", error);
    throw error;
  }
};

// --- Video Service (Veo) ---
export const generateVideoOperation = async (
  prompt: string, 
  base64Image?: string,
  resolution: '720p' | '1080p' = '720p', 
  aspectRatio: '16:9' | '9:16' = '16:9'
) => {
  // Always create a new instance for Veo to capture the latest key from the selection dialog
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use Veo 3.1 Fast
  const params: any = {
    model: 'veo-3.1-fast-generate-preview', 
    config: {
      numberOfVideos: 1,
      resolution,
      aspectRatio
    }
  };

  if (base64Image) {
    // Image-to-Video
    params.prompt = prompt || "Animate this image"; // Prompt is optional but recommended
    params.image = {
      imageBytes: base64Image,
      mimeType: 'image/png', 
    };
  } else {
    // Text-to-Video
    params.prompt = prompt;
  }
  
  return await videoAi.models.generateVideos(params);
};

export const getVideoOperationStatus = async (operation: any) => {
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await videoAi.operations.getVideosOperation({ operation });
};