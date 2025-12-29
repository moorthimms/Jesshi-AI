import React, { useState, useRef } from 'react';
import { Film, Loader2, Play, AlertCircle, Upload, X, Key, CreditCard } from 'lucide-react';
import { generateVideoOperation, getVideoOperationStatus } from '../services/geminiService';

const VideoView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    } else {
      alert("API Key selection is only available within the AI Studio environment.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix for API
        const base64 = reader.result as string;
        setSelectedImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !selectedImage) return;
    
    // Attempt to check key availability first
    if (window.aistudio?.hasSelectedApiKey) {
       const hasKey = await window.aistudio.hasSelectedApiKey();
       if (!hasKey && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
       }
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setError(null);
    setStatusMessage('Initializing Veo 3.1 model...');

    try {
      // Clean base64 string if present (remove data:image/png;base64, prefix)
      const cleanBase64 = selectedImage ? selectedImage.split(',')[1] : undefined;

      let operation = await generateVideoOperation(prompt, cleanBase64);
      
      setStatusMessage('Generating frames... This takes about 1-2 minutes.');
      
      // Polling loop
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await getVideoOperationStatus(operation);
        setStatusMessage('Processing video content...');
      }

      if (operation.error) {
        throw new Error(String(operation.error.message || "Video generation failed"));
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        // Append API Key for download
        const finalUrl = `${uri}&key=${process.env.API_KEY}`;
        setVideoUrl(finalUrl);
      } else {
        throw new Error("No video URI returned");
      }

    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("404") || err.message.includes("Requested entity was not found"))) {
         setError("Veo Model Not Found or Access Denied. Please Ensure you are using a PAID API Key (Billing Project).");
         // Automatically try to open selector if it looks like a key issue
         if (window.aistudio?.openSelectKey) {
             setTimeout(() => window.aistudio!.openSelectKey(), 1000);
         }
      } else {
         setError(err.message || "Failed to generate video");
      }
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 max-w-4xl mx-auto w-full overflow-y-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          Veo Video Studio
        </h2>
        <p className="text-slate-400">Generate high-quality videos from text or images using Veo 3.1 Fast.</p>
        
        {/* Billing Warning / Key Selector */}
        <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-yellow-500 flex items-center gap-1">
               <CreditCard size={12} />
               Requires Paid Billing Project
            </span>
            {window.aistudio?.openSelectKey && (
                <button 
                  onClick={openKeySelector}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 flex items-center gap-1 transition-colors"
                >
                   <Key size={10} />
                   Select Paid API Key
                </button>
            )}
        </div>
      </div>

      <div className="w-full bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col gap-4">
          
          {/* Image Upload Section */}
          <div className="flex flex-col md:flex-row gap-4">
             <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-300 mb-2 block">Reference Image (Optional)</label>
                {selectedImage ? (
                  <div className="relative w-full h-32 bg-slate-900 rounded-xl overflow-hidden group border border-slate-700">
                    <img src={selectedImage} alt="Reference" className="w-full h-full object-cover opacity-80" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                      Image-to-Video Mode
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-purple-500 hover:text-purple-400 transition-colors bg-slate-900/50"
                  >
                    <Upload size={24} className="mb-2" />
                    <span className="text-xs">Upload Start Frame</span>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/png, image/jpeg" 
                />
             </div>
             
             <div className="flex-[2]">
                <label className="text-sm font-medium text-slate-300 mb-2 block">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selectedImage ? "Describe how the image should move..." : "A cyberpunk city with flying cars in neon rain..."}
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                />
             </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-slate-500 hidden md:block">
               Generates 1 video @ 720p
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt.trim() && !selectedImage)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Film size={18} />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="flex flex-col items-center gap-3 animate-pulse w-full max-w-lg">
           <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-1/3 animate-[shimmer_2s_infinite]"></div>
           </div>
           <p className="text-slate-400 text-sm">{statusMessage}</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-start gap-2 text-red-200 bg-red-900/40 px-6 py-4 rounded-xl border border-red-800 w-full max-w-lg">
          <div className="flex items-center gap-2 font-semibold">
             <AlertCircle size={20} className="text-red-400" />
             Generation Failed
          </div>
          <p className="text-sm opacity-90">{error}</p>
          {(error.includes("Key") || error.includes("404") || error.includes("Billing")) && window.aistudio?.openSelectKey && (
             <button 
               onClick={() => window.aistudio!.openSelectKey()}
               className="mt-2 text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors self-end"
             >
               Change API Key
             </button>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative group">
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            loop 
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default VideoView;