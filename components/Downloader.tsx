import React, { useState, useEffect, useRef } from 'react';
import { analyzeLink } from '../services/gemini';
import { requestNotificationPermission, sendNotification } from '../services/notifications';
import { AnalysisResult, HistoryItem } from '../types';
import { LoaderIcon, CheckIcon, DownloadIcon, YoutubeIcon, InstagramIcon, TwitterIcon, FacebookIcon, MusicIcon, MessageCircleIcon, HistoryIcon, ClipboardIcon, FilmIcon, SparklesIcon, TikTokIcon, PlayIcon, PlaylistIcon } from './Icons';
import { ThemeConfig } from '../App';

interface BatchItem {
  id: string;
  url: string;
  status: 'idle' | 'analyzing' | 'ready' | 'downloading' | 'completed' | 'error';
  progress: number;
  speed: string;
  phase: string;
  timeLeft: string;
  result: AnalysisResult | null;
  errorMsg?: string;
  suggestion?: string;
  helpLink?: string;
  type: 'video' | 'audio';
}

interface DownloaderProps {
  theme: ThemeConfig;
}

export const Downloader: React.FC<DownloaderProps> = ({ theme }) => {
  const [inputText, setInputText] = useState('');
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Global Settings
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');

  // Refs to manage intervals for multiple items
  const intervalsRef = useRef<{ [key: string]: ReturnType<typeof setInterval> }>({});

  useEffect(() => {
    const stored = localStorage.getItem('vortex_media_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    
    return () => {
      // Cleanup intervals on unmount
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(prev => prev ? `${prev}\n${text}` : text);
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const addToHistory = (resultData: AnalysisResult, link: string) => {
    if (!resultData.isValid) return;

    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random(),
      url: link,
      platform: resultData.platform,
      timestamp: Date.now(),
      summary: resultData.summary
    };

    setHistory(prev => {
      const filtered = prev.filter(item => item.url !== link);
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('vortex_media_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem('vortex_media_history');
    setHistory([]);
  };

  const extractUrls = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return text.match(urlRegex) || [];
  };

  const handleAnalyzeBatch = async () => {
    if (!inputText.trim()) return;

    const rawUrls = extractUrls(inputText);
    const uniqueUrls = Array.from(new Set(rawUrls));

    if (uniqueUrls.length === 0) return;

    // Create new batch items
    const newItems: BatchItem[] = uniqueUrls.map((url: string) => ({
        id: crypto.randomUUID(),
        url,
        status: 'analyzing',
        progress: 0,
        speed: '0 MB/s',
        phase: 'Iniciando...',
        timeLeft: '--',
        result: null,
        type: downloadType
    }));

    // Add to queue
    setQueue(prev => {
        const existingUrls = new Set(prev.map(i => i.url));
        const filteredNew = newItems.filter(i => !existingUrls.has(i.url));
        return [...filteredNew, ...prev]; 
    });
    
    setInputText('');

    // Trigger Analysis for each new item
    newItems.forEach(async (item) => {
        try {
            const data = await analyzeLink(item.url);
            
            if (data.isValid) {
                updateItem(item.id, { 
                    status: 'ready', 
                    result: data,
                });
            } else {
                updateItem(item.id, { 
                    status: 'error', 
                    errorMsg: 'Plataforma no soportada', 
                    result: data,
                });
            }
        } catch (error) {
            updateItem(item.id, { 
                status: 'error', 
                errorMsg: 'Error de conexión',
            });
        }
    });
  };

  // Simulates fetching items from a playlist
  const expandPlaylist = (itemId: string, platform: string) => {
      const item = queue.find(i => i.id === itemId);
      if (!item) return;

      // Mock expansion data
      const mockCount = Math.floor(Math.random() * 5) + 3;
      const newItems: BatchItem[] = [];

      for(let i = 1; i <= mockCount; i++) {
          newItems.push({
              id: crypto.randomUUID(),
              url: `${item.url}&index=${i}`, // Simulated URL
              status: 'ready',
              progress: 0,
              speed: '0 MB/s',
              phase: 'Listo',
              timeLeft: '--',
              type: downloadType,
              result: {
                  platform: platform,
                  isValid: true,
                  contentType: downloadType,
                  summary: `${downloadType === 'audio' ? 'Track' : 'Episodio'} #${i} de la lista`,
                  // Fake thumbnail rotation
                  thumbnailUrl: item.result?.thumbnailUrl, 
                  isPlaylist: false
              }
          });
      }

      // Replace the playlist container with its items
      setQueue(prev => {
          const index = prev.findIndex(q => q.id === itemId);
          if (index === -1) return prev;
          const newQueue = [...prev];
          newQueue.splice(index, 1, ...newItems);
          return newQueue;
      });
  };

  const updateItem = (id: string, updates: Partial<BatchItem>) => {
      setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const startDownload = async (itemId: string) => {
    const item = queue.find(q => q.id === itemId);
    if (!item || item.status !== 'ready') return;

    await requestNotificationPermission();

    if (item.result && !item.url.includes('&index=')) {
        addToHistory(item.result, item.url);
    }

    updateItem(itemId, { status: 'downloading', progress: 0 });

    const isAudio = item.type === 'audio';
    let progress = 0;

    if (intervalsRef.current[itemId]) clearInterval(intervalsRef.current[itemId]);

    const interval = setInterval(() => {
        const increment = Math.random() * 5 + 1;
        progress += increment;

        let phase = '';
        if (progress < 20) phase = 'Conectando...';
        else if (progress < 50) phase = isAudio ? 'Extrayendo audio HQ...' : 'Descargando video...';
        else if (progress < 80) phase = isAudio ? 'Convirtiendo a MP3...' : 'Procesando MP4...';
        else if (progress < 99) phase = 'Etiquetando...';
        else phase = '¡Listo!';

        const speedVal = (Math.random() * 8 + 5).toFixed(1);

        if (progress >= 100) {
            progress = 100;
            clearInterval(intervalsRef.current[itemId]);
            delete intervalsRef.current[itemId];
            updateItem(itemId, { 
                status: 'completed', 
                progress: 100, 
                phase: 'Guardado', 
                timeLeft: '0s' 
            });
        } else {
            updateItem(itemId, {
                progress: Math.min(100, Math.round(progress)),
                phase,
                speed: `${speedVal} MB/s`,
            });
        }
    }, 200 + Math.random() * 300);

    intervalsRef.current[itemId] = interval;
  };

  const handleDownloadAll = () => {
      queue.forEach((item, index) => {
          if (item.status === 'ready') {
              // Stagger start times slightly for effect
              setTimeout(() => startDownload(item.id), index * 300);
          }
      });
  };

  const removeItem = (id: string) => {
      if (intervalsRef.current[id]) clearInterval(intervalsRef.current[id]);
      setQueue(prev => prev.filter(i => i.id !== id));
  };

  const getPlatformIcon = (platform: string, size: string = "w-6 h-6") => {
    const p = platform.toLowerCase();
    if (p.includes('youtube')) return <YoutubeIcon className={`${size} text-red-500`} />;
    if (p.includes('instagram')) return <InstagramIcon className={`${size} text-pink-500`} />;
    if (p.includes('twitter') || p.includes('x')) return <TwitterIcon className={`${size} text-blue-400`} />;
    if (p.includes('facebook')) return <FacebookIcon className={`${size} text-blue-600`} />;
    if (p.includes('spotify')) return <MusicIcon className={`${size} text-green-500`} />;
    if (p.includes('whatsapp')) return <MessageCircleIcon className={`${size} text-green-400`} />;
    if (p.includes('tiktok')) return <TikTokIcon className={`${size} text-[#ff0050]`} />;
    return <DownloadIcon className={`${size} text-${theme.primary}-500`} />;
  };
  
  // Stats Calculation
  const totalItems = queue.length;
  const readyCount = queue.filter(i => i.status === 'ready').length;
  const completedItems = queue.filter(i => i.status === 'completed').length;
  const overallProgress = totalItems > 0 
    ? Math.round(queue.reduce((acc, item) => acc + item.progress, 0) / totalItems)
    : 0;

  return (
    <div className="w-full space-y-8">
      {/* Input Area */}
      <div className="glass-panel p-1 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className={`absolute inset-0 bg-gradient-to-b from-${theme.primary}-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity`}></div>
        
        <div className="bg-[#0f172a]/90 p-6 sm:p-8 rounded-[22px] backdrop-blur-sm relative z-10">
            <div className="flex flex-col gap-5">
                
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                    <div className="flex-1">
                        <label className={`text-xs font-bold text-${theme.primary}-400 tracking-wider uppercase mb-1.5 block ml-1 flex items-center gap-2`}>
                            <PlaylistIcon className="w-4 h-4" />
                            Gestor de Lotes y Playlists
                        </label>
                        <p className="text-slate-500 text-xs ml-1">Pega enlaces individuales o listas enteras.</p>
                    </div>
                    
                    <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700/50 flex shadow-inner">
                        <button
                            onClick={() => {
                                setDownloadType('video');
                                // Update pending items type
                                setQueue(prev => prev.map(i => i.status === 'ready' ? {...i, type: 'video'} : i));
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                                downloadType === 'video' 
                                ? `bg-${theme.primary}-500 text-slate-900 shadow-lg` 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            <FilmIcon className="w-3.5 h-3.5" />
                            VIDEO MP4
                        </button>
                        <button
                            onClick={() => {
                                setDownloadType('audio');
                                setQueue(prev => prev.map(i => i.status === 'ready' ? {...i, type: 'audio'} : i));
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                                downloadType === 'audio' 
                                ? `bg-${theme.primary}-500 text-slate-900 shadow-lg` 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            <MusicIcon className="w-3.5 h-3.5" />
                            AUDIO MP3
                        </button>
                    </div>
                </div>

                {/* Batch Textarea */}
                <div className="relative group/input">
                    <div className={`absolute inset-0 bg-${theme.primary}-500/10 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500`}></div>
                    <textarea
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder={downloadType === 'audio' 
                            ? "Pega enlaces de Spotify, SoundCloud o YouTube aquí...\n(Uno por línea o detectaremos playlists automáticamente)" 
                            : "Pega enlaces de YouTube, TikTok, Instagram aquí...\n(Soporta Playlist URL)"}
                        rows={3}
                        className={`relative w-full bg-slate-950 border border-slate-700 rounded-xl pl-5 pr-12 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-${theme.primary}-500 transition-all resize-none font-mono text-sm leading-relaxed`}
                    />
                    <button 
                        onClick={handlePaste}
                        className={`absolute right-3 top-3 p-2 text-slate-500 hover:text-${theme.primary}-400 hover:bg-slate-800 rounded-lg transition-colors z-10`}
                        title="Pegar"
                    >
                        <ClipboardIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <button
                    onClick={handleAnalyzeBatch}
                    disabled={!inputText.trim()}
                    className={`w-full bg-gradient-to-r ${theme.bgGradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg`}
                    style={{ boxShadow: `0 10px 30px -5px ${theme.accentGlow}40` }}
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Analizar Enlaces</span>
                </button>
            </div>
        </div>
      </div>

      {/* Batch Status */}
      {totalItems > 1 && (
        <div className="animate-fade-in flex flex-col gap-4">
             {/* Progress Summary Card */}
             <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-full bg-${theme.primary}-500/20 text-${theme.primary}-400`}>
                        {downloadType === 'audio' ? <MusicIcon className="w-6 h-6" /> : <FilmIcon className="w-6 h-6" />}
                     </div>
                     <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                            {downloadType === 'audio' ? 'Cola de Audio' : 'Cola de Video'}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {completedItems}/{totalItems} completados • {overallProgress}% global
                        </p>
                     </div>
                </div>

                {readyCount > 0 && (
                    <button
                        onClick={handleDownloadAll}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all animate-pulse"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Descargar Todo
                    </button>
                )}
             </div>
        </div>
      )}

      {/* Queue List */}
      {queue.length > 0 && (
          <div className={`grid gap-3 ${downloadType === 'audio' ? 'grid-cols-1' : 'grid-cols-1'}`}>
              {queue.map((item) => (
                  <div key={item.id} 
                       className={`glass-panel bg-[#0f172a]/60 rounded-2xl border border-white/5 relative overflow-hidden animate-fade-in group
                       ${downloadType === 'audio' ? 'p-3 flex items-center gap-4 h-20' : 'p-4 flex flex-col sm:flex-row gap-4'}`}
                  >
                      {/* Audio View Layout */}
                      {downloadType === 'audio' && item.result ? (
                          <>
                            <div className="w-14 h-14 rounded-lg bg-slate-800 flex-shrink-0 relative overflow-hidden group/thumb cursor-pointer">
                                {item.result.thumbnailUrl ? (
                                    <img src={item.result.thumbnailUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                        <MusicIcon className="w-6 h-6" />
                                    </div>
                                )}
                                {item.status === 'downloading' && (
                                    <div className={`absolute inset-0 bg-${theme.primary}-500/30 flex items-center justify-center`}>
                                        <LoaderIcon className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="text-sm font-bold text-white truncate">{item.result.platform}</h4>
                                <p className="text-xs text-slate-400 truncate">{item.result.summary}</p>
                            </div>

                            <div className="w-32 hidden sm:block">
                                {item.status === 'downloading' && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>{item.phase}</span>
                                            <span>{item.progress}%</span>
                                        </div>
                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full bg-${theme.primary}-500`} style={{width: `${item.progress}%`}}></div>
                                        </div>
                                    </div>
                                )}
                                {item.status === 'completed' && (
                                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end">
                                        <CheckIcon className="w-3 h-3" /> MP3 Listo
                                    </span>
                                )}
                            </div>

                            <div className="flex-shrink-0">
                                {item.result.isPlaylist ? (
                                    <button onClick={() => expandPlaylist(item.id, item.result!.platform)} className={`px-3 py-1.5 rounded-lg bg-${theme.primary}-500/20 text-${theme.primary}-400 text-xs font-bold border border-${theme.primary}-500/30 hover:bg-${theme.primary}-500/30`}>
                                        Cargar Playlist
                                    </button>
                                ) : item.status === 'ready' ? (
                                    <button onClick={() => startDownload(item.id)} className="p-2 rounded-full hover:bg-white/10 text-slate-300 transition-colors">
                                        <DownloadIcon className="w-5 h-5" />
                                    </button>
                                ) : null}
                            </div>
                          </>
                      ) : (
                          // Standard/Video View Layout (Original)
                          <>
                            <div className="flex-shrink-0 w-24 h-16 sm:w-32 sm:h-20 rounded-xl bg-slate-900 border border-white/10 relative overflow-hidden">
                                {item.result?.thumbnailUrl ? (
                                    <img src={item.result.thumbnailUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {item.status === 'analyzing' ? <LoaderIcon className="animate-spin text-slate-600" /> : <FilmIcon className="text-slate-700" />}
                                    </div>
                                )}
                                {item.status === 'downloading' && <div className={`absolute bottom-0 left-0 h-1 bg-${theme.primary}-500`} style={{ width: `${item.progress}%` }} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <h4 className="text-sm font-bold text-white truncate pr-2">
                                        {item.result ? item.result.platform : 'Procesando...'}
                                    </h4>
                                    <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-400">✕</button>
                                </div>
                                <p className="text-xs text-slate-400 truncate mb-2">{item.url}</p>

                                {item.status === 'error' && (
                                     <p className="text-xs text-red-400">{item.errorMsg}</p>
                                )}

                                {item.status === 'ready' && item.result?.isPlaylist && (
                                    <div className="mt-2">
                                        <button 
                                            onClick={() => expandPlaylist(item.id, item.result!.platform)}
                                            className={`w-full py-2 rounded-lg bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2`}
                                        >
                                            <PlaylistIcon className="w-4 h-4" />
                                            Cargar Contenido de Playlist
                                        </button>
                                    </div>
                                )}

                                {(item.status === 'downloading' || (item.status === 'ready' && !item.result?.isPlaylist)) && (
                                    <div className="flex items-center justify-between mt-2">
                                         {item.status === 'ready' ? (
                                             <button 
                                                onClick={() => startDownload(item.id)}
                                                className={`px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-${theme.primary}-600 text-white text-xs font-bold border border-white/10 transition-all`}
                                             >
                                                Descargar MP4
                                             </button>
                                         ) : (
                                             <span className="text-xs text-slate-400 font-mono">{item.phase} • {item.speed}</span>
                                         )}
                                    </div>
                                )}
                                {item.status === 'completed' && <div className="text-emerald-400 text-xs font-bold mt-2">¡Guardado en Galería!</div>}
                            </div>
                          </>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="max-w-4xl mx-auto w-full pt-4 border-t border-white/5 mt-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 text-slate-500">
                    <HistoryIcon className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Historial Reciente</h3>
                </div>
                <button 
                    onClick={clearHistory}
                    className="text-[10px] font-bold text-slate-600 hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                    Limpiar
                </button>
            </div>
            <div className="grid gap-2 opacity-60 hover:opacity-100 transition-opacity">
                {history.map((item) => (
                    <div 
                        key={item.id}
                        className="p-3 rounded-lg border border-white/5 flex items-center gap-3 bg-slate-900/40"
                    >
                        <div className="text-slate-500">
                            {getPlatformIcon(item.platform, "w-4 h-4")}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs font-medium truncate pr-2">{item.url}</span>
                                <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};