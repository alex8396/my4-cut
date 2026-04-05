require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Frame = require('./models/Frame');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable larger payload limits for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB successfully connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
// 1. Get all custom frames
app.get('/api/frames', async (req, res) => {
  try {
    // Sort by newest first
    const frames = await Frame.find().sort({ createdAt: -1 });
    
    // Convert to frontend-compatible format
    const formattedFrames = frames.map(f => ({
      id: f._id.toString(),
      name: f.name,
      image: f.image
    }));
    
    res.json(formattedFrames);
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 2. Upload a new custom frame
app.post('/api/frames', async (req, res) => {
  try {
    const { image, name } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const newFrame = new Frame({
        name: name || '커스텀',
        image: image
    });

    await newFrame.save();
    
    res.status(201).json({
      success: true,
      frame: {
        id: newFrame._id.toString(),
        name: newFrame.name,
        image: newFrame.image
      }
    });
  } catch (error) {
    console.error('Error saving frame:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 3. Delete a custom frame
app.delete('/api/frames/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Frame.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting frame:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

const SharedPhoto = require('./models/SharedPhoto');

// 4. Save a shared photo for QR code downloading
app.post('/api/shared', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }
    const newShared = new SharedPhoto({ image });
    await newShared.save();
    
    res.status(201).json({ success: true, id: newShared._id.toString() });
  } catch (error) {
    console.error('Error saving shared photo:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 5. Get a shared photo by ID
app.get('/api/shared/:id', async (req, res) => {
  try {
    const photo = await SharedPhoto.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json({ success: true, image: photo.image });
  } catch (error) {
    console.error('Error fetching shared photo:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
