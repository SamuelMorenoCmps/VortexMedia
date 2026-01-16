import React, { useState, useRef, useEffect } from 'react';
import { generateVideo } from '../services/gemini';
import { requestNotificationPermission, sendNotification } from '../services/notifications';
import { LoaderIcon, SparklesIcon, CheckIcon, DownloadIcon } from './Icons';

export const Generator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  
  // Settings state
  const [resolution, setResolution] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const selected = await aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
        // Fallback for development outside of the specific environment or if API_KEY env is present
        if (process.env.API_KEY) {
            setHasKey(true);
        }
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Assume success as per instructions to avoid race condition
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Request permission early
    await requestNotificationPermission();

    setIsGenerating(true);
    setError(null);
    setVideoUri(null);

    try {
        // Check for key again right before generation to be safe, though UI should handle it
      const uri = await generateVideo(prompt, resolution, aspectRatio);
      setVideoUri(uri);
      
      // Notify success
      sendNotification('¡Video Generado!', 'Tu video creado con IA está listo para ver.');

    } catch (err: any) {
      console.error("Gemini API Error:", err);
      let errorMessage = "Hubo un error generando el video. Intenta de nuevo.";

      if (err) {
          const msg = err.message || '';
          const status = err.status || err.response?.status;

          if (msg.includes("Requested entity was not found") || status === 404) {
              setHasKey(false);
              errorMessage = "La llave API seleccionada no es válida o el proyecto no tiene acceso al modelo Veo. Por favor selecciona una nueva.";
          } else if (status === 400 || msg.includes("INVALID_ARGUMENT")) {
              errorMessage = "La descripción proporcionada no es válida. Por favor, sé más específico o evita contenido que viole las políticas de seguridad.";
          } else if (status === 403 || msg.includes("PERMISSION_DENIED")) {
              errorMessage = "Permiso denegado. Verifica que tu API Key tenga habilitada la facturación en Google Cloud Console.";
          } else if (status === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
              errorMessage = "Has excedido el límite de cuota de la API. Por favor intenta más tarde.";
          } else if (status === 503 || msg.includes("UNAVAILABLE")) {
              errorMessage = "El servicio de video está temporalmente saturado. Inténtalo de nuevo en unos minutos.";
          } else if (msg.includes("SAFETY")) {
              errorMessage = "La solicitud fue bloqueada por los filtros de seguridad. Intenta modificar tu descripción.";
          }
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasKey) {
     return (
        <div className="w-full max-w-2xl mx-auto text-center glass-panel p-10 rounded-2xl">
            <SparklesIcon className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Activa la Creación de Video</h2>
            <p className="text-slate-400 mb-8">
                Para usar la tecnología Veo de Google y generar videos con IA, necesitas seleccionar una API Key válida con facturación habilitada.
            </p>
            <button 
                onClick={handleSelectKey}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all"
            >
                Seleccionar API Key
            </button>
             <p className="mt-6 text-xs text-slate-500">
                Consulta la <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">documentación de facturación</a> para más detalles.
            </p>
        </div>
     )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
        <label className="block text-sm font-medium text-slate-300 mb-2">
            Describe el video que quieres crear
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Un paisaje futurista cyberpunk con lluvia de neón y coches voladores..."
          className="w-full h-32 bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all resize-none mb-4"
        />

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Calidad</span>
                <div className="flex gap-2">
                    {['720p', '1080p'].map((res) => (
                        <button
                            key={res}
                            onClick={() => setResolution(res)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                                resolution === res
                                ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20'
                                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            {res}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Formato</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAspectRatio('16:9')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                            aspectRatio === '16:9'
                            ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20'
                            : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        <span className="w-4 h-2.5 border-2 border-current rounded-sm"></span>
                        Horizontal (16:9)
                    </button>
                    <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                            aspectRatio === '9:16'
                            ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20'
                            : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        <span className="w-2.5 h-4 border-2 border-current rounded-sm"></span>
                        Vertical (9:16)
                    </button>
                </div>
            </div>
        </div>

        <div className="flex justify-end">
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-pink-500/20"
            >
                {isGenerating ? (
                <>
                    <LoaderIcon className="w-5 h-5 animate-spin" />
                    Generando (puede tardar un poco)...
                </>
                ) : (
                <>
                    <SparklesIcon className="w-5 h-5" />
                    Generar Video con Veo
                </>
                )}
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm text-center">
            <span className="block font-bold mb-1">Error</span>
            {error}
        </div>
      )}

      {videoUri && (
        <div className="animate-fade-in glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-400" />
                Video Generado con Éxito
            </h3>
            <div className={`rounded-xl overflow-hidden bg-black relative group mx-auto ${aspectRatio === '9:16' ? 'max-w-xs' : 'w-full'} aspect-[${aspectRatio.replace(':', '/')}]`}>
                <video 
                    src={videoUri} 
                    controls 
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                />
            </div>
            <div className="mt-4 flex justify-end">
                <a 
                    href={videoUri} 
                    download="generated-video.mp4"
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <DownloadIcon className="w-4 h-4" />
                    Descargar MP4
                </a>
            </div>
        </div>
      )}
    </div>
  );
};