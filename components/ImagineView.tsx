import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Loader2, Download, Sparkles, Wand2, Upload, X, AlertCircle } from 'lucide-react';
import { generateImage, editImage } from '../services/geminiService';

type Mode = 'generate' | 'edit';

const ImagineView: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode === 'generate') return;
    if ((!prompt.trim() || !uploadImage) && mode === 'edit') return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      let images: string[] = [];
      if (mode === 'generate') {
         images = await generateImage(prompt);
      } else {
         if (uploadImage) {
            // Remove header for API
            const base64 = uploadImage.split(',')[1];
            images = await editImage(prompt, base64);
         }
      }
      
      setGeneratedImages(images);
      if (images.length === 0) throw new Error("No images returned");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to process image");
      // If error is about access, trigger key selection if possible
      if ((e.message?.includes("404") || e.message?.includes("Billing")) && window.aistudio?.openSelectKey) {
          setTimeout(() => window.aistudio!.openSelectKey(), 1500);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full">
       <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="text-yellow-400" /> 
            Jesshi Imagine
          </h2>
          <p className="text-slate-400">Create or Edit visuals instantly with Gemini 2.5 Flash Image.</p>
       </div>

       {/* Mode Toggle */}
       <div className="flex justify-center mb-6">
         <div className="bg-slate-800 p-1 rounded-full flex">
           <button 
             onClick={() => setMode('generate')}
             className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'generate' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
           >
             Create New
           </button>
           <button 
             onClick={() => setMode('edit')}
             className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'edit' ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
           >
             Edit Image
           </button>
         </div>
       </div>

       {/* Input Area */}
       <div className="flex flex-col gap-4 mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
         
         {mode === 'edit' && (
           <div className="flex justify-center mb-2">
             {uploadImage ? (
                <div className="relative w-48 h-48 group">
                   <img src={uploadImage} alt="Upload" className="w-full h-full object-cover rounded-xl border border-slate-700" />
                   <button 
                     onClick={() => setUploadImage(null)}
                     className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                   >
                     <X size={16} />
                   </button>
                </div>
             ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-yellow-500 hover:text-yellow-500 transition-colors"
                >
                  <Upload size={24} className="mb-2" />
                  <span className="text-sm">Upload Image to Edit</span>
                </button>
             )}
             <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
           </div>
         )}

         <div className="flex gap-4">
            <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder={mode === 'generate' ? "A futuristic robot painting a canvas..." : "Make the background a snowy mountain..."}
                className="flex-1 bg-slate-800 border-slate-700 text-white rounded-xl px-5 py-4 focus:ring-2 focus:ring-yellow-500 outline-none transition-all placeholder-slate-500"
            />
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || (mode === 'edit' && !uploadImage)}
                className="px-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
            >
                {isGenerating ? <Loader2 className="animate-spin" /> : (mode === 'generate' ? <ImageIcon /> : <Wand2 />)}
                {mode === 'generate' ? 'Generate' : 'Edit'}
            </button>
         </div>
       </div>

       {/* Error */}
       {error && (
         <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800 text-red-200 rounded-xl mb-6">
           <AlertCircle size={20} />
           <p className="text-sm">{error}</p>
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
               <p>{mode === 'generate' ? "Your imagination awaits. Enter a prompt above." : "Upload an image and describe changes."}</p>
            </div>
          )}
       </div>
    </div>
  );
};

export default ImagineView;