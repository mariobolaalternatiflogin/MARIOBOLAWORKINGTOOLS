import {parseReport, getDepositRecords, parseDateTime, parseAmount} from './parser.js';

export const SAFETY_REASONS = [
  'SB','NB','Safety Bet','Tidak Mau Bonus','Tidak Pernah Capai TO','Hanya Main Bonus','SB BOLA','SB Cassino'
];

const clean = (s='') => String(s).replace(/<br\s*\/?\s*>/gi,'\n').replace(/&nbsp;/gi,' ').replace(/\\@/g,'@').trim();
const norm = (s='') => clean(s).replace(/\s+/g,' ').trim().toUpperCase();
const userKey = (s='') => norm(s);
const dateKey = d => d instanceof Date ? `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}` : '';
function parseMemberDateTime(value){
  const s=clean(value).replace(/\s+/g,' ');
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
  if(!m)return parseDateTime(value);
  let [,month,day,year,h,mi,se,ampm]=m; h=Number(h);
  if(ampm){const a=ampm.toUpperCase();if(a==='PM'&&h<12)h+=12;if(a==='AM'&&h===12)h=0;}
  return new Date(Date.UTC(Number(year),Number(month)-1,Number(day),h,Number(mi),Number(se)));
}

export function normalizeSafetyRecord({username,reason,note=''}){
  return { username: clean(username), reason: clean(reason), note: clean(note), key:userKey(username) };
}

function splitTableLine(line){
  let s=line.trim(); if(s.startsWith('|')) s=s.slice(1); if(s.endsWith('|')) s=s.slice(0,-1);
  return s.split('|').map(clean);
}
function parseMarkdownTable(text){
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const headerIndex=lines.findIndex(l=>/^\|.*\|$/.test(l) && /Register Date/i.test(l) && /User Name/i.test(l));
  if(headerIndex<0 || headerIndex+1>=lines.length) return [];
  const headers=splitTableLine(lines[headerIndex]).map(h=>h.replace(/\*\*/g,''));
  const rows=[];
  for(let i=headerIndex+1;i<lines.length;i++){
    if(!/^\|.*\|$/.test(lines[i])) continue;
    const cells=splitTableLine(lines[i]);
    if(cells.length!==headers.length || cells.every(c=>/^-{3,}$/.test(c))) continue;
    const obj={}; headers.forEach((h,j)=>obj[h]=cells[j]??'');
    if(clean(obj['User Name']||obj['Username'])) rows.push(obj);
  }
  return rows;
}
function parseTSV(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  const idx=lines.findIndex(l=>/Register Date/i.test(l)&&/User Name/i.test(l)); if(idx<0)return [];
  const headers=lines[idx].split(/\t+/).map(x=>clean(x).replace(/\*\*/g,''));
  return lines.slice(idx+1).map(line=>{
    const c=line.split(/\t+/).map(clean); if(c.length<2)return null;
    const o={}; headers.forEach((h,i)=>o[h]=c[i]??'');
    return clean(o['User Name']||o['Username'])?o:null;
  }).filter(Boolean);
}

function nmRowStart(line){
  return /^\s*\d{1,8}\s+(?:\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)\s+/i.test(line)
    || /^\s*\d{1,8}\s+\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\s*$/i.test(line);
}
function newMemberBlocks(text){
  const lines=clean(text).replace(/\r/g,'').split('\n');
  const blocks=[]; let current=[];
  for(const raw of lines){
    const line=clean(raw); if(!line) continue;
    if(nmRowStart(line)){
      if(current.length) blocks.push(current.join('\n'));
      current=[line];
    }else if(current.length){current.push(line);}
  }
  if(current.length)blocks.push(current.join('\n'));
  return blocks;
}

function parseBrowserNewMember(text){
  const blocks=newMemberBlocks(text);
  const out=[];
  for(const b of blocks){
    const s=clean(b);
    const dateMatch=s.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\b/i);
    const username=s.match(/\b(?:BEB@|[A-Za-z0-9_.-]+@)[^\s\n|]+/i)?.[0]||'';
    if(!username || !dateMatch) continue;
    out.push({'Register Date':dateMatch[0],'User Name':username});
  }
  if(out.length) return out;

  // Some browser copies preserve each table cell on its own line, e.g.
  // row-number -> Register Date -> User Name -> remaining cells. Pair each
  // registration timestamp with the first username following it. This fallback
  // is isolated to MEMBER 2.2 and does not alter parser.js / Bonus 1.1.
  const lines=clean(text).replace(/\r/g,'').split('\n').map(clean).filter(Boolean);
  for(let i=0;i<lines.length;i++){
    const dm=lines[i].match(/^(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)$/i);
    if(!dm) continue;
    for(let j=i+1;j<Math.min(i+6,lines.length);j++){
      const u=lines[j].match(/^\d{1,8}\s+(?:BEB@|[A-Za-z0-9_.-]+@)([^\s]+)$/i) || lines[j].match(/^(?:BEB@|[A-Za-z0-9_.-]+@)[^\s]+$/i);
      if(u){
        const uname=(u[0].match(/(?:BEB@|[A-Za-z0-9_.-]+@)[^\s]+/i)||[])[0]||'';
        out.push({'Register Date':dm[1],'User Name':uname}); break;
      }
    }
  }
  return out;
}

export function parseNewMembers(text=''){
  const md=parseMarkdownTable(text); if(md.length) return md;
  const tsv=parseTSV(text); if(tsv.length) return tsv;
  return parseBrowserNewMember(text);
}

export function processNewMemberFirstDeposit(newMembersText='', qrText='', historyText=''){
  const membersRaw=parseNewMembers(newMembersText);
  const members=membersRaw.map((r,i)=>{
    const registerDateRaw=clean(r['Register Date']||r['Register date']||r['Date']);
    const username=clean(r['User Name']||r['Username']||r['UserName']);
    return {row:i+1, username, registerDateRaw, registerDate:parseMemberDateTime(registerDateRaw), calendarDate:dateKey(parseMemberDateTime(registerDateRaw))};
  }).filter(r=>r.username&&r.registerDate);

  // IMPORTANT: use the exact 1.1 deposit reader. parser.js is unchanged.
  const qr = parseReport(qrText,'qrpay');
  const hist = parseReport(historyText,'deposit-history');
  const deposits = [...getDepositRecords(qr,'qrpay'), ...getDepositRecords(hist,'history')]
    .filter(r=>r.username && r.amount>0 && r.date)
    .sort((a,b)=>a.date.getTime()-b.date.getTime());

  const byUser=new Map();
  for(const d of deposits){
    const k=userKey(d.username); if(!byUser.has(k))byUser.set(k,[]); byUser.get(k).push(d);
  }

  const rows=[];
  let matchedCount=0;
  for(const m of members){
    const candidates=(byUser.get(userKey(m.username))||[]).filter(d=>{
      const dk=dateKey(d.date);
      return dk===m.calendarDate && d.date.getTime()>=m.registerDate.getTime();
    });
    const first=[...candidates].sort((a,b)=>a.date.getTime()-b.date.getTime())[0];
    const depositAmount=first ? Math.trunc(Number(first.amount)||0) : 0;
    if(first) matchedCount++;
    rows.push({
      username:m.username,
      registerDateRaw:m.registerDateRaw,
      registerDate:m.registerDate,
      calendarDate:m.calendarDate,
      depositAmount,
      depositDateRaw:first?.dateRaw||'',
      depositSource:first?.source||'',
      matched:!!first,
      hidden:false
    });
  }
  rows.sort((a,b)=>a.registerDate.getTime()-b.registerDate.getTime() || a.username.localeCompare(b.username));
  return {members, rows, memberCount:members.length, qrCount:qr.length, historyCount:hist.length, matchedCount, noDepositCount:members.length-matchedCount, distinctDates:[...new Set(members.map(m=>m.calendarDate).filter(Boolean))].sort()};
}

export function sortMemberFirstDepositRows(rows, mode='register-asc'){
  const copy=[...rows];
  const time=x=>x.registerDate?.getTime()||0;
  if(mode==='register-desc') return copy.sort((a,b)=>time(b)-time(a)||a.username.localeCompare(b.username));
  if(mode==='username-asc') return copy.sort((a,b)=>a.username.localeCompare(b.username));
  if(mode==='username-desc') return copy.sort((a,b)=>b.username.localeCompare(a.username));
  if(mode==='deposit-desc') return copy.sort((a,b)=>b.depositAmount-a.depositAmount||time(a)-time(b));
  if(mode==='deposit-asc') return copy.sort((a,b)=>a.depositAmount-b.depositAmount||time(a)-time(b));
  return copy.sort((a,b)=>time(a)-time(b)||a.username.localeCompare(b.username));
}
