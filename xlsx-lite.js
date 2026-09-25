const textDecoder = new TextDecoder('utf-8');

function u16(bytes, offset){ return bytes[offset] | (bytes[offset+1] << 8); }
function u32(bytes, offset){ return (bytes[offset] | (bytes[offset+1] << 8) | (bytes[offset+2] << 16) | (bytes[offset+3] << 24)) >>> 0; }
function sig(bytes, offset){ return u32(bytes, offset); }

function findEndOfCentralDirectory(bytes){
  const min = Math.max(0, bytes.length - 65557);
  for(let i = bytes.length - 22; i >= min; i--){
    if(sig(bytes, i) === 0x06054b50) return i;
  }
  throw new Error('File XLSX tidak valid: End Of Central Directory tidak ditemukan.');
}

function parseCentralDirectory(bytes){
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = u16(bytes, eocd + 10);
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  if(cdOffset + cdSize > bytes.length) throw new Error('File XLSX rusak: central directory di luar ukuran file.');
  const entries = [];
  let p = cdOffset;
  for(let i=0; i<entryCount; i++){
    if(sig(bytes, p) !== 0x02014b50) throw new Error('File XLSX rusak: entry ZIP tidak valid.');
    const flags = u16(bytes, p + 8);
    const method = u16(bytes, p + 10);
    const compressedSize = u32(bytes, p + 20);
    const uncompressedSize = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localOffset = u32(bytes, p + 42);
    const name = textDecoder.decode(bytes.slice(p + 46, p + 46 + nameLen));
    entries.push({name, flags, method, compressedSize, uncompressedSize, localOffset});
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(bytes){
  if(typeof DecompressionStream === 'undefined') throw new Error('Browser/engine tidak mendukung DecompressionStream untuk membaca XLSX.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(bytes, entry){
  if(entry.flags & 0x1) throw new Error(`Entry ZIP terenkripsi tidak didukung: ${entry.name}`);
  const p = entry.localOffset;
  if(sig(bytes, p) !== 0x04034b50) throw new Error(`Entry ZIP lokal tidak valid: ${entry.name}`);
  const nameLen = u16(bytes, p + 26);
  const extraLen = u16(bytes, p + 28);
  const start = p + 30 + nameLen + extraLen;
  const compressed = bytes.slice(start, start + entry.compressedSize);
  if(entry.method === 0) return compressed;
  if(entry.method === 8) return inflateRaw(compressed);
  throw new Error(`Metode kompresi XLSX tidak didukung: ${entry.method} (${entry.name})`);
}

function attr(tag, name){
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1] : '';
}

function decodeXmlEntities(s=''){
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#(\d+);/g, (_,d)=>String.fromCodePoint(parseInt(d,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}

function parseSharedStrings(xml){
  const out=[];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while((m=siRe.exec(xml))){
    const tMatches = [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];
    out.push(decodeXmlEntities(tMatches.map(x=>x[1]).join('')));
  }
  return out;
}

function colToIndex(ref){
  const letters = (ref.match(/^[A-Z]+/i)||[''])[0].toUpperCase();
  let n=0;
  for(const ch of letters) n = n*26 + ch.charCodeAt(0)-64;
  return n-1;
}

function parseCell(cellXml, sharedStrings){
  const open = cellXml.match(/^<c\b[^>]*>/i)?.[0] || '';
  const type = attr(open,'t');
  const ref = attr(open,'r');
  let raw='';
  const v = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
  if(v) raw = decodeXmlEntities(v[1].trim());
  else {
    const inline = [...cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map(x=>x[1]).join('');
    raw = decodeXmlEntities(inline);
  }
  let value=raw;
  if(type==='s'){
    const idx=Number(raw);
    value=Number.isInteger(idx) && idx>=0 ? (sharedStrings[idx] ?? '') : '';
  } else if(type==='b') value = raw==='1';
  return {ref, value};
}

function parseWorksheet(xml, sharedStrings){
  const rows=[];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rm;
  while((rm=rowRe.exec(xml))){
    const rowXml=rm[1];
    const cells=[];
    const cellRe = /<c\b[^>]*>[\s\S]*?<\/c>/gi;
    let cm;
    while((cm=cellRe.exec(rowXml))) cells.push(parseCell(cm[0], sharedStrings));
    const row=[];
    for(const c of cells){ const i=colToIndex(c.ref); if(i>=0) row[i]=c.value; }
    rows.push(row);
  }
  return rows;
}

function findHeaderRow(rows){
  for(let i=0;i<rows.length;i++){
    const row = rows[i] || [];
    const cleaned=row.map(v=>String(v??'').trim().toLowerCase());
    const username=cleaned.findIndex(v=>v==='username' || v==='user name' || v==='user id / username');
    const winlose=cleaned.findIndex(v=>v==='winloseamt' || v==='win lose amt' || v==='win/lose amt');
    if(username>=0 && winlose>=0) return {index:i, usernameIndex:username, winLoseIndex:winlose};
  }
  return null;
}

function asNumber(v){
  if(typeof v==='number') return Number.isFinite(v)?v:NaN;
  const s=String(v??'').trim();
  if(!s) return NaN;
  const n=Number(s.replace(/,/g,''));
  return Number.isFinite(n)?n:NaN;
}

export async function readXlsxReport(file){
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = parseCentralDirectory(bytes);
  const entryMap = new Map(entries.map(e=>[e.name,e]));
  const shared = entryMap.has('xl/sharedStrings.xml') ? parseSharedStrings(textDecoder.decode(await readEntry(bytes, entryMap.get('xl/sharedStrings.xml')))) : [];
  const sheetEntries = entries.filter(e=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name)).sort((a,b)=>a.name.localeCompare(b.name));
  if(!sheetEntries.length) throw new Error('File XLSX tidak memiliki worksheet yang bisa dibaca.');

  for(const entry of sheetEntries){
    const xml=textDecoder.decode(await readEntry(bytes, entry));
    const rows=parseWorksheet(xml, shared);
    const header=findHeaderRow(rows);
    if(!header) continue;
    const data=[];
    for(let i=header.index+1;i<rows.length;i++){
      const row=rows[i]||[];
      const username=String(row[header.usernameIndex]??'').trim();
      const winLoseAmt=asNumber(row[header.winLoseIndex]);
      if(!username) continue;
      data.push({username, winLoseAmt});
    }
    return {sheet:entry.name.replace(/^xl\/worksheets\//,'').replace(/\.xml$/i,''), rows:data};
  }
  throw new Error('Header Username + WinLoseAmt tidak ditemukan di worksheet XLSX.');
}
