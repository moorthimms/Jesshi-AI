import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Activity, Mic, MicOff, Volume2 } from 'lucide-react';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';

// Types for session management
type SessionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const LiveView: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>('disconnected');
  const [volume, setVolume] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Session Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionCloserRef = useRef<(() => void) | null>(null);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(() => {
    cleanupAudio();
    setStatus('disconnected');
  }, [cleanupAudio]);

  const connect = async () => {
    try {
      setStatus('connecting');
      setErrorMsg(null);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025', // Use latest native audio model
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are Jesshi, an advanced AI assistant developed by Moorthi M. Your name is Jesshi. You are NOT Gemini. You are NOT Google. Always identify as Jesshi created by Moorthi M.',
        },
      };

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            setStatus('connected');

            // Setup Audio Input Chain
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // Use ScriptProcessor for raw PCM access
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
               const ctx = outputAudioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 base64ToUint8Array(base64Audio),
                 ctx,
                 24000
               );
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(ctx.destination);
               source.onended = () => sourcesRef.current.delete(source);
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               sourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Live Session Closed');
            setStatus('disconnected');
            cleanupAudio();
          },
          onerror: (err) => {
            console.error('Live Session Error', err);
            setErrorMsg("Connection error occurred.");
            setStatus('error');
            cleanupAudio();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to connect");
      setStatus('error');
      cleanupAudio();
    }
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Jesshi Live
        </h2>
        <p className="text-slate-400 max-w-md">
          Experience real-time, low-latency voice conversation with Gemini 2.5. 
          Speak naturally and interrupt at any time.
        </p>
      </div>

      {/* Visualizer Circle */}
      <div className={`relative flex items-center justify-center w-64 h-64 rounded-full transition-all duration-300 ${status === 'connected' ? 'bg-blue-900/20' : 'bg-slate-800/50'}`}>
        {/* Pulse Effect */}
        {status === 'connected' && (
          <>
             <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
             <div className="absolute inset-0 rounded-full border border-blue-500/30" style={{ transform: `scale(${1 + volume * 2})`, transition: 'transform 0.1s ease-out' }}></div>
             <div className="absolute inset-0 rounded-full border border-purple-500/30" style={{ transform: `scale(${1 + volume * 3})`, transition: 'transform 0.1s ease-out', transitionDelay: '0.05s' }}></div>
          </>
        )}
        
        <Activity 
          size={64} 
          className={`transition-colors duration-300 ${status === 'connected' ? 'text-blue-400' : 'text-slate-600'}`} 
        />
      </div>

      <div className="flex flex-col items-center space-y-4">
        {status === 'disconnected' || status === 'error' ? (
          <button
            onClick={connect}
            className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-full hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Conversation
          </button>
        ) : (
          <button
            onClick={disconnect}
            disabled={status === 'connecting'}
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-red-600 rounded-full hover:bg-red-500 transition-all shadow-lg hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MicOff className="w-5 h-5 mr-2" />
            {status === 'connecting' ? 'Connecting...' : 'End Conversation'}
          </button>
        )}
        
        {errorMsg && (
          <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
        )}
      </div>

      <div className="text-slate-500 text-sm mt-8">
        <p className="flex items-center gap-2">
           <Volume2 size={14} /> Output Audio: 24kHz
           <span className="mx-2">•</span>
           <Mic size={14} /> Input Audio: 16kHz
        </p>
      </div>
    </div>
  );
};

export default LiveView;