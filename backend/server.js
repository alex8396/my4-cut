require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(cors());

// Static files
app.use('/uploads', express.static(uploadsDir));

// Routes
// 0. Get Server Config (IP for QR)
app.get('/api/config', (req, res) => {
  res.json({ ip: getLocalIP(), port: PORT });
});
// 1. Get all frames (from disk only)
app.get('/api/frames', (req, res) => {
  try {
    const framesDir = path.join(__dirname, '../public/frames');
    if (!fs.existsSync(framesDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(framesDir);
    const frames = files
      .filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i))
      .map(file => ({
        id: `disk-${file}`,
        name: file.split('.')[0],
        image: `/frames/${file}`
      }));
    
    res.json(frames);
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 2. Upload photo and set deletion timer
app.post('/api/upload', (req, res) => {
  const { image, id } = req.body;
  if (!image || !id) return res.status(400).json({ error: 'Missing data' });

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const filePath = path.join(uploadsDir, `${id}.jpg`);

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Save failed' });
    }

    console.log(`Uploaded: ${id}.jpg - Deletion in 5 mins`);

    // Set deletion timer (5 mins)
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Delete failed: ${id}`, err);
          else console.log(`Auto-deleted: ${id}`);
        });
      }
    }, 5 * 60 * 1000);

    res.json({ success: true });
  });
});

// 3. Simple viewer page
app.get('/v/:id', (req, res) => {
  const { id } = req.params;
  const viewerHtml = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>신림 네컷 | 사진 다운로드</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; padding: 20px; box-sizing: border-box; }
        .card { background: white; padding: 24px; border-radius: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.1); text-align: center; width: 100%; max-width: 400px; animation: slideUp 0.6s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        h1 { font-size: 24px; font-weight: 900; color: #1e1b4b; margin: 0 0 8px 0; letter-spacing: -1px; }
        p.subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; font-weight: 500; }
        .img-container { position: relative; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 16px rgba(0,0,0,0.05); margin-bottom: 24px; background: #f1f5f9; }
        img { width: 100%; display: block; pointer-events: auto; }
        .download-btn { background: #4f46e5; color: white; border: none; padding: 18px; border-radius: 20px; font-weight: 900; font-size: 16px; cursor: pointer; width: 100%; transition: all 0.2s; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); text-decoration: none; display: inline-block; box-sizing: border-box; }
        .download-btn:active { transform: scale(0.98); opacity: 0.9; }
        .timer-notice { margin-top: 20px; color: #ef4444; font-size: 12px; font-weight: 800; display: flex; items-center: center; justify-content: center; gap: 4px; }
        .footer { margin-top: 24px; font-size: 10px; color: #cbd5e1; font-weight: bold; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>나의 4컷 사진 📸</h1>
        <p class="subtitle">모바일 기기에 저장하여 간직하세요!</p>
        <div class="img-container">
          <img src="/uploads/${id}.jpg" alt="Generated Photo">
        </div>
        <a href="/uploads/${id}.jpg" download="shillim-4cut-${id}.jpg" class="download-btn">사진 다운로드</a>
        <div class="timer-notice">
          ⚠️ 5분 뒤에 이 사진은 자동으로 삭제됩니다!
        </div>
      </div>
      <div class="footer">SHILLIM 4-CUT STUDIO</div>
    </body>
    </html>
  `;
  res.send(viewerHtml);
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
