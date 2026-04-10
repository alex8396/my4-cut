import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Download, Image as ImageIcon, ChevronRight, ChevronLeft, Plus, Trash2, Home, Printer, RefreshCcw, Check, Share2, Clock } from 'lucide-react';
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
  const showLabel = !frame?.id?.includes('new');
  const isInitial = showLabel; // new 없는 모든 프레임에 레이블 표시
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
      const height = totalH; // 여백 제거
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx.scale(dpr, dpr);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const color1 = dark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
      const color2 = dark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
      
      const startY = h1 / 2;
      const secondY = h1 + gapPx + h2 / 2;

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
    <div className={`w-full flex flex-col items-center justify-center ${isInitial && !isCapture ? 'border-t-2' : ''}`}
         style={{ 
           height: isCapture ? '100%' : 'auto', 
           paddingTop: isCapture ? '0' : '32px', 
           paddingBottom: isCapture ? '0' : '40px',
           backgroundColor: 'transparent',
           borderColor: frame?.hex || 'transparent'
         }}>
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

function FramePreview({ frame, photos, scale = 0.25 }) {
  const slots = [
    { left: '60px', top: '72px' },
    { left: '516px', top: '72px' },
    { left: '60px', top: '735px' },
    { left: '516px', top: '735px' }
  ];
  const SW = 432, SH = 642;
  
  return (
    <div className="relative overflow-hidden rounded-xl shadow-2xl mx-auto flex-shrink-0 border-4 border-white/50"
         style={{ 
           width: '1008px', height: '1792px',
           backgroundColor: frame.hex || '#ffffff',
           transform: `scale(${scale})`,
           transformOrigin: 'top center'
         }}>
      {/* 배경 프레임 (new 없는 경우) */}
      {frame?.image && !frame.id?.includes('new') && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={frame.image} className="w-full h-full object-cover opacity-90" />
        </div>
      )}
      {slots.map((slot, i) => (
        <div key={i} className="absolute overflow-hidden z-10 border border-neutral-100/50" 
          style={{ ...slot, width: `${SW}px`, height: `${SH}px`, backgroundColor: frame.hex || '#f8f8f8' }}>
          {photos[i] ? (
            <img src={photos[i]} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300 font-black text-6xl">
              {i + 1}
            </div>
          )}
        </div>
      ))}
      {/* 전면 프레임 (new 포함된 경우, 사진 위에) */}
      {frame?.image && frame.id?.includes('new') && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <img src={frame.image} className="w-full h-full object-cover opacity-90" />
        </div>
      )}
      <div className="absolute left-0 right-0 z-10 flex justify-center items-center" style={{ top: '1380px', height: '412px' }}>
        <FrameLabel frame={frame} size1="80px" size2="46px" gap="20px" isCapture={true} />
      </div>
    </div>
  );
}

function App() {
  const [step, setStep] = useState(STEPS.LAYOUT);
  const [selectedShots, setSelectedShots] = useState(SHOT_OPTIONS[0]);
  const [selectedFrame, setSelectedFrame] = useState(INITIAL_FRAMES[0]);
  const [timerSeconds] = useState(4);
  const [customFrames, setCustomFrames] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [selectedPhotosForLayout, setSelectedPhotosForLayout] = useState([]);
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [facingMode, setFacingMode] = useState('user');
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize(prev => {
        const currW = window.innerWidth;
        const currH = window.innerHeight;
        // 주소창이 사라지거나 나타나는 정도의 작은 높이 변화(약 60px 이하)는 무시하여 사진 크기 변동 방지
        const isHeightStable = Math.abs(currH - prev.h) < 60;
        const isWidthStable = Math.abs(currW - prev.w) < 5;
        
        if (isWidthStable && isHeightStable) return prev;
        return { w: currW, h: currH };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const webcamRef = useRef(null);
  const isCapturing = useRef(false);

  // Fetch custom frames from public folder directly (Frontend-only, no backend needed!)
  useEffect(() => {
    try {
      // Vite's import.meta.glob to read files from public/frames directory
      const modules = import.meta.glob('/public/frames/*.{png,jpg,jpeg,gif}');
      
      const allDiskFrames = Object.keys(modules).map(path => {
        const filename = path.split('/').pop();
        return {
          id: filename,
          name: filename, // or remove extension: filename.replace(/\.[^/.]+$/, "")
          image: `/frames/${filename}`
        };
      });

      const initialImagePaths = INITIAL_FRAMES.map(f => f.image).filter(Boolean);
      const newCustomFrames = allDiskFrames.filter(f => !initialImagePaths.includes(f.image));
      
      setCustomFrames(newCustomFrames);
    } catch (e) {
      console.error("Error reading frontend frames", e);
      setCustomFrames([]);
    }
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
    if (imageSrc) {
      setCapturedPhotos(prev => {
        if (prev.length >= selectedShots) return prev;
        return [...prev, imageSrc];
      });
      setCountdown(null);
    }
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

  const generateFinalImage = async () => {
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bgColor = selectedFrame.hex || '#ffffff';

    // 1. 배경색 채우기
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    const isNewFrame = selectedFrame.image && selectedFrame.id?.includes('new');

    // 2. 이미지 프레임이면 배경으로 그리기 (new 아닌 경우만 사진보다 먼저)
    if (selectedFrame.image && !isNewFrame) {
      await new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { ctx.drawImage(img, 0, 0, W, H); resolve(); };
        img.onerror = resolve;
        img.src = selectedFrame.image;
      });
    }

    // 3. 사진 4장 그리기 (프레임 위에 배치)
    const slots = [
      { x: 65, y: 78 },  { x: 552, y: 78 },
      { x: 65, y: 789 }, { x: 552, y: 789 }
    ];
    const SW = 463, SH = 689;

    for (let i = 0; i < selectedPhotosForLayout.length; i++) {
      const slot = slots[i];
      await new Promise(resolve => {
        const img = new Image();
        img.onload = async () => {
          try {
            if (img.decode) await img.decode();
          } catch (e) {}

          // object-cover 비율 계산
          const scale = Math.max(SW / img.width, SH / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          // 임시 캔버스 내에서의 중앙 정렬 위치
          const dx = (SW - dw) / 2;
          const dy = (SH - dh) / 2;

          // 1. 해당 슬롯 크기의 임시 캔버스 생성
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = SW;
          tempCanvas.height = SH;
          const tctx = tempCanvas.getContext('2d');

          // 2. 사진 그리기 (원본)
          tctx.drawImage(img, dx, dy, dw, dh);

          // 3. 필터링된 임시 캔버스를 메인 캔버스 슬롯 위치에 합성
          ctx.drawImage(tempCanvas, slot.x, slot.y);
          
          resolve();
        };
        img.onerror = resolve;
        img.src = selectedPhotosForLayout[i];
      });
    }

    // 3-1. new 프레임이면 사진 위에 프레임 그리기
    if (isNewFrame) {
      await new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { ctx.drawImage(img, 0, 0, W, H); resolve(); };
        img.onerror = resolve;
        img.src = selectedFrame.image;
      });
    }

    // 4. 브랜드/날짜 레이블 (new 없는 모든 프레임에 표시)
    const isInitial = !selectedFrame?.id?.includes('new');
    if (isInitial) {
      const dark = selectedFrame?.id === 'black';
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;

      const lc = document.createElement('canvas');
      const dpr = 3;
      const pxSize1 = 80, pxSize2 = 46, gapPx = 20;
      const h1 = pxSize1 * 1.2, h2 = pxSize2 * 1.2;
      const lh = h1 + gapPx + h2;
      lc.width = W * dpr;
      lc.height = lh * dpr;
      const lctx = lc.getContext('2d');
      lctx.scale(dpr, dpr);
      lctx.textAlign = 'center';
      lctx.textBaseline = 'middle';
      if ('letterSpacing' in lctx) lctx.letterSpacing = '0.1em';
      lctx.font = `${pxSize1}px GeekbleMalang2`;
      lctx.fillStyle = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
      lctx.fillText('신림 네컷', W / 2, h1 / 2);
      if ('letterSpacing' in lctx) lctx.letterSpacing = '0.2em';
      lctx.font = `500 ${pxSize2}px OG_Renaissance_Secret`;
      lctx.fillStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
      lctx.fillText(dateStr, W / 2, h1 + gapPx + h2 / 2 - 4);

      const labelAreaTop = 1478;
      const labelAreaH = 442;
      const labelY = labelAreaTop + (labelAreaH - lh) / 2;
      ctx.drawImage(lc, 0, 0, lc.width, lc.height, 0, labelY, W, lh);
    }
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const saveImage = async () => {
    const dataUrl = await generateFinalImage('image/png');
    
    // Local Download only
    const a = document.createElement('a');
    a.download = `shillim-4cut-${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
    
    setShowSaveModal(true);
  };

  const handleShareImage = async () => {
    const dataUrl = await generateFinalImage('image/jpeg', 0.8);
    
    if (navigator.share) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `shillim-4cut-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file]
          });
        } else {
          alert('이 브라우저에서는 이미지 파일 직접 공유를 지원하지 않습니다. 저장하기 버튼을 이용해주세요.');
        }
      } catch (error) {
        if (error.name !== 'AbortError') console.error('Error sharing photo:', error);
      }
    } else {
      alert('이 기기 및 브라우저에서는 공유하기 기능을 지원하지 않습니다.');
    }
  };

  const printImage = async () => {
    const dataUrl = await generateFinalImage();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Shillim 4-Cut Print</title>
          <style>
            @page { size: auto; margin: 0; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; background: white; }
            img { max-width: 100vw; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
          <img src="${dataUrl}" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };




  const resetAll = () => {
    setCapturedPhotos([]);
    setSelectedPhotosForLayout([]);
    setSelectedFrame(INITIAL_FRAMES[0]);
    setStep(STEPS.LAYOUT); setCountdown(null);
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
    <div className="h-[100dvh] bg-[#fdfcfb] font-sans text-neutral-900 overflow-hidden flex flex-col selection:bg-indigo-100">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ccc; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <main className="flex-1 overflow-hidden relative">
          {step > STEPS.LAYOUT && step !== STEPS.CAMERA && (
            <button 
              onClick={goBack}
              className="absolute top-6 left-6 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg text-neutral-600 hover:text-indigo-600 hover:scale-110 active:scale-90 transition-all border border-neutral-100"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <AnimatePresence mode="wait">
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

            {step === STEPS.CAMERA && (
              <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="fixed inset-0 bg-[#0a0a0a] z-40 flex flex-col items-center justify-center overflow-hidden">
                
                {/* Camera Container with Fixed Ratio (Only showing capture area) */}
                <div className="relative h-[88dvh] w-auto max-w-full bg-neutral-900 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-2 border-white/10 flex-shrink"
                     style={{ aspectRatio: '463 / 689' }}>
                  <Webcam 
                    audio={false} 
                    ref={webcamRef} 
                    screenshotFormat="image/jpeg" 
                    mirrored={facingMode === 'user'} 
                    videoConstraints={{ 
                      facingMode,
                      aspectRatio: 463 / 689,
                      width: { ideal: 1080 },
                      height: { ideal: 1920 }
                    }}
                    className="w-full h-full object-cover" 
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                  />
                  <FrameOverlay frame={selectedFrame} />
                  
                  {/* Countdown Overlay */}
                  <AnimatePresence>
                    {countdown !== null && (
                      <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <span className="text-[180px] font-black text-white drop-shadow-[0_10px_50px_rgba(0,0,0,0.5)] italic">{countdown}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Status Badge (Top Overlay) */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
                    <div className="bg-black/30 backdrop-blur-xl text-white px-6 py-2.5 rounded-full text-sm font-black tracking-[0.2em] flex items-center gap-3 border border-white/10 shadow-2xl">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      {Math.min(capturedPhotos.length + 1, selectedShots)} / {selectedShots} SHOT
                    </div>
                  </div>
                  
                  {/* Controls (Bottom Overlay) */}
                  <div className="absolute bottom-8 left-0 right-0 px-6 z-30 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-5 w-full max-w-xs justify-center">
                      <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
                              className="p-5 bg-white/10 backdrop-blur-2xl text-white rounded-full border border-white/20 hover:bg-white/20 active:scale-90 transition-all shadow-2xl">
                        <RefreshCcw size={24} />
                      </button>
                      
                      <button onClick={handleSnap} disabled={capturedPhotos.length >= selectedShots}
                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-90 disabled:opacity-50 transition-all group overflow-hidden">
                        <div className="w-16 h-16 rounded-full border-4 border-neutral-900 flex items-center justify-center">
                          <div className="w-12 h-12 bg-neutral-900 rounded-full group-hover:scale-90 transition-transform" />
                        </div>
                      </button>

                      <button onClick={increaseTimer} 
                              className="px-6 py-4 bg-white/10 backdrop-blur-2xl text-white rounded-full border border-white/20 hover:bg-white/20 active:scale-90 transition-all shadow-2xl flex items-center justify-center gap-1.5">
                        <Plus size={16} strokeWidth={3} />
                        <Clock size={24} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back Button (Outside main container for safety, but looks inside) */}
                <button 
                  onClick={goBack}
                  className="absolute top-8 left-8 z-[100] p-4 bg-white/10 backdrop-blur-2xl rounded-full text-white hover:bg-white/20 active:scale-90 transition-all border border-white/10 shadow-2xl"
                >
                  <ChevronLeft size={28} />
                </button>
              </motion.div>
            )}

            {step === STEPS.SELECT && (
              <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-start p-4 h-full w-full overflow-hidden">
                
                <div className="flex-shrink-0 text-center mb-2">
                  <h2 className="text-2xl font-black italic tracking-tighter text-indigo-900 mb-0.5">순서대로 4장을 선택해주세요</h2>
                  <p className="text-[11px] text-neutral-400 font-bold tracking-tight">선택한 순서대로 실시간 프레임에 배치됩니다 ✨</p>
                </div>

                <div className="flex-1 w-full flex justify-center items-center overflow-hidden min-h-0 py-2">
                  {(() => {
                    const availableH = (viewportSize.h || 800) - 340; // Approx height for selection bar and padding
                    const maxScale = Math.min(
                      0.5, 
                      (viewportSize.w - 48) / 1008, 
                      availableH / 1792
                    );
                    return (
                      <div style={{ height: 1792 * maxScale }} className="flex justify-center items-start">
                        <FramePreview frame={selectedFrame} photos={selectedPhotosForLayout} scale={maxScale} />
                      </div>
                    );
                  })()}
                </div>

                <div className="w-full max-w-5xl bg-white/50 backdrop-blur-xl border-t border-neutral-100/50 p-4 flex flex-col gap-4 flex-shrink-0">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex flex-col">
                      <h2 className="text-xl font-black text-indigo-900 tracking-tight leading-none">순서대로 4장 선택</h2>
                      <p className="text-[10px] text-neutral-400 font-bold mt-1">좌우로 밀어서 모든 사진을 확인하세요 ✨</p>
                    </div>
                    <button
                      onClick={() => { if (selectedPhotosForLayout.length === 4) setStep(STEPS.RESULT); }}
                      disabled={selectedPhotosForLayout.length !== 4}
                      className={`px-8 py-3.5 rounded-[25px] font-black text-sm flex items-center gap-2 transition-all shadow-lg
                        ${selectedPhotosForLayout.length === 4 ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-neutral-200 text-neutral-400 opacity-50 cursor-not-allowed'}`}>
                      선택 완료 <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="flex flex-row gap-3 overflow-x-auto pb-4 custom-scrollbar px-2 -mx-2 items-center justify-center flex-nowrap scroll-smooth">
                    {capturedPhotos.map((photo, i) => {
                      const selIdx = selectedPhotosForLayout.indexOf(photo);
                      const isSel = selIdx !== -1;
                      return (
                        <button key={i} onClick={() => togglePhotoSelection(photo)}
                          className={`relative w-24 flex-shrink-0 aspect-[3/4] rounded-lg overflow-hidden shadow-md border-2 transition-all ${isSel ? 'border-indigo-600 scale-[1.05]' : 'border-white opacity-90 hover:opacity-100'}`}>
                          <img src={photo} className="w-full h-full object-cover" />
                          {isSel && (
                            <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md ring-1 ring-white">
                                {selIdx + 1}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === STEPS.RESULT && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-start h-full w-full pt-[10px] pb-4 px-6 relative gap-2.5 overflow-hidden">
                
                <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center relative py-4 no-scrollbar">
                  {(() => {
                    const scale = Math.min(1, (viewportSize.w - 48) / 1080, ((viewportSize.h || 800) - 280) / 1920);
                    return (
                      <div style={{ 
                        width: 1080 * scale, 
                        height: 1920 * scale, 
                        flexShrink: 0,
                        marginTop: 'auto',
                        marginBottom: 'auto'
                      }} className="relative group transition-all duration-300">
                        <div className="absolute top-0 left-0 origin-top-left"
                             style={{ transform: `scale(${scale})`, width: '1080px', height: '1920px' }}>
                          <div id="photo-frame-result"
                            className="shadow-[0_40px_100px_rgba(0,0,0,0.3)] relative overflow-hidden transition-transform duration-300 rounded-lg hover:-translate-y-2 mx-auto w-full h-full"
                            style={{ backgroundColor: selectedFrame.hex || '#ffffff' }}>
                            
                            {/* 배경 프레임 (new 없는 경우) */}
                            {selectedFrame?.image && !selectedFrame.id?.includes('new') && (
                              <div className="absolute inset-0 z-0 pointer-events-none">
                                <img src={selectedFrame.image} className="w-full h-full object-cover opacity-90" />
                              </div>
                            )}
                            
                            {selectedPhotosForLayout.map((p, i) => {
                              const slots = [
                                { left: '65px', top: '78px' },
                                { left: '552px', top: '78px' },
                                { left: '65px', top: '789px' },
                                { left: '552px', top: '789px' }
                              ];
                              return (
                                <div key={i} className="absolute overflow-hidden z-10" 
                                  style={{ ...slots[i], width: '463px', height: '689px', backgroundColor: selectedFrame.hex || '#ffffff' }}>
                                  <img src={p} className="w-full h-full object-cover" />
                                </div>
                              );
                            })}
                            
                            {/* 전면 프레임 (new 포함된 경우, 사진 위에) */}
                            {selectedFrame?.image && selectedFrame.id?.includes('new') && (
                              <div className="absolute inset-0 z-20 pointer-events-none">
                                <img src={selectedFrame.image} className="w-full h-full object-cover opacity-90" />
                              </div>
                            )}
                            
                            <div className="absolute left-0 right-0 z-10 flex justify-center items-center" style={{ top: '1478px', height: '442px' }}>
                              <FrameLabel frame={selectedFrame} size1="80px" size2="46px" gap="20px" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="w-full max-w-2xl bg-white/94 backdrop-blur-3xl rounded-[28px] border border-neutral-100 shadow-2xl p-4 flex flex-col gap-2.5 mb-2">
                  <div className="flex gap-8 border-b border-neutral-50 px-4 pb-1 mb-1">
                    <div className="pb-2 text-[14px] font-black text-indigo-600 relative">
                      프레임 선택
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-4 pt-1 scroll-smooth flex-nowrap px-4 -mx-4 group">
                      {INITIAL_FRAMES.map(f => (
                        <button key={f.id} 
                          onClick={() => { setSelectedFrame(f); }}
                          className={`w-14 h-14 flex-shrink-0 rounded-xl border-[3px] transition-all relative overflow-hidden ${selectedFrame.id === f.id ? 'border-indigo-600 scale-105 shadow-lg z-20' : 'border-neutral-50 hover:border-neutral-100'}`}>
                          {f.image ? <img src={f.image} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: f.hex }} />}
                        </button>
                      ))}
                      {customFrames.map(f => (
                        <button key={f.id} 
                          onClick={() => { setSelectedFrame(f); }}
                          className={`w-14 h-14 flex-shrink-0 rounded-xl border-[3px] transition-all relative overflow-hidden ${selectedFrame.id === f.id ? 'border-indigo-600 scale-105 shadow-lg z-20' : 'border-neutral-50 hover:border-neutral-100'}`}>
                          <img src={f.image} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center pt-2 border-t border-neutral-50 px-1 mt-0.5">
                    <button onClick={saveImage}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[13px] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg">
                      <Download size={14} /> 저장하기
                    </button>
                    <button onClick={handleShareImage}
                      className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-[13px] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg">
                      <Share2 size={14} /> 공유하기
                    </button>
                    <button onClick={printImage}
                      className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[13px] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg">
                      <Printer size={14} /> 인쇄하기
                    </button>
                    <button onClick={resetAll}
                      className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-black text-[13px] rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5">
                      <Home size={14} /> 홈으로
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(#d1d5db_1.5px,transparent_1.5px)] [background-size:50px_50px] opacity-10" />
      </main>

      <AnimatePresence>
        {showSaveModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] p-10 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                <Check size={40} strokeWidth={3} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-black text-neutral-800 tracking-tight">저장이 완료되었습니다!</h3>
                <p className="text-sm font-bold text-neutral-400">사진이 갤러리에 안전하게 저장되었습니다 ✨</p>
              </div>

              <div className="flex flex-col w-full gap-3 mt-2">
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  닫기
                </button>
                <button 
                  onClick={() => { setShowSaveModal(false); resetAll(); }}
                  className="w-full py-4 bg-neutral-100 text-neutral-600 font-black rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                >
                  <Home size={18} /> 홈으로 가기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
