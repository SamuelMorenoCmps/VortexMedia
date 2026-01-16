import React, { useState, useRef, useEffect } from 'react';
import { Downloader } from './components/Downloader';
import { PaletteIcon, CrownIcon } from './components/Icons';

export interface ThemeConfig {
  id: string;
  name: string;
  primary: string; // Tailwind color name (e.g. 'cyan', 'violet')
  secondary: string; // Tailwind color name
  bgGradient: string; // CSS classes
  accentGlow: string; // Hex for box-shadows mainly
}

const themes: ThemeConfig[] = [
  {
    id: 'neon',
    name: 'Neon Cyber',
    primary: 'cyan',
    secondary: 'blue',
    bgGradient: 'from-cyan-400 to-blue-600',
    accentGlow: '#06b6d4'
  },
  {
    id: 'sunset',
    name: 'Sunset Drive',
    primary: 'fuchsia',
    secondary: 'orange',
    bgGradient: 'from-fuchsia-500 to-orange-500',
    accentGlow: '#d946ef'
  },
  {
    id: 'forest',
    name: 'Forest Rain',
    primary: 'emerald',
    secondary: 'lime',
    bgGradient: 'from-emerald-400 to-lime-600',
    accentGlow: '#10b981'
  },
  {
    id: 'royal',
    name: 'Royal Velvet',
    primary: 'violet',
    secondary: 'rose',
    bgGradient: 'from-violet-500 to-rose-500',
    accentGlow: '#8b5cf6'
  },
  {
    id: 'ocean',
    name: 'Ocean Deep',
    primary: 'blue',
    secondary: 'teal',
    bgGradient: 'from-blue-500 to-teal-400',
    accentGlow: '#3b82f6'
  },
  {
    id: 'cosmic',
    name: 'Cosmic Dust',
    primary: 'purple',
    secondary: 'pink',
    bgGradient: 'from-purple-500 to-pink-500',
    accentGlow: '#a855f7'
  }
];

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(themes[0]);
  const [showMenu, setShowMenu] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    contentRef.current.style.setProperty('--mouse-x', `${x}px`);
    contentRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden text-slate-100 selection:bg-white/20 flex flex-col">
      
      {/* Dynamic Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Blob 1 */}
        <div 
            className={`absolute top-0 -left-4 w-96 h-96 bg-${currentTheme.primary}-500/30 rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob`}
            style={{ transitionDuration: '1000ms' }}
        ></div>
        {/* Blob 2 */}
        <div 
            className={`absolute top-0 -right-4 w-96 h-96 bg-${currentTheme.secondary}-500/30 rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob`}
            style={{ animationDelay: '2000ms', transitionDuration: '1000ms' }}
        ></div>
        {/* Blob 3 */}
        <div 
            className={`absolute -bottom-32 left-20 w-96 h-96 bg-${currentTheme.primary}-600/30 rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob`}
            style={{ animationDelay: '4000ms', transitionDuration: '1000ms' }}
        ></div>
        {/* Blob 4 (Extra for larger screens) */}
        <div 
            className={`hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-${currentTheme.secondary}-600/10 rounded-full mix-blend-screen filter blur-[100px] animate-pulse`}
            style={{ transitionDuration: '1000ms' }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10 flex flex-col flex-1">
        
        {/* Header - Simplified: Logo acts as Theme Menu Trigger */}
        <header className="flex justify-center md:justify-start items-center mb-12 relative pt-4" ref={menuRef}>
            <div className="relative z-50">
                <button 
                    onClick={() => setShowMenu(!showMenu)} 
                    className="flex items-center gap-3 group focus:outline-none"
                    title="Cambiar Tema"
                >
                    <div className={`w-12 h-12 bg-gradient-to-br ${currentTheme.bgGradient} rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-lg brand-font transition-all duration-500 group-hover:scale-105 group-hover:shadow-${currentTheme.primary}-500/50`} style={{ boxShadow: `0 10px 25px -5px ${currentTheme.accentGlow}40` }}>
                        V
                    </div>
                    <div className="flex flex-col items-start">
                        <h1 className="text-3xl font-bold tracking-tight brand-font flex items-center gap-2 group-hover:text-white transition-colors">
                          VortexMedia
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border border-${currentTheme.primary}-500/30 bg-${currentTheme.primary}-500/10 text-${currentTheme.primary}-400 font-mono`}>
                            PRO
                          </span>
                        </h1>
                    </div>
                    {/* Small indicator that this is clickable */}
                    <div className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-${currentTheme.primary}-400`}>
                        <PaletteIcon className="w-4 h-4" />
                    </div>
                </button>

                {/* Dropdown Menu (Themes Only) */}
                {showMenu && (
                    <div className="absolute top-full left-0 mt-4 w-64 glass-panel rounded-2xl overflow-hidden shadow-2xl animate-fade-in border border-white/10 p-2 backdrop-blur-xl bg-[#0f172a]/95">
                        <p className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 mb-1">
                            <CrownIcon className="w-3 h-3 text-yellow-500" />
                            Seleccionar Tema
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                            {themes.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        setCurrentTheme(theme);
                                        setShowMenu(false);
                                    }}
                                    className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-3 ${currentTheme.id === theme.id ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${theme.bgGradient} shadow-sm`}></div>
                                    {theme.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </header>

        {/* Hero Text */}
        <div className="text-center mb-8 space-y-2 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight brand-font">
            El Vórtice de Descargas.
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto leading-relaxed text-sm md:text-base">
            Gestión inteligente de medios para creadores. <span className={`text-${currentTheme.primary}-400 font-semibold mx-1`}>Rápido. Universal.</span>
          </p>
        </div>

        {/* Content Area with Spotlight Effect */}
        <main 
            ref={contentRef}
            onMouseMove={handleMouseMove}
            className="flex-1 w-full max-w-4xl mx-auto relative spotlight-card p-[1px] rounded-3xl"
        >
          {/* Transition wrapper */}
          <div className="relative w-full animate-slide-up">
             <Downloader theme={currentTheme} />
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 py-8 border-t border-white/5 text-center relative z-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} <span className={`text-${currentTheme.primary}-500 font-medium`}>VortexMedia</span>. Suite Profesional.
            </p>
            <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity">
                Créditos: Samuel Moreno
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}