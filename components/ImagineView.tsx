import React, { useState } from 'react';
import { Image as ImageIcon, Loader2, Download, Sparkles } from 'lucide-react';
import { generateImage } from '../services/geminiService';

const ImagineView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateImage(prompt);
      setGeneratedImages(images);
      if (images.length === 0) throw new Error("No images returned");
    } catch (e: any) {
      setError(e.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full">
       <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="text-yellow-400" /> 
            Jesshi Imagine
          </h2>
          <p className="text-slate-400">Transform text into stunning visuals instantly.</p>
       </div>

       {/* Input Area */}
       <div className="flex gap-4 mb-8">
         <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="A futuristic robot painting a canvas on Mars..."
            className="flex-1 bg-slate-800 border-slate-700 text-white rounded-xl px-5 py-4 focus:ring-2 focus:ring-yellow-500 outline-none transition-all placeholder-slate-500"
         />
         <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="px-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
         >
            {isGenerating ? <Loader2 className="animate-spin" /> : <ImageIcon />}
            Generate
         </button>
       </div>

       {/* Error */}
       {error && (
         <div className="p-4 bg-red-900/20 border border-red-800 text-red-200 rounded-xl mb-6">
           {error}
         </div>
       )}

       {/* Gallery */}
       <div className="flex-1 overflow-y-auto min-h-[300px] border-2 border-dashed border-slate-800 rounded-2xl p-6 flex items-center justify-center">
          {generatedImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full">
              {generatedImages.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-2xl bg-slate-800 aspect-square">
                  <img src={img} alt={`Generated ${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={img} download={`jesshi-image-${Date.now()}.png`} className="p-3 bg-white rounded-full text-black hover:bg-slate-200 transition-colors">
                      <Download size={24} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-600 text-center">
               <ImageIcon size={64} className="mx-auto mb-4 opacity-20" />
               <p>Your imagination awaits. Enter a prompt above.</p>
            </div>
          )}
       </div>
    </div>
  );
};

export default ImagineView;