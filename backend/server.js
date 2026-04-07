require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Routes
// 1. Get all custom frames from public/frames directory
app.get('/api/frames', (req, res) => {
  try {
    const framesDir = path.join(__dirname, '../public/frames');
    
    // Check if directory exists
    if (!fs.existsSync(framesDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(framesDir);
    
    // Filter out only image files
    const frames = files
      .filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i))
      .map(file => ({
        id: file,
        name: file,
        image: `/frames/${file}`
      }));
    
    res.json(frames);
  } catch (error) {
    console.error('Error fetching frames from disk:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});


app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
