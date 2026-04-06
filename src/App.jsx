import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';
import { Download, Image as ImageIcon, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = { LAYOUT: 0, CAMERA: 1, SELECT: 2, RESULT: 3 };
const SHOT_OPTIONS = [4, 6, 8];

const INITIAL_FRAMES = [
  { id: 'white', name: '화이트', hex: '#ffffff' },
  { id: 'black', name: '블랙', hex: '#171717' },
  { id: 'beige', name: '베이지', hex: '#fdf6e3' },
  { id: 'yellow', name: '옐로우', hex: '#fde047' },
  { id: 'mint', name: '민트', hex: '#6ee7b7' },
  { id: 'green', name: '그린', hex: '#86efac' },
  { id: 'sky', name: '스카이', hex: '#7dd3fc' },
  { id: 'blue', name: '블루', hex: '#3b82f6' },
  { id: 'navy', name: '네이비', hex: '#1e3a8a' },
  { id: 'purple', name: '퍼플', hex: '#d8b4fe' },
  { id: 'rose', name: '핑크', hex: '#fbcfe8' },
  { id: 'red', name: '레드', hex: '#fca5a5' },
  { id: 'wave', name: '파도', image: '/frames/wave_frame.jpg' },
  { id: 'beach', name: '해변', image: '/frames/beach_frame.jpg' },
  { id: 'flower', name: '꽃', image: '/frames/flower_frame.png' },
  { id: 'aurora', name: '오로라', image: '/frames/aurora_frame.png' },
  { id: 'sunset', name: '노을', image: '/frames/sunset_frame.png' },
  { id: 'yunseul', name: '윤슬', image: '/frames/yunseul.png' },
  { id: 'sunrise', name: '일출', image: '/frames/sunrise.png' },
];

const FILTERS = [
  { id: 'none', name: '기본', filter: 'none' },
  { id: 'grayscale', name: '흑백', filter: 'grayscale(100%)' },
  { id: 'sepia', name: '세피아', filter: 'sepia(100%)' },
  { id: 'vivid', name: '선명하게', filter: 'saturate(150%) brightness(110%)' },
  { id: 'warm', name: '따뜻하게', filter: 'sepia(30%) saturate(120%)' },
  { id: 'cool', name: '시원하게', filter: 'hue-rotate(180deg) saturate(110%)' },
];

// Helper: get best supported mimeType for recording
const getVideoMime = () => {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
};
const getVideoExt = (mime) => mime.includes('mp4') ? 'mp4' : 'webm';

// Frame overlay component (shared between photo and video frame)
function FrameOverlay({ frame }) {
  if (!frame) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {frame.image && <img src={frame.image} className="w-full h-full object-cover opacity-80 mix-blend-multiply" />}
      {frame.gradient && <div className={`w-full h-full bg-gradient-to-br ${frame.gradient} opacity-60`} />}
    </div>
  );
}

function FrameLabel({ frame, size1 = '26px', size2 = '15px', gap = '6px', isCapture = false }) {
  const isInitial = INITIAL_FRAMES.some(f => f.id === frame?.id);
  const dark = frame?.id === 'black';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}.${month}.${day}`;
  
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    if (!isInitial) return;
    document.fonts.ready.then(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const isResult = size1 === '80px';
      
      const pxSize1 = isResult ? 80 : 26;
      const pxSize2 = isResult ? 46 : 15;
      const gapPx = isResult ? 20 : parseInt(gap.replace(/[^0-9]/g, '')) || 6;

      const dpr = 3;
      const width = isResult ? 1080 : 300;
      const h1 = pxSize1 * 1.2;
      const h2 = pxSize2 * 1.2;
      const totalH = h1 + gapPx + h2;
      const height = totalH + 40; // extra padding
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx.scale(dpr, dpr);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const color1 = dark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
      const color2 = dark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
      
      const startY = 20 + h1 / 2;
      const secondY = 20 + h1 + gapPx + h2 / 2;

      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.1em';
      ctx.font = `${pxSize1}px GeekbleMalang2`;
      ctx.fillStyle = color1;
      ctx.fillText('신림 네컷', width / 2, startY);
      
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.2em';
      ctx.font = `500 ${pxSize2}px OG_Renaissance_Secret`;
      ctx.fillStyle = color2;
      
      // 약간의 위아래 정렬 미세조정 (폰트 차이)
      ctx.fillText(dateStr, width / 2, secondY - (isResult ? 4 : 1));
      
      setImgUrl(canvas.toDataURL('image/png'));
    });
  }, [isInitial, dark, dateStr, size1, gap]);

  return (
    <div className={`w-full flex flex-col items-center justify-center ${dark ? 'border-white/10' : 'border-black/5'} ${isInitial && !isCapture ? (dark ? 'border-t border-white/10' : 'border-t-2 border-black/5') : ''}`}
         style={{ height: isCapture ? '100%' : 'auto', paddingTop: isCapture ? '0' : '32px', paddingBottom: isCapture ? '0' : '40px' }}>
      {isInitial ? (
        imgUrl ? (
          <img src={imgUrl} style={{ width: size1 === '80px' ? '1080px' : '300px', height: 'auto', pointerEvents: 'none', objectFit: 'contain' }} alt="label" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: gap }}>
            <p className={`tracking-[0.1em] ${dark ? 'text-white/40' : 'text-black/40'}`} style={{ fontFamily: 'GeekbleMalang2', fontSize: size1, lineHeight: '1.2' }}>신림 네컷</p>
            <p className={`tracking-[0.2em] font-medium ${dark ? 'text-white/70' : 'text-black/70'}`} style={{ fontFamily: 'OG_Renaissance_Secret', fontSize: size2, lineHeight: '1.2' }}>{dateStr}</p>
          </div>
        )
      ) : (
        <div style={{ height: isCapture ? '100%' : '55px' }} />
      )}
    </div>
  );
}

function App() {
  const [step, setStep] = useState(STEPS.LAYOUT);
  const [selectedShots, setSelectedShots] = useState(SHOT_OPTIONS[0]);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [selectedFrame, setSelectedFrame] = useState(INITIAL_FRAMES[0]);
  const [timerSeconds] = useState(4);
  const [customFrames, setCustomFrames] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [selectedPhotosForLayout, setSelectedPhotosForLayout] = useState([]);
  const [resultPhase, setResultPhase] = useState('frame');
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const webcamRef = useRef(null);
  const isCapturing = useRef(false);

  // Fetch custom frames from backend
  useEffect(() => {
    const fetchFrames = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/frames`);
        if (res.ok) { setCustomFrames(await res.json()); return; }
      } catch {}
      setCustomFrames(JSON.parse(localStorage.getItem('pickmem-custom-frames') || '[]'));
    };
    fetchFrames();
  }, []);


  // Countdown timer
  const increaseTimer = () => {
    setCountdown(prev => prev !== null ? prev + 2 : timerSeconds + 2);
  };

  useEffect(() => {
    let interval;
    if (countdown !== null && countdown > 0) {
      interval = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0 && !isCapturing.current) {
      handleSnap();
    }
    return () => clearInterval(interval);
  }, [countdown]);

  // Auto-start countdown immediately when ready for next shot
  useEffect(() => {
    if (step === STEPS.CAMERA && capturedPhotos.length < selectedShots && countdown === null && !isCapturing.current) {
      const t = setTimeout(() => setCountdown(timerSeconds), 300);
      return () => clearTimeout(t);
    }
  }, [step, capturedPhotos.length, selectedShots, countdown, timerSeconds]);


  // Move to SELECT when all shots done
  useEffect(() => {
    if (capturedPhotos.length > 0 && capturedPhotos.length === selectedShots) {
      const t = setTimeout(() => setStep(STEPS.SELECT), 1000);
      return () => clearTimeout(t);
    }
  }, [capturedPhotos.length, selectedShots]);

  const handleSnap = () => {
    if (capturedPhotos.length >= selectedShots || isCapturing.current) return;
    isCapturing.current = true;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) setCapturedPhotos(prev => [...prev, imageSrc]);
    setCountdown(null);
    isCapturing.current = false;
  };

  // Photo selection
  const togglePhotoSelection = (photo) => {
    const isSelected = selectedPhotosForLayout.includes(photo);
    if (isSelected) {
      setSelectedPhotosForLayout(prev => prev.filter(p => p !== photo));
    } else if (selectedPhotosForLayout.length < 4) {
      setSelectedPhotosForLayout(prev => [...prev, photo]);
    }
  };

  const saveImage = async () => {
    const el = document.getElementById('photo-frame-result');
    if (!el) return;

    // DOM 자체가 1080x1920 이므로 그냥 캡쳐하면 딱 그 사이즈 고스란히 담깁니다.
    const canvas = await html2canvas(el, { 
      useCORS: true, 
      scale: 1, 
      backgroundColor: null,
    });

    const a = document.createElement('a');
    a.download = `shillim-4cut-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };


  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Image = ev.target.result;
      const tempId = Date.now().toString();
      const opt = { id: tempId, image: base64Image, name: '커스텀' };
      setCustomFrames(prev => [opt, ...prev]);
      setSelectedFrame(opt);
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/frames`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image, name: '커스텀' })
        });
        if (res.ok) {
          const data = await res.json();
          setCustomFrames(prev => prev.map(f => f.id === tempId ? data.frame : f));
          setSelectedFrame(data.frame);
        }
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const deleteCustomFrame = async (id) => {
    setCustomFrames(prev => prev.filter(f => f.id !== id));
    if (selectedFrame?.id === id) setSelectedFrame(INITIAL_FRAMES[0]);
    try { await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/frames/${id}`, { method: 'DELETE' }); } catch {}
  };

  const resetAll = () => {
    setCapturedPhotos([]);
    setSelectedPhotosForLayout([]);
    setStep(STEPS.LAYOUT); setCountdown(null); setResultPhase('frame');
  };

  const goBack = () => {
    if (step === STEPS.CAMERA) {
      setStep(STEPS.LAYOUT);
      setCapturedPhotos([]);
      setCountdown(null);
    } else if (step === STEPS.SELECT) {
      // Re-shoot from scratch or keep previous photos? Keeping it simple: user goes back to camera but photos are kept?
      // Actually, if they go back to camera, they might resume capturing. Let's not clear capturedPhotos here,
      // or clear only selected layout photos.
      setStep(STEPS.CAMERA);
      setSelectedPhotosForLayout([]);
    } else if (step === STEPS.RESULT) {
      setStep(STEPS.SELECT);
    }
  };

  return (
    <div className="h-screen bg-[#fdfcfb] font-sans text-neutral-900 overflow-hidden flex flex-col selection:bg-indigo-100">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ccc; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {/* ── No Header ── */}

      <main className="flex-1 overflow-hidden relative">
        {step > STEPS.LAYOUT && (
          <button 
            onClick={goBack}
            className="absolute top-6 left-6 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg text-neutral-600 hover:text-indigo-600 hover:scale-110 active:scale-90 transition-all border border-neutral-100"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <AnimatePresence mode="wait">

          {/* ── LAYOUT: Pick shot count ── */}
          {step === STEPS.LAYOUT && (
            <motion.div key="layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full p-8 gap-12">
              <h3 className="text-3xl font-black mb-4 tracking-tight text-neutral-800">촬영 장수를 골라주세요</h3>
              <div className="grid grid-cols-3 gap-8 w-full max-w-lg">
                {SHOT_OPTIONS.map(num => (
                  <button key={num}
                    onClick={() => { setSelectedShots(num); setStep(STEPS.CAMERA); }}
                    className={`aspect-square rounded-[40px] font-black text-5xl transition-all border-4 flex flex-col items-center justify-center gap-2
                      ${selectedShots === num ? 'border-indigo-600 bg-white text-indigo-600 shadow-2xl scale-110' : 'border-neutral-100 bg-neutral-50 text-neutral-300 hover:bg-white'}`}>
                    <span>{num}</span>
                    <span className="text-sm uppercase tracking-widest opacity-40">CUT</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── CAMERA ── */}
          {step === STEPS.CAMERA && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center h-full w-full justify-center p-2 text-center">
              <div className="relative w-full max-w-xl bg-neutral-900 rounded-[60px] overflow-hidden shadow-2xl border-[16px] border-white ring-1 ring-neutral-100 aspect-[2/3] flex-shrink">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" mirrored={true} className="w-full h-full object-cover" />
                <FrameOverlay frame={selectedFrame} />
                {countdown !== null && (
                  <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="text-[200px] font-black text-white drop-shadow-2xl italic">{countdown}</span>
                  </motion.div>
                )}
                {/* Badges */}
                <div className="absolute top-10 left-10 flex items-center gap-3 z-30">
                  <div className="bg-rose-500 text-white px-6 py-3 rounded-full text-[12px] font-black tracking-widest flex items-center gap-3 animate-pulse shadow-xl">
                    <div className="w-3 h-3 bg-white rounded-full" /> {capturedPhotos.length}/{selectedShots} 완료
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-6 w-full max-w-xl items-center px-6">
                <div className="flex-1 bg-white p-6 rounded-[40px] border-2 border-neutral-50 flex items-center justify-between px-8 shadow-sm">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-neutral-300 mb-1">촬영 간격</span>
                    <span className="text-3xl font-black text-indigo-600">{countdown ?? timerSeconds}초</span>
                  </div>
                  <button onClick={increaseTimer} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[12px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">2초 늘리기</button>
                </div>
                <button onClick={handleSnap} disabled={capturedPhotos.length >= selectedShots}
                  className="px-10 py-7 bg-amber-400 text-amber-950 rounded-[40px] font-black text-xl shadow-xl active:scale-95">바로 촬영</button>
              </div>

              <div className="mt-6 flex gap-3 overflow-x-auto p-2 w-full max-w-2xl justify-center">
                {[...Array(selectedShots)].map((_, i) => (
                  <div key={i} className="w-16 aspect-[3/4] bg-neutral-50 rounded-xl overflow-hidden border-2 border-white shadow-md relative flex-shrink-0 ring-1 ring-neutral-100">
                    {capturedPhotos[i] ? <img src={capturedPhotos[i]} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center opacity-10"><ImageIcon size={16} /></div>}
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/15 flex items-center justify-center text-[7px] font-black text-white">{i+1}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── SELECT ── */}
          {step === STEPS.SELECT && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center p-6 h-full w-full">
              <h2 className="text-3xl font-black italic tracking-tighter text-indigo-900 mb-1">순서대로 4장을 선택해주세요</h2>
              <p className="text-neutral-400 mb-8 font-bold text-sm tracking-tight">{selectedPhotosForLayout.length} / 4 선택됨 · 선택한 순서대로 프레임에 배치됩니다 ✨</p>

              <div className="grid grid-cols-4 gap-4 w-full max-w-4xl mb-8 overflow-y-auto max-h-[58vh] p-2">
                {capturedPhotos.map((photo, i) => {
                  const selIdx = selectedPhotosForLayout.indexOf(photo);
                  const isSel = selIdx !== -1;
                  return (
                    <button key={i} onClick={() => togglePhotoSelection(photo)}
                      className={`relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-4 transition-all ${isSel ? 'border-indigo-600 scale-105' : 'border-white opacity-75 hover:opacity-100'}`}>
                      <img src={photo} className="w-full h-full object-cover" />
                      {isSel && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl ring-4 ring-white">
                            {selIdx + 1}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { if (selectedPhotosForLayout.length === 4) setStep(STEPS.RESULT); }}
                disabled={selectedPhotosForLayout.length !== 4}
                className={`px-12 py-5 rounded-[40px] font-black text-xl flex items-center gap-4 transition-all shadow-xl
                  ${selectedPhotosForLayout.length === 4 ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-neutral-200 text-neutral-400 opacity-50 cursor-not-allowed'}`}>
                선택 완료 및 꾸미기 <ChevronRight />
              </button>
            </motion.div>
          )}

          {step === STEPS.RESULT && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-start h-full w-full pt-[10px] pb-4 px-6 relative gap-2.5 overflow-hidden">
              
              <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center relative">
                {/* ── Photo Preview (1080x1920 UI) ── */}
                <div className="animate-in fade-in zoom-in duration-700 mt-4 relative" 
                     style={{ 
                       transform: `scale(${Math.min(1, (viewportSize.w - 40) / 1080, ((viewportSize.h || 800) - 260) / 1920)})`, 
                       transformOrigin: 'top center',
                       width: '1080px', height: '1920px', 
                       flexShrink: 0,
                       marginBottom: `${1920 * Math.min(1, (viewportSize.w - 40) / 1080, ((viewportSize.h || 800) - 260) / 1920) - 1920 + 20}px` 
                     }}>
                      <div id="photo-frame-result"
                      className="shadow-[0_40px_100px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-500 rounded-lg hover:-translate-y-2 mx-auto w-full h-full"
                      style={{ backgroundColor: selectedFrame.hex || '#ffffff' }}>
                      
                      <div className="absolute inset-0 z-0 pointer-events-none">
                        {selectedFrame?.image && <img src={selectedFrame.image} className="w-full h-full object-cover opacity-90" />}
                      </div>
                      
                      {selectedPhotosForLayout.map((p, i) => {
                        const slots = [
                          { left: '65px', top: '78px' },
                          { left: '552px', top: '78px' },
                          { left: '65px', top: '789px' },
                          { left: '552px', top: '789px' }
                        ];
                        return (
                          <div key={i} className="absolute overflow-hidden bg-neutral-100 z-10" 
                            style={{ ...slots[i], width: '463px', height: '689px' }}>
                            <img src={p} className="w-full h-full object-cover" style={{ filter: activeFilter.filter }} />
                          </div>
                        );
                      })}
                      
                      <div className="absolute left-0 right-0 z-10 flex justify-center items-center" style={{ top: '1478px', height: '442px' }}>
                        <FrameLabel frame={selectedFrame} size1="80px" size2="46px" gap="20px" />
                      </div>
                    </div>
                </div>
                
                <button onClick={saveImage}
                  className="mb-8 flex-shrink-0 px-12 py-4 bg-neutral-900 text-white rounded-full font-black text-[16px] flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all shadow-xl animate-in fade-in slide-in-from-bottom-4 min-w-[200px] z-20">
                  <Download size={18} /> 이미지 저장
                </button>
              </div>

              {/* ── Controls Panel (Bottom Slider) ── */}
              <div className="w-full max-w-xl bg-white/90 backdrop-blur-3xl rounded-[40px] border border-neutral-100 shadow-2xl p-6 flex flex-col gap-4 mb-4">
                {/* Tabs Header */}
                <div className="flex gap-8 border-b border-neutral-50 px-4 pb-2 mb-2">
                  <button 
                    onClick={() => setResultPhase('frame')}
                    className={`pb-2 text-[14px] font-black transition-all relative ${resultPhase === 'frame' ? 'text-indigo-600' : 'text-neutral-300 hover:text-neutral-500'}`}>
                    프레임 선택
                    {resultPhase === 'frame' && <motion.div layoutId="activeTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setResultPhase('filter')}
                    className={`pb-2 text-[14px] font-black transition-all relative ${resultPhase === 'filter' ? 'text-rose-500' : 'text-neutral-300 hover:text-neutral-500'}`}>
                    필터 선택
                    {resultPhase === 'filter' && <motion.div layoutId="activeTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                  </button>
                  
                  {resultPhase === 'frame' && (
                    <label className="ml-auto text-[11px] font-bold text-neutral-400 cursor-pointer hover:text-indigo-600 flex items-center gap-1 bg-neutral-50 px-3 py-1.5 rounded-full self-center transition-all hover:scale-105 active:scale-95">
                      <Plus size={12} /> 추가
                      <input type="file" className="hidden" onChange={handleFrameUpload} accept="image/png,image/jpeg" />
                    </label>
                  )}
                </div>

                <div className="relative">
                  {resultPhase === 'frame' ? (
                    <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-4 pt-1 scroll-smooth flex-nowrap px-4 -mx-4 group">
                      {INITIAL_FRAMES.map(f => (
                        <button key={f.id} 
                          onClick={() => { setSelectedFrame(f); }}
                          className={`w-16 h-16 flex-shrink-0 rounded-xl border-[3px] transition-all relative overflow-hidden ${selectedFrame.id === f.id ? 'border-indigo-600 scale-105 shadow-lg z-20' : 'border-neutral-50 hover:border-neutral-100'}`}>
                          {f.image ? <img src={f.image} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: f.hex }} />}
                        </button>
                      ))}
                      {customFrames.map(f => (
                        <div key={f.id} className="relative group flex-shrink-0">
                          <button onClick={() => { setSelectedFrame(f); }} 
                            className={`w-16 h-16 rounded-xl border-[3px] transition-all overflow-hidden ${selectedFrame.id === f.id ? 'border-indigo-600 scale-105 shadow-lg z-20' : 'border-neutral-50'}`}>
                            <img src={f.image} className="w-full h-full object-cover" />
                          </button>
                          <button onClick={() => deleteCustomFrame(f.id)} className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full ring-2 ring-white z-30 shadow-lg transition-transform hover:scale-110 active:scale-90">
                            <Trash2 size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-4 pt-1 scroll-smooth flex-nowrap px-4 -mx-4">
                      {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setActiveFilter(f)}
                          className={`w-16 h-16 flex-shrink-0 rounded-xl border-[3px] transition-all overflow-hidden ${activeFilter.id === f.id ? 'border-rose-400 scale-105 shadow-lg z-20' : 'border-neutral-50'}`}>
                          <div className="relative w-full h-full">
                            <img src={capturedPhotos[0]} className="w-full h-full object-cover" style={{ filter: f.filter }} />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[8px] text-white font-black backdrop-blur-[1px]">{f.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-center pt-2 border-t border-neutral-50 px-2 mt-1">
                  <button onClick={resetAll}
                    className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 font-black text-[12px] rounded-2xl transition-all active:scale-[0.98]">
                    처음으로
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(#d1d5db_1.5px,transparent_1.5px)] [background-size:50px_50px] opacity-10" />
    </div>
  );
}

export default App;
