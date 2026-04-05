import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';
import { Camera, Download, Image as ImageIcon, ChevronRight, ChevronLeft, Plus, Trash2, X, Video } from 'lucide-react';
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
  }
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

function App() {
  const [step, setStep] = useState(STEPS.LAYOUT);
  const [subStep, setSubStep] = useState(0); 
  const [selectedShots, setSelectedShots] = useState(SHOT_OPTIONS[0]);
  const [selectedLayoutType] = useState(LAYOUT_TYPES[0]);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [selectedFrame, setSelectedFrame] = useState(INITIAL_FRAMES[0]); 
  const [timerSeconds] = useState(4); 
  
  const [customFrames, setCustomFrames] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [selectedPhotosForLayout, setSelectedPhotosForLayout] = useState([]);
  const [resultPhase, setResultPhase] = useState('frame');

  // Video recording state
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const webcamRef = useRef(null);
  const isCapturing = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Download page handling (kept for backward compat)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dlId = params.get('download');
    if (dlId) {
      fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/shared/${dlId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const a = document.createElement('a');
            a.href = data.image;
            a.download = `shillim-4cut-${Date.now()}.png`;
            a.click();
          }
        })
        .catch(err => console.error('Failed to load shared photo', err));
    }
  }, []);

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

  // Start MediaRecorder when CAMERA step begins
  useEffect(() => {
    if (step === STEPS.CAMERA) {
      recordedChunksRef.current = [];
      setRecordedVideoUrl(null);

      // Wait for webcam stream to be ready
      const tryRecord = () => {
        const stream = webcamRef.current?.video?.srcObject;
        if (stream) {
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';
          const recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            setRecordedVideoUrl(URL.createObjectURL(blob));
          };
          recorder.start(100);
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
        } else {
          // Retry after webcam loads
          setTimeout(tryRecord, 500);
        }
      };
      setTimeout(tryRecord, 1000);
    } else {
      // Stop recording when leaving camera step
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [step]);

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
      handleSnap();
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

  const togglePhotoSelection = (photo) => {
    setSelectedPhotosForLayout(prev => {
      if (prev.includes(photo)) return prev.filter(p => p !== photo);
      if (prev.length < 4) return [...prev, photo];
      return prev;
    });
  };

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

  const saveVideo = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `shillim-4cut-video-${Date.now()}.webm`;
    a.click();
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
          }
        } catch (err) {
          console.error('Failed to save to backend', err);
          const savedFrames = JSON.parse(localStorage.getItem('pickmem-custom-frames') || '[]');
          savedFrames.unshift(optimisticFrame);
          localStorage.setItem('pickmem-custom-frames', JSON.stringify(savedFrames));
        }
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
                    key={num} onClick={() => { setSelectedShots(num); setStep(STEPS.CAMERA); }}
                    className={`aspect-square rounded-[40px] font-black text-5xl transition-all border-4 flex flex-col items-center justify-center gap-2 ${selectedShots === num ? 'border-indigo-600 bg-white text-indigo-600 shadow-2xl scale-110' : 'border-neutral-100 bg-neutral-50 text-neutral-300 hover:bg-white'}`}
                  >
                    <span>{num}</span>
                    <span className="text-sm uppercase tracking-widest opacity-40">CUT</span>
                  </button>
                ))}
             </div>
          </motion.div>
        );
      default: return null;
    }
  };

  return (
    <div className="h-screen bg-[#fdfcfb] font-sans text-neutral-900 overflow-hidden flex flex-col selection:bg-indigo-100">
      <header className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-neutral-50 flex-shrink-0">
        <button onClick={() => { setCapturedPhotos([]); setSelectedPhotosForLayout([]); setStep(STEPS.LAYOUT); setSubStep(0); setCountdown(null); setResultPhase('frame'); setRecordedVideoUrl(null); }} className="flex items-center gap-3 group">
          <span className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">신림 네컷</span>
        </button>
        <div className="flex items-center gap-3">
          {step === STEPS.RESULT && recordedVideoUrl && (
            <button onClick={() => setShowVideo(v => !v)} className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-100 bg-white text-indigo-600 font-black text-sm hover:bg-indigo-50 transition-all shadow-sm">
              <Video size={16} /> {showVideo ? '사진 보기' : '동영상 보기'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {step === STEPS.LAYOUT && (
            <motion.div key="layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full p-8 gap-12">
              <AnimatePresence mode="wait">
                {renderWizardSubStep()}
              </AnimatePresence>
            </motion.div>
          )}

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
                <div className="absolute top-10 left-10 flex items-center gap-4 z-30">
                  <div className="bg-rose-500 text-white px-6 py-3 rounded-full text-[12px] font-black tracking-widest flex items-center gap-3 animate-pulse shadow-xl">
                    <div className="w-3 h-3 bg-white rounded-full" /> {capturedPhotos.length}/{selectedShots} 완료
                  </div>
                  {isRecording && (
                    <div className="bg-red-600 text-white px-4 py-3 rounded-full text-[11px] font-black tracking-widest flex items-center gap-2 shadow-xl">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" /> REC
                    </div>
                  )}
                </div>
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
             <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center p-6 h-full w-full">
               <h2 className="text-3xl font-black italic tracking-tighter text-indigo-900 mb-2">프레임에 담을 4장을 순서대로 선택해주세요</h2>
               <p className="text-neutral-500 mb-8 font-bold">{selectedPhotosForLayout.length} / 4 선택됨</p>
               
               <div className="grid grid-cols-4 gap-4 w-full max-w-4xl mb-10 overflow-y-auto max-h-[60vh] p-4">
                 {capturedPhotos.map((photo, i) => {
                   const selectedIndex = selectedPhotosForLayout.indexOf(photo);
                   const isSelected = selectedIndex !== -1;
                   return (
                     <button 
                       key={i} 
                       onClick={() => togglePhotoSelection(photo)}
                       className={`relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-4 transition-all ${isSelected ? 'border-indigo-600 scale-105' : 'border-white opacity-80 hover:opacity-100'}`}
                     >
                        <img src={photo} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl ring-4 ring-white">
                              {selectedIndex + 1}
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
                 className={`px-12 py-5 rounded-[40px] font-black text-xl flex items-center gap-4 transition-all shadow-xl ${selectedPhotosForLayout.length === 4 ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-neutral-200 text-neutral-400 opacity-50 cursor-not-allowed'}`}
               >
                 선택 완료 및 꾸미기 <ChevronRight />
               </button>
             </motion.div>
          )}

          {step === STEPS.RESULT && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col md:flex-row gap-16 items-center justify-center h-full w-full overflow-hidden p-6 relative">
              <div className="flex-[1.5] flex flex-col items-center overflow-y-auto w-full h-full p-4 relative custom-scrollbar">
                {showVideo && recordedVideoUrl ? (
                  /* ─── 동영상 뷰 ─── */
                  <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                    <div className="relative rounded-[30px] overflow-hidden shadow-2xl border-8 border-white ring-1 ring-neutral-100 w-full" style={{ backgroundColor: selectedFrame.hex || '#ffffff' }}>
                      {selectedFrame.image && (
                        <img src={selectedFrame.image} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply pointer-events-none z-10" />
                      )}
                      <video
                        src={recordedVideoUrl}
                        className="w-full relative z-0"
                        controls
                        autoPlay
                        loop
                        playsInline
                        style={{ filter: activeFilter.filter }}
                      />
                      <div className="relative z-20 py-4 flex flex-col items-center gap-1" style={{ backgroundColor: selectedFrame.hex || '#ffffff' }}>
                        <p className={`text-[20px] font-black tracking-widest italic uppercase ${selectedFrame.id === 'black' ? 'text-white/40' : 'text-black/40'}`}>신림 네컷</p>
                        <p className={`text-[13px] font-serif italic ${selectedFrame.id === 'black' ? 'text-white/30' : 'text-black/30'}`}>{new Date().toLocaleDateString('ko-KR')}</p>
                      </div>
                    </div>
                    <button onClick={saveVideo} className="w-full py-5 bg-violet-600 text-white rounded-[40px] font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-violet-700 active:scale-95 transition-all">
                      <Download size={22} /> 동영상 저장
                    </button>
                  </div>
                ) : (
                  /* ─── 사진 프레임 뷰 ─── */
                  <div id="final-result" className={`p-10 shadow-2xl relative overflow-hidden flex-shrink-0 transition-colors duration-500`} style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: selectedFrame.hex || '#ffffff' }}>
                    <div className="absolute inset-0 z-0 pointer-events-none">
                      {selectedFrame?.image && <img src={selectedFrame.image} className="w-full h-full object-cover opacity-90" />}
                      {selectedFrame?.gradient && <div className={`w-full h-full bg-gradient-to-br ${selectedFrame.gradient} opacity-80`} />}
                    </div>
                    <div className="relative z-10 w-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                      {selectedPhotosForLayout.map((p, i) => (<div key={i} className="bg-neutral-200 aspect-[3/4] overflow-hidden rounded-sm relative shadow-sm"><img src={p} className="w-full h-full object-cover" style={{ filter: activeFilter.filter }} /></div>))}
                    </div>
                    <div className={`mt-12 pt-8 border-t ${selectedFrame.id === 'black' ? 'border-white/10' : 'border-black/5'} flex flex-col items-center gap-2 relative z-20`}>
                       <p className={`text-[20px] font-black tracking-widest italic uppercase ${selectedFrame.id === 'black' ? 'text-white/40' : 'text-black/40'}`}>신림 네컷</p>
                       <p className={`text-[14px] font-serif italic ${selectedFrame.id === 'black' ? 'text-white/40' : 'text-black/40'}`}>{new Date().toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-6 w-full max-w-[360px] p-8 bg-white/60 backdrop-blur-2xl rounded-[50px] border border-neutral-100 shadow-2xl overflow-y-auto custom-scrollbar max-h-full">
                  {resultPhase === 'frame' ? (
                    <>
                      <div className="flex flex-col gap-4">
                         <h4 className="text-[13px] font-black text-indigo-700 italic flex items-center gap-2"><span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span> 프레임 선택</h4>
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
                      <button onClick={() => setResultPhase('filter')} className="w-full py-6 mt-2 bg-indigo-600 text-white rounded-[40px] font-black text-xl flex items-center justify-center gap-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">다음: 필터 고르기 <ChevronRight size={24} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setResultPhase('frame')} className="text-sm text-neutral-400 font-bold flex items-center gap-1 hover:text-neutral-800 transition-colors"><ChevronLeft size={16}/> 프레임 다시 고르기</button>
                      <div className="flex flex-col gap-4">
                         <h4 className="text-[13px] font-black text-rose-500 italic flex items-center gap-2"><span className="bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span> 필터 무드</h4>
                         <div className="grid grid-cols-3 gap-3">
                            {FILTERS.map((f)=>(
                              <button key={f.id} onClick={()=>setActiveFilter(f)} className={`aspect-square rounded-2xl border-2 transition-all overflow-hidden ${activeFilter.id === f.id ? 'border-rose-400 scale-110 shadow-lg z-10' : 'border-neutral-50 hover:bg-white'}`}>
                                 <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1" style={{ filter: f.filter }}><img src={capturedPhotos[0]} className="w-full rounded-lg" /></div>
                              </button>
                            ))}
                         </div>
                      </div>
                      <button onClick={saveImage} className="w-full py-6 mt-2 bg-neutral-900 text-white rounded-[40px] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl hover:bg-black active:scale-95 transition-all">저장하기</button>
                    </>
                  )}
                   
                  <button onClick={() => { setCapturedPhotos([]); setSelectedPhotosForLayout([]); setStep(STEPS.LAYOUT); setSubStep(0); setCountdown(null); setResultPhase('frame'); setRecordedVideoUrl(null); }} className="w-full py-4 border-2 border-neutral-100 bg-white text-neutral-400 rounded-[30px] font-black text-sm hover:bg-neutral-50 shadow-sm active:scale-95">처음으로</button>
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
