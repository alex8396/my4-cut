const fs = require('fs');
const path = require('path');
const https = require('https');

const queries = [
  { name: 'night_frame.jpg', term: 'night city scape' },
  { name: 'wave_frame.jpg', term: 'ocean waves crashing' },
  { name: 'beach_frame.jpg', term: 'sandy beach sunset' },
  { name: 'snow_frame.jpg', term: 'snow landscape winter' },
  { name: 'bokeh_frame.jpg', term: 'bokeh lights blurred' }
];

async function fetchWikiImage(term) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&generator=search&gsrsearch=filetype:bitmap%20${encodeURIComponent(term)}&gsrnamespace=6&pithumbsize=800&format=json`;
  
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.query && json.query.pages) {
            const pages = Object.values(json.query.pages);
            if (pages.length > 0 && pages[0].thumbnail) {
              resolve(pages[0].thumbnail.source);
              return;
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(__dirname, 'src', 'assets', filename);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
}

async function start() {
  for (const q of queries) {
    try {
      console.log(`Searching for: ${q.term}...`);
      let imgUrl = await fetchWikiImage(q.term);
      if (!imgUrl) {
         // Fallback basic search
         imgUrl = await fetchWikiImage(q.term.split(' ')[0]);
      }
      if (imgUrl) {
        console.log(`Downloading: ${imgUrl}`);
        await downloadImage(imgUrl, q.name);
        console.log(`Saved as ${q.name}`);
      } else {
        console.log(`Not found for ${q.term}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

start();
