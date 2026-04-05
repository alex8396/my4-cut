const fs = require('fs');
const https = require('https');
const path = require('path');

const framesDir = path.join(__dirname, 'public', 'frames');

const imagesToDownload = [
  { name: 'snow_frame.jpg', url: 'https://picsum.photos/seed/snowy/800/1200' },
  { name: 'bokeh_frame.jpg', url: 'https://picsum.photos/seed/bokehl/800/1200' },
  { name: 'winter_frame.jpg', url: 'https://picsum.photos/seed/winter/800/1200' },
  { name: 'night_frame.jpg', url: 'https://picsum.photos/seed/nightly/800/1200' }
];

imagesToDownload.forEach(img => {
  const filePath = path.join(framesDir, img.name);
  const file = fs.createWriteStream(filePath);
  
  https.get(img.url, (response) => {
    // Handling redirects since picsum redirects to a specific image ID
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      https.get(response.headers.location, (res2) => {
        res2.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${img.name}`);
        });
      });
    } else {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${img.name}`);
      });
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${img.name}: ${err.message}`);
  });
});
