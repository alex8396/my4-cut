import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';
import { Camera, Download, Layout, Columns, Grid, Clock, Zap, Image as ImageIcon, ChevronRight, ChevronLeft, QrCode, Wand2, Plus, Trash2, Home, Save, Star, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = {
  LAYOUT: 0,
  CAMERA: 1,
  SELECT: 2,
  RESULT: 3
};

const SHOT_OPTIONS = [4, 6, 8];

const LAYOUT_TYPES = [
  { 
    id: '1xN', 
    name: '세로형', 
    cols: 1,
    renderIcon: () => (
      <div className="flex flex-col gap-0.5 w-12 h-12 border-2 border-current rounded-lg p-1.5 opacity-60">
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
      </div>
    )
  },
  { 
    id: 'Grid', 
    name: '그리드', 
    cols: 2,
    renderIcon: () => (
      <div className="grid grid-cols-2 gap-0.5 w-12 h-12 border-2 border-current rounded-lg p-1.5 opacity-60">
        <div className="bg-current rounded-sm" />
        <div className="bg-current rounded-sm" />
        <div className="bg-current rounded-sm" />
        <div className="bg-current rounded-sm" />
      </div>
    )
  },
  { 
    id: 'Nx1', 
    name: '가로형', 
    rows: 1,
    renderIcon: () => (
      <div className="flex gap-0.5 w-12 h-12 border-2 border-current rounded-lg p-1.5 opacity-60">
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
        <div className="flex-1 bg-current rounded-sm" />
      </div>
    )
  },
];

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
  { id: 'sea', name: '바다', image: '/src/assets/ocean_frame.png' },
  { id: 'flower', name: '꽃', image: '/src/assets/flower_frame.png' },
  { id: 'aurora', name: '오로라', image: '/src/assets/aurora_frame.png' },
  { id: 'sunset', name: '노을', image: '/src/assets/sunset_frame.png' },
  { id: 'yunseul', name: '윤슬', image: '/src/assets/yunseul.png' },
  { id: 'sunrise', name: '일출', image: '/src/assets/sunrise.png' },
];

const FILTERS = [
  { id: 'none', name: '기본', filter: 'none' },
  { id: 'grayscale', name: '흑백', filter: 'grayscale(100%)' },
  { id: 'sepia', name: '세피아', filter: 'sepia(100%)' },
  { id: 'vivid', name: '선명하게', filter: 'saturate(150%) brightness(110%)' },
  { id: 'warm', name: '따뜻하게', filter: 'sepia(30%) saturate(120%)' },
  { id: 'cool', name: '시원하게', filter: 'hue-rotate(180deg) saturate(110%)' },
];

function App() {
  const [step, setStep] = useState(STEPS.LAYOUT);
  const [subStep, setSubStep] = useState(0); 
  const [selectedShots, setSelectedShots] = useState(SHOT_OPTIONS[0]);
  const [selectedLayoutType, setSelectedLayoutType] = useState(LAYOUT_TYPES[0]);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [selectedFrame, setSelectedFrame] = useState(INITIAL_FRAMES[0]); 
  const [timerSeconds] = useState(4); 
  
  const [customFrames, setCustomFrames] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const webcamRef = useRef(null);
  const isCapturing = useRef(false);

  useEffect(() => {
    const fetchFrames = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/frames`);
        if (res.ok) {
          const data = await res.json();
          setCustomFrames(data);
          return;
        }
      } catch (err) {
        console.error('API fetch failed, falling back to local storage', err);
      }
      const savedFrames = JSON.parse(localStorage.getItem('pickmem-custom-frames') || '[]');
      setCustomFrames(savedFrames);
    };
    fetchFrames();
  }, []);

  const increaseTimer = () => {
    if (countdown !== null) {
      setCountdown(prev => prev + 2);
    } else {
      setCountdown(timerSeconds + 2);
    }
  };

  useEffect(() => {
    let interval;
    if (countdown !== null && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && !isCapturing.current) {
      isCapturing.current = true;
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedPhotos((prev) => [...prev, imageSrc]);
      }
      setCountdown(null);
      isCapturing.current = false;
    }
    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (step === STEPS.CAMERA && capturedPhotos.length < selectedShots) {
      if (countdown === null && !isCapturing.current) {
         const buffer = setTimeout(() => {
           setCountdown(timerSeconds);
         }, 1200); 
         return () => clearTimeout(buffer);
      }
    }
  }, [step, capturedPhotos.length, selectedShots, countdown, timerSeconds]);

  const handleSnap = () => {
    if (capturedPhotos.length >= selectedShots || isCapturing.current) return;
    isCapturing.current = true;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedPhotos((prev) => [...prev, imageSrc]);
    }
    setCountdown(null);
    isCapturing.current = false;
  };

  useEffect(() => {
    if (capturedPhotos.length > 0 && capturedPhotos.length === selectedShots) {
      const timer = setTimeout(() => {
        setStep(STEPS.SELECT);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [capturedPhotos.length, selectedShots]);

  useEffect(() => {
    if (step === STEPS.SELECT) {
      const timer = setTimeout(() => {
        setStep(STEPS.RESULT);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const saveImage = async () => {
    const element = document.getElementById('final-result');
    if (!element) return;
    const canvas = await html2canvas(element, { useCORS: true, scale: 3, backgroundColor: null });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `shillim-4cut-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        const tempId = Date.now().toString();
        const optimisticFrame = { id: tempId, image: base64Image, name: '커스텀' };
        
        setCustomFrames(prev => [optimisticFrame, ...prev]);
        setSelectedFrame(optimisticFrame);

        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/frames`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, name: '커스텀' })
          });
          if (res.ok) {
            const data = await res.json();
            setCustomFrames(prev => prev.map(f => f.id === tempId ? data.frame : f));
            setSelectedFrame(data.frame);
            return;
          }
        } catch (err) {
          console.error('Failed to save to backend', err);
        }
        
        // Fallback
        const savedFrames = JSON.parse(localStorage.getItem('pickmem-custom-frames') || '[]');
        const updatedFrames = [optimisticFrame, ...savedFrames];
        localStorage.setItem('pickmem-custom-frames', JSON.stringify(updatedFrames));
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteCustomFrame = async (id) => {
    setCustomFrames(prev => prev.filter(f => f.id !== id));
    if (selectedFrame?.id === id) setSelectedFrame(INITIAL_FRAMES[0]);
    
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/frames/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete from backend', err);
      const savedFrames = JSON.parse(localStorage.getItem('pickmem-custom-frames') || '[]');
      localStorage.setItem('pickmem-custom-frames', JSON.stringify(savedFrames.filter(f => f.id !== id)));
    }
  };

  const renderWizardSubStep = () => {
    switch (subStep) {
      case 0:
        return (
          <motion.div key="sub0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center flex-1">
             <h3 className="text-3xl font-black mb-10 tracking-tight text-neutral-800 text-center">촬영 장수를 골라주세요</h3>
             <div className="grid grid-cols-3 gap-8 w-full max-w-lg">
                {SHOT_OPTIONS.map((num) => (
                  <button 
                    key={num} onClick={() => { setSelectedShots(num); setSubStep(1); }}
                    className={`aspect-square rounded-[40px] font-black text-5xl transition-all border-4 flex flex-col items-center justify-center gap-2 ${selectedShots === num ? 'border-indigo-600 bg-white text-indigo-600 shadow-2xl scale-110' : 'border-neutral-100 bg-neutral-50 text-neutral-300 hover:bg-white'}`}
                  >
                    <span>{num}</span>
                    <span className="text-sm uppercase tracking-widest opacity-40">CUT</span>
                  </button>
                ))}
             </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div key="sub1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center flex-1">
             <h3 className="text-3xl font-black mb-10 tracking-tight text-neutral-800 text-center">배치를 골라주세요</h3>
             <div className="grid grid-cols-3 gap-8 w-full max-w-lg">
                {LAYOUT_TYPES.map((l) => (
                  <button 
                    key={l.id} onClick={() => { setSelectedLayoutType(l); setStep(STEPS.CAMERA); }}
                    className={`aspect-square rounded-[40px] transition-all border-4 flex flex-col items-center justify-center gap-6 ${selectedLayoutType.id === l.id ? 'border-indigo-600 bg-white shadow-xl scale-110' : 'border-neutral-100 bg-neutral-50 text-neutral-300 hover:bg-white'}`}
                  >
                    <div className={`${selectedLayoutType.id === l.id ? 'text-indigo-600' : 'text-neutral-200'}`}>
                      {l.renderIcon()}
                    </div>
                    <span className="font-black text-lg">{l.name}</span>
                  </button>
                ))}
             </div>
             <button onClick={() => setSubStep(0)} className="mt-16 text-neutral-400 font-bold flex items-center gap-2 hover:text-neutral-800 text-[11px] uppercase tracking-widest"><ChevronLeft size={16} /> 이전으로</button>
          </motion.div>
        );
      default: return null;
    }
  };

  return (
    <div className="h-screen bg-[#fdfcfb] font-sans text-neutral-900 overflow-hidden flex flex-col selection:bg-indigo-100">
      <header className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-neutral-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center shadow-lg"><Star className="text-white w-7 h-7 fill-white" /></div>
          <h1 className="text-2xl font-black italic tracking-tighter">신림 네컷</h1>
        </div>
        <div className="flex flex-col items-end gap-2">{[0, 1, 2, 3].map((s) => (<div key={s} className={`h-2 rounded-full transition-all duration-700 ${step >= s ? 'bg-indigo-600 w-12' : 'bg-neutral-100 w-2.5'}`} />))}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {step === STEPS.LAYOUT && (<motion.div key="layout" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center w-full h-full justify-center">{renderWizardSubStep()}</motion.div>)}

          {step === STEPS.CAMERA && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center h-full w-full justify-center p-2 text-center">
              <div className="relative w-full max-w-2xl bg-neutral-900 rounded-[60px] overflow-hidden shadow-2xl border-[16px] border-white ring-1 ring-neutral-100 aspect-[3/4] flex-shrink">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" mirrored={true} className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none z-10 p-5 flex flex-col justify-end items-end">
                   <div className="absolute inset-0 border-[24px] border-white/10" style={{ borderColor: selectedFrame.hex || 'transparent' }}>
                    {selectedFrame.image && <img src={selectedFrame.image} className="absolute inset-0 w-full h-full object-fill opacity-60 mix-blend-screen" />}
                    {selectedFrame.gradient && <div className={`absolute inset-0 bg-gradient-to-br ${selectedFrame.gradient} opacity-50 mix-blend-hard-light`} />}
                  </div>
                </div>
                {countdown !== null && (<motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/0 z-20"><span className="text-[200px] font-black text-white drop-shadow-2xl italic">{countdown}</span></motion.div>)}
                <div className="absolute top-10 left-10 flex items-center gap-4 z-30"><div className="bg-rose-500 text-white px-6 py-3 rounded-full text-[12px] font-black tracking-widest flex items-center gap-3 animate-pulse shadow-xl"><div className="w-3 h-3 bg-white rounded-full" /> {capturedPhotos.length}/{selectedShots} 완료</div></div>
              </div>
              <div className="mt-12 flex gap-8 w-full max-w-xl items-center px-6">
                  <div className="flex-1 bg-white p-7 rounded-[40px] border-2 border-neutral-50 flex items-center justify-between px-10 shadow-sm">
                    <div className="flex flex-col text-left"><span className="text-[10px] font-black text-neutral-300 mb-1">촬영 간격</span><span className="text-3xl font-black text-indigo-600">{countdown || timerSeconds}초</span></div>
                    <button onClick={increaseTimer} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[12px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">2초 늘리기</button>
                  </div>
                  <button onClick={handleSnap} disabled={capturedPhotos.length >= selectedShots} className="h-full px-12 py-8 bg-amber-400 text-amber-950 rounded-[40px] font-black text-2xl flex items-center gap-5 shadow-xl active:scale-95">바로 촬영</button>
              </div>
              <div className="mt-12 flex gap-4 overflow-x-auto p-2 w-full max-w-2xl justify-center">
                {[...Array(selectedShots)].map((_, i) => (
                  <div key={i} className="w-20 aspect-[3/4] bg-neutral-50 rounded-2xl overflow-hidden border-2 border-white shadow-lg relative flex-shrink-0 ring-1 ring-neutral-100">
                    {capturedPhotos[i] ? (<img src={capturedPhotos[i]} className="w-full h-full object-cover" />) : (<div className="flex h-full items-center justify-center opacity-10"><ImageIcon size={20} /></div>)}
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[8px] font-black text-white">{i+1}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === STEPS.SELECT && (
             <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full">
               <div className="relative w-32 h-32 mb-12"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 border-t-4 border-indigo-600 rounded-full" /><div className="absolute inset-0 flex items-center justify-center text-indigo-100"><ImageIcon size={48} /></div></div>
               <h2 className="text-5xl font-black italic tracking-tighter text-indigo-600 text-center uppercase">완성 중...</h2>
             </motion.div>
          )}

          {step === STEPS.RESULT && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col md:flex-row gap-16 items-center justify-center h-full w-full overflow-hidden p-6 relative">
              <div className="flex-[1.5] flex flex-col items-center overflow-y-auto w-full h-full p-4 relative custom-scrollbar">
                <div id="final-result" className={`p-10 shadow-2xl relative overflow-hidden flex-shrink-0 transition-colors duration-500`} style={{ width: selectedLayoutType.id === 'Nx1' ? 'auto' : '340px', display: 'flex', flexDirection: selectedLayoutType.id === 'Nx1' ? 'row' : 'column', gap: '14px', backgroundColor: selectedFrame.hex || '#ffffff' }}>
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    {selectedFrame?.image && <img src={selectedFrame.image} className="w-full h-full object-cover opacity-90" />}
                    {selectedFrame?.gradient && <div className={`w-full h-full bg-gradient-to-br ${selectedFrame.gradient} opacity-80`} />}
                  </div>
                  <div className="relative z-10 w-full" style={{ display: 'grid', gridTemplateColumns: selectedLayoutType.id === '1xN' ? '1fr' : selectedLayoutType.id === 'Nx1' ? `repeat(${selectedShots}, 1fr)` : `repeat(2, 1fr)`, gap: '14px', width: selectedLayoutType.id === 'Nx1' ? `${selectedShots * 200}px` : '100%' }}>
                    {capturedPhotos.map((p, i) => (<div key={i} className="bg-neutral-200 aspect-[3/4] overflow-hidden rounded-sm relative shadow-sm"><img src={p} className="w-full h-full object-cover" style={{ filter: activeFilter.filter }} /></div>))}
                  </div>
                  <div className={`mt-12 pt-8 border-t ${selectedFrame.id === 'black' ? 'border-white/10' : 'border-black/5'} flex flex-col items-center gap-4 relative z-20 ${selectedLayoutType.id === 'Nx1' ? 'hidden' : 'flex'}`}>
                     <p className={`text-[12px] font-black tracking-widest italic uppercase ${selectedFrame.id === 'black' ? 'text-white/20' : 'text-black/20'}`}>신림 네컷</p>
                     <p className={`text-[14px] font-serif italic ${selectedFrame.id === 'black' ? 'text-white/40' : 'text-black/40'}`}>{new Date().toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-8 w-full max-w-[360px] p-8 bg-white/60 backdrop-blur-2xl rounded-[50px] border border-neutral-100 shadow-2xl overflow-y-auto custom-scrollbar max-h-full">
                  <div className="flex flex-col gap-4">
                     <h4 className="text-[13px] font-black text-indigo-700 italic flex items-center gap-2">프레임 선택</h4>
                     <div className="grid grid-cols-4 gap-3">
                        {INITIAL_FRAMES.map((f)=>(
                          <button key={f.id} onClick={()=>setSelectedFrame(f)} className={`aspect-square rounded-2xl border-2 transition-all relative overflow-hidden flex-shrink-0 ${selectedFrame.id === f.id ? 'border-indigo-600 scale-110 shadow-lg z-10' : 'border-neutral-50 hover:bg-white'}`}>
                            {f.image ? <img src={f.image} className="w-full h-full object-cover" /> : f.gradient ? <div className={`w-full h-full bg-gradient-to-br ${f.gradient}`} /> : <div className="w-full h-full" style={{ backgroundColor: f.hex }} />}
                          </button>
                        ))}
                        {customFrames.map((f)=>(
                          <div key={f.id} className="relative group">
                             <button onClick={()=>setSelectedFrame(f)} className={`aspect-square rounded-2xl border-2 transition-all relative overflow-hidden flex-shrink-0 ${selectedFrame.id === f.id ? 'border-indigo-600 scale-110 shadow-lg z-10' : 'border-neutral-50'}`}>
                                <img src={f.image} className="w-full h-full object-cover" />
                             </button>
                             <button onClick={()=>deleteCustomFrame(f.id)} className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-white z-20">
                                <Trash2 size={10} />
                             </button>
                          </div>
                        ))}
                        <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-white transition-all text-neutral-300">
                           <Plus size={20} />
                           <input type="file" className="hidden" onChange={handleFrameUpload} accept="image/png, image/jpeg" />
                        </label>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     <h4 className="text-[13px] font-black text-rose-500 italic flex items-center gap-2">필터 무드</h4>
                     <div className="grid grid-cols-3 gap-3">
                        {FILTERS.map((f)=>(
                          <button key={f.id} onClick={()=>setActiveFilter(f)} className={`aspect-square rounded-2xl border-2 transition-all overflow-hidden ${activeFilter.id === f.id ? 'border-rose-400 scale-110 shadow-lg z-10' : 'border-neutral-50 hover:bg-white'}`}>
                             <div className="w-full h-full" style={{ filter: f.filter }}><img src={capturedPhotos[0]} className="w-full h-full object-cover" /></div>
                          </button>
                        ))}
                     </div>
                  </div>

                  <button onClick={saveImage} className="w-full py-8 bg-neutral-900 text-white rounded-[40px] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl hover:bg-black active:scale-95 transition-all">저장하기</button>
                  
                  <div className="flex gap-4">
                    <button onClick={() => setShowQR(true)} className={`flex-1 py-5 rounded-[25px] font-black text-sm transition-all border-2 bg-white border-neutral-100 text-neutral-400`}>QR 공유</button>
                    <button onClick={() => { setCapturedPhotos([]); setStep(STEPS.LAYOUT); setSubStep(0); setCountdown(null); }} className="flex-1 py-5 border-2 border-neutral-100 bg-white text-neutral-400 rounded-[25px] font-black text-sm hover:bg-neutral-50 shadow-sm">처음으로</button>
                  </div>
              </div>

              {/* QR Modal Popup */}
              <AnimatePresence>
                {showQR && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowQR(false)}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white p-10 rounded-[60px] shadow-3xl flex flex-col items-center gap-8 text-center relative max-w-sm w-full border border-neutral-50">
                        <button onClick={() => setShowQR(false)} className="absolute top-6 right-6 p-3 rounded-full hover:bg-neutral-50 transition-colors text-neutral-300"><X size={28} /></button>
                        <h4 className="text-xl font-black italic tracking-tighter text-neutral-800">신림 네컷</h4>
                        <div className="p-6 bg-neutral-50 rounded-[40px] shadow-inner ring-1 ring-neutral-100">
                          <QRCodeSVG value={window.location.href} size={220} />
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-lg font-black text-neutral-800">스캔하여 저장하세요</p>
                          <p className="text-sm font-medium text-neutral-400">QR 코드를 스캔하면 기기로 바로 다운로드 됩니다</p>
                        </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(#d1d5db_1.5px,transparent_1.5px)] [background-size:50px_50px] opacity-10" />
    </div>
  );
}

export default App;
