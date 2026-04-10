require('dotenv').config();
const express = require('express');
const cors = require('cors');

const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(cors());

// Routes
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
      .map(file => {
        const filePath = path.join(framesDir, file);
        const stats = fs.statSync(filePath);
        return {
          id: `disk-${file}`,
          name: file.split('.')[0],
          image: `/frames/${file}`,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
    
    res.json(frames.map(({ mtime, ...rest }) => rest));
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
