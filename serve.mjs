import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3016);
const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.mjs':'application/javascript', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon'
};

createServer(async (req,res)=>{
  try{
    const raw = decodeURIComponent(req.url.split('?')[0]);
    const safe = raw === '/' ? '/index.html' : raw.replace(/\.\./g,'');
    const file = join(__dirname, safe);
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(data);
  }catch(e){
    res.writeHead(404, {'Content-Type':'text/plain'});
    res.end('Not found');
  }
}).listen(PORT, ()=> console.log(`Island Boy Kreationz site running at http://localhost:${PORT}`));
