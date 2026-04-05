import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const queries = [
  { name: 'wave_frame.jpg', term: 'ocean waves crashing' },
  { name: 'beach_frame.jpg', term: 'sandy beach sunset' },
  { name: 'snow_frame.jpg', term: 'snow landscape winter' },
  { name: 'bokeh_frame.jpg', term: 'bokeh lights blurred' },
  { name: 'winter_frame.jpg', term: 'winter aesthetic outdoor' },
  { name: 'night_frame.jpg', term: 'night city scape' }
];

async function fetchWikiImage(term) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&generator=search&gsrsearch=filetype:bitmap%20${encodeURIComponent(term)}&gsrnamespace=6&pithumbsize=800&format=json`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.query && data.query.pages) {
    const pages = Object.values(data.query.pages);
    if (pages.length > 0 && pages[0].thumbnail) {
      return pages[0].thumbnail.source;
    }
  }
  return null;
}

async function start() {
  for (const q of queries) {
    try {
      console.log(`Searching for: ${q.term}...`);
      let imgUrl = await fetchWikiImage(q.term);
      if (!imgUrl) {
         imgUrl = await fetchWikiImage(q.term.split(' ')[0]);
      }
      if (imgUrl) {
        console.log(`Downloading: ${imgUrl}`);
        // Fetch naturally follows redirects!
        const res = await fetch(imgUrl);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const dest = path.join(__dirname, 'public', 'frames', q.name);
        fs.writeFileSync(dest, buffer);
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
