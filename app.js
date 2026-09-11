/* MARIOBOLA Working Tools — local admin dashboard */
(function(){
'use strict';
const GAMES=['SPORT 1','SPORT 2','SPORT OMEGA','SSC','PG SOFT','PPLAY','CT CASINO','12 LIVE','AFB GAMING 2022','DREAM GAMING','HABANERO','JDB','GD88','PHUMCASINO','TANGKAS'];
const DBKEY='mario_working_tools_v1';
const state={bonusRows:[],firstRows:[],gameRows:[],safety:[],gameFiles:[],ranking:[]};
const $=id=>document.getElementById(id);
const money=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const norm=s=>String(s??'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').replace(/\\([@*])/g,'$1').replace(/\*\*/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
const upper=s=>norm(s).toUpperCase();
const memberId=s=>{
 const x=norm(s).replace(/^['"`]+|['"`]+$/g,'').trim();
 const m=x.match(/(?:^|[\s|;,])BEB@[^\s|;,<>"'`]+/i);
 return m?m[0].trim().toUpperCase().replace(/[|;,]+$/,''):'';
};
const parseNum=s=>{
 let x=norm(s).replace(/[^0-9,.-]/g,''); if(!x)return 0;
 const neg=x.startsWith('-'); x=x.replace(/-/g,'');
 const commas=(x.match(/,/g)||[]).length, dots=(x.match(/\./g)||[]).length;
 if(commas&&dots){
   const lastComma=x.lastIndexOf(','), lastDot=x.lastIndexOf('.');
   const decPos=Math.max(lastComma,lastDot), frac=x.slice(decPos+1);
   const before=x.slice(0,decPos).replace(/[.,]/g,'');
   if(frac.length===1||frac.length===2){const n=Number(before+'.'+frac);return neg?-n:n;}
   const n=Number(x.replace(/[.,]/g,''));return neg?-n:n;
 }
 if(commas||dots){
   const sep=commas?',':'.'; const parts=x.split(sep); const last=parts[parts.length-1];
   if(parts.length>1&&last.length===3){const n=Number(parts.join(''));return neg?-n:n;}
   const n=Number(parts.slice(0,-1).join('')+'.'+last);return neg?-n:n;
 }
 const n=Number(x);return neg?-n:n;
};
function dateKey(s){
 const x=norm(s); if(!x)return '';
 let m=x.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
 if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
 m=x.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
 if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
 return '';
}
function dtValue(s){
 const x=norm(s), d=dateKey(x); if(!d)return null;
 const m=x.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
 let h=m?+m[1]:0,mi=m?+m[2]:0,se=m&&m[3]?+m[3]:0;
 const ap=m&&m[4]?m[4].toUpperCase():'';
 if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;
 const out=new Date(`${d}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(se).padStart(2,'0')}`);
 return Number.isNaN(out.getTime())?null:out;
}
function rowsFromText(text){
 const t=String(text??'')
   .replace(/<br\s*\/?>/gi,' ')
   .replace(/<[^>]*>/g,'')
   .replace(/\\([@*])/g,'$1')
   .replace(/\*\*/g,'')
   .replace(/\u00a0/g,' ')
   .trim();
 if(!t)return [];
 const lines=t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 return lines.map(line=>{
   let parts=line.includes('|')?line.split('|'):line.split(/\t+/);
   parts=parts.map(norm);
   while(parts.length&&parts[0]==='')parts.shift();
   while(parts.length&&parts[parts.length-1]==='')parts.pop();
   return parts;
 }).filter(r=>r.some(x=>x)&&!/^[-–—\s]+$/.test(r.join('').replace(/\|/g,'')));
}
function headerMap(r){
 const h=r.map(upper);
 const find=(...keys)=>h.findIndex(v=>keys.some(k=>v===k||v.includes(k)));
 return {
   user:find('USER NAME','USERNAME','MEMBER','ID MEMBER'),
   amount:find('AMOUNT','NOMINAL','DEPOSIT','BONUS'),
   date:find('DATE','TANGGAL','TIME','WAKTU'),
   status:find('STATUS'),
   remark:find('REMARK','KETERANGAN','NOTE'),
   game:find('GAME','PRODUCT','PROVIDER'),
   winlose:find('WIN/LOSE','WIN LOSE','WINLOSE','TOTAL WIN','TOTAL LOSE')
 };
}
function parseGenericRows(text, source='UNKNOWN'){
 const rs=rowsFromText(text); if(!rs.length)return [];
 const hm=headerMap(rs[0]);
 const hasMemberIdInFirstRow=rs[0].some(x=>/BEB@/i.test(x)); const hasHeader=!hasMemberIdInFirstRow && hm.user>=0 && (hm.amount>=0||hm.game>=0||hm.winlose>=0||hm.date>=0);
 const data=hasHeader?rs.slice(1):rs;
 return data.map((r,i)=>{
   const legacy=!hasHeader && r.length>=8;
   const id=memberId(hasHeader&&hm.user>=0?r[hm.user]:(legacy?r[1]:r.find(x=>/BEB@/i.test(x))));
   const joined=r.join(' | ');
   const dateIdx=!hasHeader?r.findIndex(x=>/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/i.test(x)):-1;
   const dateCell=hasHeader&&hm.date>=0?r[hm.date]:(dateIdx>=0?r[dateIdx]:'');
   const date=dateKey(dateCell||joined);
   const timestamp=dtValue(dateCell||joined);
   const amount=hasHeader&&hm.amount>=0?parseNum(r[hm.amount]):(legacy?parseNum(r[4]):(()=>{const candidates=r.map((x,j)=>({j,x,n:parseNum(x)})).filter(o=>o.j!==dateIdx&&o.n>0&&!/BEB@/i.test(o.x)); const money=candidates.find(o=>/(?:IDR|Rp|\b\d{1,3}(?:[.,]\d{3})+\b)/i.test(o.x)); return parseNum((money||candidates[0]||{}).x||'')})());
   const status=hasHeader&&hm.status>=0?upper(r[hm.status]):(legacy?(upper(r.find(x=>/^(CONFIRMED|SUCCESS|BERHASIL|PAID|COMPLETED|PENDING|FAILED|CANCELLED|CANCELED)$/i.test(norm(x)))||'')):'');
   const remark=hasHeader&&hm.remark>=0?r[hm.remark]:joined;
   return {id,date,timestamp,amount,status,remark,raw:r,index:i+1,source,game:hm.game>=0?r[hm.game]:'',winlose:hm.winlose>=0?parseNum(r[hm.winlose]):amount};
 }).filter(x=>x.id);
}
function classifyBonus(r){
 const s=upper(r.remark+' '+r.raw.join(' '));
 return /SCB\s+A\s+BONUS\s+DEPOSIT\s+HARIAN|BONUS\s+DEPOSIT|BONUS/i.test(s);
}
function classifyDeposit(r){
 const s=upper(r.remark+' '+r.raw.join(' '));
 if(classifyBonus(r))return false;
 if(r.amount<=0)return false;
 return !r.status || /CONFIRMED|SUCCESS|BERHASIL|PAID|COMPLETED/i.test(r.status) || /QR\s*PAY|QRIS|MEMBER\s+DEPOSIT/i.test(s);
}
const BONUS_EXCLUSION_RULES=[
 {label:'SB',re:/(^|[^A-Z0-9])SB([^A-Z0-9]|$)/},
 {label:'NO BONUS',re:/\bNO\s+BONUS\b/},
 {label:'SAFETY',re:/\bSAFETY\b/},
 {label:'SAFETY BET',re:/\bSAFETY\s+BET\b/},
 {label:'NB',re:/(^|[^A-Z0-9])NB([^A-Z0-9]|$)/},
 {label:'BATAL WD',re:/\bBATAL\s+WD\b/},
 {label:'WD DIKEMBALIKAN KE MEMBER',re:/\bWD\s+DIKEMBALIKAN\s+KE\s+MEMBER\b/},
 {label:'MEMBER LANJUT MAIN',re:/\bMEMBER\s+LANJUT\s+MAIN\b/},
 {label:'WD DIKEMBALIKAN MEMBER LANJUT MAIN',re:/\bWD\s+DIKEMBALIKAN\s+MEMBER\s+LANJUT\s+MAIN\b/},
 {label:'TIDAK MAU BONUS',re:/\bTIDAK\s+MAU\s+BONUS\b/}
];
function exclusionFlags(text){
 const s=upper(text);
 return BONUS_EXCLUSION_RULES.filter(x=>x.re.test(s)).map(x=>x.label);
}
function parseExclusions(text){
 const rows=parseGenericRows(text,'STATUS/EXCLUSION');
 const map=new Map();
 rows.forEach(r=>{
   const flags=exclusionFlags(r.raw.join(' | ')+' '+r.remark);
   if(flags.length){
     if(!map.has(r.id))map.set(r.id,new Set());
     flags.forEach(f=>map.get(r.id).add(f));
   }
 });
 return map;
}
function auditBonus(bonusSource,depositSource,exclusionSource='',rate=5,cap=100000,safetyList=[]){
 if(typeof exclusionSource==='number'){ safetyList=cap instanceof Array?cap:[]; cap=rate; rate=exclusionSource; exclusionSource=''; }
 const bonusRows=parseGenericRows(bonusSource,'HISTORY DEPOSIT/BONUS');
 const qrRows=parseGenericRows(depositSource,'QR PAY');
 const statusRows=parseGenericRows(exclusionSource,'STATUS/EXCLUSION');
 const all=bonusRows.concat(qrRows);
 const deposits=all.filter(classifyDeposit);
 const bonuses=all.filter(classifyBonus);
 const exclusions=parseExclusions(exclusionSource);
 (safetyList||[]).forEach(x=>{
   if(!x||!x.id)return;
   if(!exclusions.has(x.id))exclusions.set(x.id,new Set());
   exclusions.get(x.id).add(x.category||'SAFETY');
 });
 const byKey=new Map();
 deposits.forEach(r=>{
   const k=r.id+'|'+(r.date||'NO_DATE');
   if(!byKey.has(k))byKey.set(k,[]);
   byKey.get(k).push(r);
 });
 // Link each bonus to the nearest confirmed deposit at or before it.
 // A 24-hour window intentionally handles deposits just before midnight
 // whose bonus is posted shortly after midnight.
 const bonusByKey=new Map();
 bonuses.forEach(r=>{
   let best=null,bestMs=Infinity;
   const bt=r.timestamp?.getTime();
   byKey.forEach((ds,k)=>{
     if(!k.startsWith(r.id+'|'))return;
     ds.forEach(d=>{
       const dt=d.timestamp?.getTime();
       let diff;
       if(Number.isFinite(bt)&&Number.isFinite(dt)){
         diff=bt-dt;
         if(diff<0||diff>24*60*60*1000)return;
       }else if(d.date!==r.date){
         return;
       }else{
         diff=0;
       }
       if(diff<bestMs){bestMs=diff;best=k;}
     });
   });
   // If no prior deposit can be linked, retain same-day grouping so the
   // audit still exposes the transaction instead of silently dropping it.
   const k=best||(r.id+'|'+(r.date||'NO_DATE'));
   if(!bonusByKey.has(k))bonusByKey.set(k,[]);
   bonusByKey.get(k).push(r);
 });
 const rows=[];
 byKey.forEach((ds,k)=>{
   const [id,date]=k.split('|');
   const basis=Math.max(...ds.map(x=>x.amount));
   const expected=Math.min(basis*Number(rate||0)/100,Number(cap||0));
   const bs=(bonusByKey.get(k)||[]).sort((a,b)=>(a.timestamp?.getTime()||0)-(b.timestamp?.getTime()||0));
   const flags=[...(exclusions.get(id)||new Set())];
   const given=bs.reduce((a,b)=>a+b.amount,0);
   const double=bs.length>1;
   let status,note;
   if(flags.length){
     status='TIDAK DAPAT BONUS';
     note='Dikecualikan berdasarkan status: '+flags.join(', ');
   }else if(!bs.length){
     status='BELUM DIBERIKAN';
     note='Ada deposit yang memenuhi filter, tetapi tidak ditemukan transaksi bonus confirmed pada tanggal yang sama.';
   }else if(double){
     status='DOBEL BONUS';
     note=`Ditemukan ${bs.length} transaksi bonus untuk 1 member pada tanggal yang sama.`;
   }else if(given===expected){
     status='SESUAI';
     note='Nominal bonus sesuai basis deposit dan rate.';
   }else if(given>expected){
     status='KELEBIHAN BONUS';
     note='Bonus yang diberikan melebihi nominal seharusnya.';
   }else{
     status='KEKURANGAN BONUS';
     note='Bonus yang diberikan kurang dari nominal seharusnya.';
   }
   rows.push({
     id,date,deposits:ds.map(x=>x.amount),basis,expected,given,status,double,
     exclusionFlags:flags,bonusCount:bs.length,
     depositTimes:ds.map(x=>x.timestamp?.toISOString()||''),
     bonusTimes:bs.map(x=>x.timestamp?.toISOString()||''),
     note
   });
 });
 rows.sort((a,b)=>a.id.localeCompare(b.id)||a.date.localeCompare(b.date));
 return {rows,parsed:all.length+statusRows.length,deposits:deposits.length,bonuses:bonuses.length,exclusions:[...exclusions.keys()].length};
}
function parseFirstDeposits(newText,depText){const members=parseGenericRows(newText).map(r=>({id:r.id,date:r.date})); const deps=parseGenericRows(depText).filter(classifyDeposit); const first=new Map(); deps.forEach(r=>{if(!first.has(r.id))first.set(r.id,r); else {const a=dtValue(r.raw.join(' '))||new Date(r.date||'2999-01-01'), b=dtValue(first.get(r.id).raw.join(' '))||new Date(first.get(r.id).date||'2999-01-01'); if(a<b)first.set(r.id,r)}}); const out=[]; members.forEach(m=>{const d=first.get(m.id); if(d)out.push({id:m.id,regDate:m.date,depositDate:d.date,amount:d.amount,same:m.date&&d.date&&m.date===d.date})}); return out}
function parseSafety(){return loadDB().safety||[]}
function saveDB(){localStorage.setItem(DBKEY,JSON.stringify({safety:state.safety,settings:{}}))}
function loadDB(){try{return JSON.parse(localStorage.getItem(DBKEY)||'{"safety":[]}')}catch(e){return {safety:[]}}}
async function sha256(text){const b=new TextEncoder().encode(text);const h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function authHash(){return localStorage.getItem(DBKEY+'_auth')}
async function setAuth(p){localStorage.setItem(DBKEY+'_auth',await sha256(p))}
async function checkAuth(p){return authHash()===await sha256(p)}
function show(id,on){$(id).classList.toggle('hidden',!on)}
function csv(rows,headers){const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;return [headers.map(esc).join(','),...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n')}
function download(name,text,type='text/csv;charset=utf-8'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function setPage(page){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));$('page-'+page).classList.add('active');document.querySelector(`[data-page="${page}"]`).classList.add('active');}
function renderSafety(){const tb=$('safetyTable').querySelector('tbody');tb.innerHTML=''; if(!state.safety.length){tb.innerHTML='<tr><td colspan="5" class="empty">Belum ada ID Safety.</td></tr>'} state.safety.forEach((x,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><button class="link-btn" data-safety="${i}">${x.id}</button></td><td>${x.category}</td><td>${x.note||'-'}</td><td>${x.added}</td><td><button class="btn" data-delete-safety="${i}">Hapus</button></td>`;tb.appendChild(tr)});$('statSafety').textContent=state.safety.length;renderTicker()}
function renderTicker(){const el=$('tickerItems');el.innerHTML=state.safety.length?state.safety.map((x,i)=>`<span class="ticker-item" data-ticker="${i}">${x.id} — ${x.category}</span>`).join(''): '<span>Belum ada Member Safety</span>';}
function renderBonus(){const tb=$('bonusTable').querySelector('tbody');tb.innerHTML=''; if(!state.bonusRows.length){tb.innerHTML='<tr><td colspan="8" class="empty">Belum ada hasil.</td></tr>';return} state.bonusRows.forEach(r=>{const tr=document.createElement('tr');const cls=r.status==='SESUAI'?'status-ok':(r.status==='BELUM DIBERIKAN'?'status-warn':(r.status==='TIDAK DAPAT BONUS'?'status-ok':'status-bad'));tr.innerHTML=`<td>${r.id}</td><td>${r.date||'-'}</td><td>${r.deposits.map(money).join(' + ')}</td><td>${money(r.basis)}</td><td>${money(r.expected)}</td><td>${money(r.given)}</td><td class="${cls}">${r.status}</td><td>${r.note}</td>`;tb.appendChild(tr)});const issues=state.bonusRows.filter(r=>r.status!=='SESUAI'&&r.status!=='TIDAK DAPAT BONUS').length; $('countIssue').textContent=issues+' isu';$('countNoBonus').textContent=state.bonusRows.filter(r=>r.status==='BELUM DIBERIKAN').length+' belum bonus';$('countDouble').textContent=state.bonusRows.filter(r=>r.double).length+' dobel';$('countExcluded').textContent=state.bonusRows.filter(r=>r.status==='TIDAK DAPAT BONUS').length+' dikecualikan';$('statBonusIssues').textContent=issues;}
function renderFirst(){const tb=$('firstDepositTable').querySelector('tbody');tb.innerHTML='';if(!state.firstRows.length){tb.innerHTML='<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>'}state.firstRows.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.id}</td><td>${r.regDate||'-'}</td><td>${r.amount?money(r.amount):'-'}</td><td>${r.depositDate||'-'}</td><td class="${r.same?'status-ok':'status-warn'}">${r.same?'YA':'TIDAK'}</td><td>${money(r.amount)}</td>`;tb.appendChild(tr)});$('countFirstDeposit').textContent=state.firstRows.filter(r=>r.same).length+' ditemukan';$('statNewMember').textContent=state.firstRows.filter(r=>r.same).length;}
function renderRanking(){const tb=$('rankingTable').querySelector('tbody');tb.innerHTML='';state.ranking.forEach((r,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${i+1}</td><td>${r.id}</td><td>${money(r.amount)}</td>`;tb.appendChild(tr)});if(!state.ranking.length)tb.innerHTML='<tr><td colspan="3" class="empty">Belum ada hasil.</td></tr>'}
function parseRanking(t){return parseGenericRows(t).map(r=>({id:r.id,amount:r.amount})).filter(r=>r.amount>0)}
function renderGames(){const select=$('gameFilter');select.innerHTML='<option value="ALL">ALL GAME</option>'+GAMES.map(g=>`<option>${g}</option>`).join('');$('gameBadges').innerHTML=GAMES.map(g=>`<span class="badge">${g}</span>`).join('')}
function normalizeGameName(s){const u=upper(s);return GAMES.find(g=>u===g||u.includes(g))||u}
function readWorkbook(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});let rows=[];wb.SheetNames.forEach(name=>{const sh=wb.Sheets[name];const data=XLSX.utils.sheet_to_json(sh,{header:1,defval:''});data.forEach((r,i)=>rows.push({sheet:name,row:i+1,cells:r.map(norm),source:file.name}))});resolve(rows)}catch(err){reject(err)}};fr.onerror=reject;fr.readAsArrayBuffer(file)})}
function parseGameRows(raw){if(!raw.length)return []; const out=[]; raw.forEach(x=>{const cells=x.cells;const joined=upper(cells.join(' | '));const id=memberId(cells.find(c=>/BEB@/i.test(c)));if(!id)return; let game=cells.find(c=>GAMES.some(g=>upper(c)===g||upper(c).includes(g)))||''; game=normalizeGameName(game||$('gameFilter').value); let wl=0; let wi=cells.findIndex(c=>/WIN|LOSE|NET|TOTAL/i.test(upper(c))); if(wi>=0)wl=parseNum(cells[wi]); if(!wl){const nums=cells.map(parseNum).filter(n=>n!==0);wl=nums.length?nums[nums.length-1]:0} if(!wl)return;out.push({id,game,winlose:wl,source:x.source});});return out}
function renderGame(){const tb=$('gameTable').querySelector('tbody');tb.innerHTML='';let rows=[...state.gameRows];const gf=$('gameFilter').value;const search=upper($('gameSearch').value);const min=Number($('gameMin').value||0);if(gf!=='ALL')rows=rows.filter(r=>r.game===gf);if(search)rows=rows.filter(r=>r.id.includes(search));rows=rows.filter(r=>Math.abs(r.winlose)>=min);rows.sort((a,b)=>$('gameSort').value==='asc'?a.winlose-b.winlose:b.winlose-a.winlose);rows.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.id}</td><td>${r.game}</td><td class="${r.winlose>=0?'status-ok':'status-bad'}">${money(r.winlose)}</td><td>${r.source}</td>`;tb.appendChild(tr)});if(!rows.length)tb.innerHTML='<tr><td colspan="4" class="empty">Tidak ada data sesuai filter.</td></tr>';$('gameLoseCount').textContent=rows.filter(r=>r.winlose<0).length+' kalah';$('gameWinCount').textContent=rows.filter(r=>r.winlose>=0).length+' menang';$('statGameRows').textContent=state.gameRows.length;return rows}
function wire(){document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));$('logoutBtn').onclick=()=>{show('app',false);show('loginGate',true)};$('processBonus').onclick=()=>{try{const r=auditBonus($('bonusSource').value,$('depositSource').value,$('exclusionSource').value,Number($('bonusRate').value),Number($('bonusCap').value),state.safety);state.bonusRows=r.rows;renderBonus();$('bonusSummary').textContent=`${r.rows.length} member berdeposit • ${r.parsed} baris terbaca • ${r.deposits} deposit • ${r.bonuses} bonus • Rate ${$('bonusRate').value}% • Maks ${money($('bonusCap').value)}`;$('exportBonus').disabled=!r.rows.length}catch(e){$('bonusSummary').textContent='ERROR: '+e.message}};
$('exportBonus').onclick=()=>download('audit-bonus.csv',csv(state.bonusRows.map(r=>({...r,deposits:r.deposits.join(' + ')})),['id','date','deposits','basis','expected','given','status','double','exclusionFlags','bonusCount','note']));
$('loadDemoBonus').onclick=()=>{$('bonusSource').value='User Name | Amount | Date | Status | Remark\nBEB@DEMO1 | 500000 | 2026-09-11 | Confirmed | Member Deposit\nBEB@DEMO1 | 25000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN\nBEB@DEMO2 | 2000000 | 2026-09-11 | Confirmed | Member Deposit\nBEB@DEMO2 | 100000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN\nBEB@DEMO2 | 100000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN\nBEB@DEMO3 | 100000 | 2026-09-11 | Confirmed | Member Deposit';$('depositSource').value='';$('exclusionSource').value=''};$('clearBonusInputs').onclick=()=>{$('bonusSource').value='';$('depositSource').value='';$('bonusSummary').textContent='Belum diproses.'};
$('processFirstDeposit').onclick=()=>{state.firstRows=parseFirstDeposits($('newMemberSource').value,$('firstDepositSource').value);renderFirst();$('firstDepositSummary').textContent=`${state.firstRows.length} member punya deposit pertama • ${state.firstRows.filter(r=>r.same).length} deposit pertama terjadi di hari daftar`;$('exportFirstDeposit').disabled=!state.firstRows.length};$('exportFirstDeposit').onclick=()=>download('new-member-first-deposit.csv',csv(state.firstRows,['id','regDate','amount','depositDate','same']));
$('addSafety').onclick=()=>{const id=memberId($('safetyId').value);if(!id){alert('ID harus diawali BEB@');return}state.safety.unshift({id,category:$('safetyCategory').value,note:norm($('safetyNote').value),added:new Date().toLocaleString('id-ID')});saveDB();renderSafety();$('safetyId').value='';$('safetyNote').value=''};$('clearSafety').onclick=()=>{$('safetyId').value='';$('safetyNote').value=''};$('safetyTable').onclick=e=>{const d=e.target.dataset.deleteSafety;if(d!==undefined){state.safety.splice(Number(d),1);saveDB();renderSafety()} const s=e.target.dataset.safety;if(s!==undefined)alert(`Member Safety\n${state.safety[Number(s)].id}\n${state.safety[Number(s)].category}\n${state.safety[Number(s)].note||'-'}`)};$('tickerItems').onclick=e=>{const i=e.target.dataset.ticker;if(i!==undefined){setPage('member');$('safetyId').value=state.safety[Number(i)].id;window.scrollTo({top:document.querySelector('#page-member').offsetTop,behavior:'smooth'})}};
$('processRankingAsc').onclick=()=>{state.ranking=parseRanking($('rankingSource').value).sort((a,b)=>a.amount-b.amount);renderRanking();$('rankingSummary').textContent=`${state.ranking.length} member bonus terdeteksi • terkecil ke terbesar`};$('processRankingDesc').onclick=()=>{state.ranking=parseRanking($('rankingSource').value).sort((a,b)=>b.amount-a.amount);renderRanking();$('rankingSummary').textContent=`${state.ranking.length} member bonus terdeteksi • terbesar ke terkecil`};
$('gameFile').onchange=()=>{state.gameFiles=[...$('gameFile').files];$('fileList').innerHTML=state.gameFiles.length?state.gameFiles.map(f=>`<div class="file-item"><span>${f.name}</span><span>${Math.round(f.size/1024)} KB</span></div>`).join(''):'Belum ada file.'};$('processGame').onclick=async()=>{if(typeof XLSX==='undefined'){alert('Library Excel belum termuat. Pastikan koneksi internet aktif.');return} if(!state.gameFiles.length){alert('Upload file Excel terlebih dahulu.');return} try{let raw=[];for(const f of state.gameFiles)raw=raw.concat(await readWorkbook(f));state.gameRows=parseGameRows(raw);renderGame();$('gameSummary').textContent=`${state.gameRows.length} baris WIN/LOSE terbaca dari ${state.gameFiles.length} file.`;$('exportGame').disabled=!state.gameRows.length}catch(e){$('gameSummary').textContent='ERROR membaca Excel: '+e.message}};$('gameFilter').onchange=renderGame;$('gameSort').onchange=renderGame;$('gameMin').oninput=renderGame;$('gameSearch').oninput=renderGame;$('exportGame').onclick=()=>download('win-lose-all-game.csv',csv(renderGame(),['id','game','winlose','source']));
renderGames();renderSafety();}
async function boot(){wire();const db=loadDB();state.safety=db.safety||[]; if(!authHash()){show('setupGate',true)}else{show('loginGate',true)} $('setupForm').onsubmit=async e=>{e.preventDefault();const a=$('setupPassword').value,b=$('setupPassword2').value;if(a.length<8||a!==b){$('setupError').textContent='Password minimal 8 karakter dan harus sama.';return}await setAuth(a);show('setupGate',false);show('app',true);$('setupPassword').value='';$('setupPassword2').value=''};$('loginForm').onsubmit=async e=>{e.preventDefault();if(await checkAuth($('loginPassword').value)){show('loginGate',false);show('app',true);$('loginPassword').value='';$('loginError').textContent=''}else $('loginError').textContent='Password salah.'};}
window.WorkingToolsCore={parseNum,memberId,dateKey,dtValue,rowsFromText,parseGenericRows,classifyDeposit,classifyBonus,exclusionFlags,parseExclusions,auditBonus,parseFirstDeposits,parseRanking,GAMES};
if(!window.__WT_TEST__) boot();
})();
