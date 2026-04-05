import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';
import { Download, Image as ImageIcon, ChevronRight, ChevronLeft, Plus, Trash2, Video } from 'lucide-react';
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

// 네컷 frame label
function FrameLabel({ frame }) {
  const dark = frame?.id === 'black';
  return (
    <div className={`pt-6 pb-4 border-t ${dark ? 'border-white/10' : 'border-black/5'} flex flex-col items-center gap-1`}>
      <p className={`text-[18px] font-black tracking-widest italic uppercase ${dark ? 'text-white/40' : 'text-black/40'}`}>신림 네컷</p>
      <p className={`text-[12px] font-serif italic ${dark ? 'text-white/30' : 'text-black/30'}`}>{new Date().toLocaleDateString('ko-KR')}</p>
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
  const [capturedClips, setCapturedClips] = useState([]); // per-shot clips
  const [countdown, setCountdown] = useState(null);
  const [selectedPhotosForLayout, setSelectedPhotosForLayout] = useState([]);
  const [selectedClipsForLayout, setSelectedClipsForLayout] = useState([]);
  const [resultPhase, setResultPhase] = useState('frame');
  const [isRecording, setIsRecording] = useState(false);

  const webcamRef = useRef(null);
  const isCapturing = useRef(false);
  const clipRecorderRef = useRef(null);
  const clipChunksRef = useRef([]);
  const videoMime = useRef(getVideoMime());

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

  // ── Per-shot clip recording ──
  const startClipRecording = () => {
    const stream = webcamRef.current?.video?.srcObject;
    if (!stream) return;
    clipChunksRef.current = [];
    const mime = videoMime.current;
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => { if (e.data.size > 0) clipChunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(clipChunksRef.current, { type: mime });
      setCapturedClips(prev => [...prev, URL.createObjectURL(blob)]);
    };
    rec.start(100);
    clipRecorderRef.current = rec;
    setIsRecording(true);
  };

  const stopClipRecording = () => {
    setTimeout(() => {
      if (clipRecorderRef.current?.state !== 'inactive') {
        clipRecorderRef.current.stop();
        setIsRecording(false);
      }
    }, 600);
  };

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

  // Auto-start countdown when ready for next shot
  useEffect(() => {
    if (step === STEPS.CAMERA && capturedPhotos.length < selectedShots && countdown === null && !isCapturing.current) {
      const t = setTimeout(() => setCountdown(timerSeconds), 1200);
      return () => clearTimeout(t);
    }
  }, [step, capturedPhotos.length, selectedShots, countdown, timerSeconds]);

  // Start recording when countdown begins
  useEffect(() => {
    if (countdown === timerSeconds && countdown !== null) {
      startClipRecording();
    }
  }, [countdown]);

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
    stopClipRecording();
    setCountdown(null);
    isCapturing.current = false;
  };

  // Photo + clip selection (linked by index)
  const togglePhotoSelection = (photo, i) => {
    setSelectedPhotosForLayout(prev => {
      if (prev.includes(photo)) {
        const idx = prev.indexOf(photo);
        setSelectedClipsForLayout(c => c.filter((_, ci) => ci !== idx));
        return prev.filter(p => p !== photo);
      }
      if (prev.length < 4) {
        setSelectedClipsForLayout(c => [...c, capturedClips[i]]);
        return [...prev, photo];
      }
      return prev;
    });
  };

  const saveImage = async () => {
    const el = document.getElementById('photo-frame-result');
    if (!el) return;
    const canvas = await html2canvas(el, { useCORS: true, scale: 3, backgroundColor: null });
    const a = document.createElement('a');
    a.download = `shillim-4cut-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const saveVideos = () => {
    const ext = getVideoExt(videoMime.current);
    selectedClipsForLayout.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `shillim-4cut-video-${i + 1}-${Date.now()}.${ext}`;
      a.click();
    });
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
    setCapturedPhotos([]); setCapturedClips([]);
    setSelectedPhotosForLayout([]); setSelectedClipsForLayout([]);
    setStep(STEPS.LAYOUT); setCountdown(null); setResultPhase('frame');
  };

  return (
    <div className="h-screen bg-[#fdfcfb] font-sans text-neutral-900 overflow-hidden flex flex-col selection:bg-indigo-100">
      {/* ── Header ── */}
      <header className="p-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-neutral-100 flex-shrink-0">
        <button onClick={resetAll}>
          <span className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            신림 네컷
          </span>
        </button>
        {step === STEPS.RESULT && (
          <div className="flex gap-3">
            <button onClick={saveImage}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full font-black text-sm hover:bg-black active:scale-95 transition-all shadow-lg">
              <Download size={15} /> 사진 저장
            </button>
            {selectedClipsForLayout.length > 0 && (
              <button onClick={saveVideos}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-full font-black text-sm hover:bg-violet-700 active:scale-95 transition-all shadow-lg">
                <Video size={15} /> 동영상 저장 ({getVideoExt(videoMime.current).toUpperCase()})
              </button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden relative">
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
              <div className="relative w-full max-w-2xl bg-neutral-900 rounded-[60px] overflow-hidden shadow-2xl border-[16px] border-white ring-1 ring-neutral-100 aspect-[3/4] flex-shrink">
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
                  {isRecording && (
                    <div className="bg-red-600 text-white px-4 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 shadow-xl">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" /> REC
                    </div>
                  )}
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
              <p className="text-neutral-400 mb-8 font-bold text-sm">{selectedPhotosForLayout.length} / 4 선택됨 · 선택한 순서대로 동영상도 연결됩니다</p>

              <div className="grid grid-cols-4 gap-4 w-full max-w-4xl mb-8 overflow-y-auto max-h-[58vh] p-2">
                {capturedPhotos.map((photo, i) => {
                  const selIdx = selectedPhotosForLayout.indexOf(photo);
                  const isSel = selIdx !== -1;
                  return (
                    <button key={i} onClick={() => togglePhotoSelection(photo, i)}
                      className={`relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-4 transition-all ${isSel ? 'border-indigo-600 scale-105' : 'border-white opacity-75 hover:opacity-100'}`}>
                      <img src={photo} className="w-full h-full object-cover" />
                      {/* Video clip indicator */}
                      {capturedClips[i] && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5 text-[9px] font-black flex items-center gap-1">
                          <Video size={8} /> 클립
                        </div>
                      )}
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

          {/* ── RESULT ── */}
          {step === STEPS.RESULT && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-row gap-8 items-start justify-center h-full w-full overflow-y-auto p-6">

              {/* ── Photo Frame ── */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">사진 프레임</p>
                <div id="photo-frame-result"
                  className="shadow-2xl relative overflow-hidden flex-shrink-0 transition-colors duration-500"
                  style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', backgroundColor: selectedFrame.hex || '#ffffff' }}>
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    {selectedFrame?.image && <img src={selectedFrame.image} className="w-full h-full object-cover opacity-90" />}
                  </div>
                  <div className="relative z-10 grid grid-cols-2 gap-2.5">
                    {selectedPhotosForLayout.map((p, i) => (
                      <div key={i} className="aspect-[3/4] overflow-hidden rounded-sm shadow-sm">
                        <img src={p} className="w-full h-full object-cover" style={{ filter: activeFilter.filter }} />
                      </div>
                    ))}
                  </div>
                  <div className="relative z-10">
                    <FrameLabel frame={selectedFrame} />
                  </div>
                </div>
              </div>

              {/* ── Video Frame ── */}
              {selectedClipsForLayout.length === 4 && (
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">동영상 프레임</p>
                  <div className="shadow-2xl relative overflow-hidden flex-shrink-0"
                    style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', backgroundColor: selectedFrame.hex || '#ffffff' }}>
                    <div className="absolute inset-0 z-0 pointer-events-none">
                      {selectedFrame?.image && <img src={selectedFrame.image} className="w-full h-full object-cover opacity-80" />}
                    </div>
                    <div className="relative z-10 grid grid-cols-2 gap-2.5">
                      {selectedClipsForLayout.map((clip, i) => (
                        <div key={i} className="aspect-[3/4] overflow-hidden rounded-sm shadow-sm bg-black">
                          <video src={clip} className="w-full h-full object-cover" style={{ filter: activeFilter.filter }}
                            autoPlay loop muted playsInline />
                        </div>
                      ))}
                    </div>
                    <div className="relative z-10">
                      <FrameLabel frame={selectedFrame} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Controls Panel ── */}
              <div className="flex flex-col gap-5 w-full max-w-[300px] p-6 bg-white/60 backdrop-blur-2xl rounded-[40px] border border-neutral-100 shadow-2xl overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                {resultPhase === 'frame' ? (
                  <>
                    <h4 className="text-[13px] font-black text-indigo-700 flex items-center gap-2">
                      <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span> 프레임
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {INITIAL_FRAMES.map(f => (
                        <button key={f.id} onClick={() => setSelectedFrame(f)}
                          className={`aspect-square rounded-xl border-2 transition-all relative overflow-hidden ${selectedFrame.id === f.id ? 'border-indigo-600 scale-110 shadow-md z-10' : 'border-neutral-100 hover:bg-white'}`}>
                          {f.image ? <img src={f.image} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: f.hex }} />}
                        </button>
                      ))}
                      {customFrames.map(f => (
                        <div key={f.id} className="relative group">
                          <button onClick={() => setSelectedFrame(f)} className={`aspect-square rounded-xl border-2 transition-all overflow-hidden w-full ${selectedFrame.id === f.id ? 'border-indigo-600 scale-110 shadow-md z-10' : 'border-neutral-100'}`}>
                            <img src={f.image} className="w-full h-full object-cover" />
                          </button>
                          <button onClick={() => deleteCustomFrame(f.id)} className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-white z-20">
                            <Trash2 size={8} />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 text-neutral-300">
                        <Plus size={18} />
                        <input type="file" className="hidden" onChange={handleFrameUpload} accept="image/png,image/jpeg" />
                      </label>
                    </div>
                    <button onClick={() => setResultPhase('filter')}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[30px] font-black text-base flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
                      다음: 필터 <ChevronRight size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setResultPhase('frame')} className="text-xs text-neutral-400 font-bold flex items-center gap-1 hover:text-neutral-700 transition-colors">
                      <ChevronLeft size={14} /> 프레임 다시 고르기
                    </button>
                    <h4 className="text-[13px] font-black text-rose-500 flex items-center gap-2">
                      <span className="bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span> 필터
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setActiveFilter(f)}
                          className={`aspect-square rounded-xl border-2 transition-all overflow-hidden ${activeFilter.id === f.id ? 'border-rose-400 scale-110 shadow-md z-10' : 'border-neutral-100'}`}>
                          <img src={capturedPhotos[0]} className="w-full h-full object-cover" style={{ filter: f.filter }} />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                  <button onClick={saveImage}
                    className="w-full py-4 bg-neutral-900 text-white rounded-[25px] font-black text-sm flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all shadow-md">
                    <Download size={16} /> 사진 저장
                  </button>
                  {selectedClipsForLayout.length > 0 && (
                    <button onClick={saveVideos}
                      className="w-full py-4 bg-violet-600 text-white rounded-[25px] font-black text-sm flex items-center justify-center gap-2 hover:bg-violet-700 active:scale-95 transition-all shadow-md">
                      <Video size={16} /> 동영상 저장 ({getVideoExt(videoMime.current).toUpperCase()})
                    </button>
                  )}
                  <button onClick={resetAll}
                    className="w-full py-3 border-2 border-neutral-100 bg-white text-neutral-400 rounded-[25px] font-black text-xs hover:bg-neutral-50 active:scale-95 transition-all">
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
