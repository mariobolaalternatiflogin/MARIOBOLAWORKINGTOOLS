import {auditBonuses,processDailyBonus,parseReport} from './parser.js';
import {parseNewMembers,processNewMemberFirstDeposit,sortMemberFirstDepositRows,SAFETY_REASONS,normalizeSafetyRecord} from './member.js';
import {readXlsxReport} from './xlsx-lite.js';
import {processCashbackReports,deriveGameName,displayLoss,excelLoss,CASHBACK_THRESHOLD_RP} from './cashback.js';
const EXAMPLE_QR=`| | **User Name** | **From Bank** | **To Bank** | **Amount** | **Reference** | **RRN** | **Date** | **Payment Method** | **Status** | **Invoice** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|PrabuPay<br>mariobola_oauser<br>id|**500.000**|17900064366235456||22/09/2026 12:00:37 AM|QR Pay|Confirmed|View|22/09/2026 12:01:23 AM||QRPay User|
|2|BEB\\@Copler27|BCA<br>Ismail Nadhom<br>1012091804|PrabuPay<br>mariobola_oauser<br>id|**200.000**|17900064916815972||22/09/2026 12:01:33 AM|QR Pay|Confirmed|View|22/09/2026 12:02:11 AM||QRPay User|
|3|BEB\\@msptra55|GO PAY<br>Muhamadsaputra<br>08**98013***|PrabuPay<br>mariobola_oauser<br>id|**60.000**|17900064936129568||22/09/2026 12:01:33 AM|QR Pay|Confirmed|View|22/09/2026 12:03:00 AM||QRPay User|
|4|BEB\\@Wakleng123|BNI<br>Sufriyadi<br>1888017846|PrabuPay<br>mariobola_oauser<br>id|**300.000**|17900065612387334||22/09/2026 12:02:41 AM|QR Pay|Confirmed|View|22/09/2026 12:03:19 AM||QRPay User|
|5|BEB\\@bily12|DANA<br>pipit<br>08**15990***|PrabuPay<br>mariobola_oauser<br>id|**50.000**|17900065329696942||22/09/2026 12:02:14 AM|QR Pay|Confirmed|View|22/09/2026 12:03:33 AM||QRPay User|`;
const EXAMPLE_NEW_MEMBERS=`| ** ** | **Register Date** | **User Name** | **Full Name** | **Contact Number** | **Mobile Phone Number** | **E_mail** | **Bank Name** | **Account Name** | **Account Number** | **Suspend** | **Status** |
|---|---|---|---|---|---|---|---|---|---|---|---|
|1|9/22/2026 10:21:30 PM|BEB\@gacok212104|*****|*******36272||*****ek\@gmail.com|GO PAY|MHD AGUNG KURNIAWAN|08388614335|No|Open|
|2|9/22/2026 9:45:39 PM|BEB\@Mamatdong8|******* pratama|*******54810||*******ernado810\@gmail.com|SEABANK|Irdatam pratama|901096837550|No|Open|`;
const EXAMPLE_HISTORY=`| ** ** | **User Name** | **From Bank** | **To Bank** | **Amount** | **Date** | **Payment Method** | **Status** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**25.000**|22/09/2026 12:03:28 AM|Agent Deposit|Confirmed|22/09/2026 12:03:57 AM||beb\\@mario08|
|2|BEB\\@Copler27|BCA<br>Ismail Nadhom<br>1012091804|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**10.000**|22/09/2026 12:03:45 AM|Agent Deposit|Confirmed|22/09/2026 12:03:57 AM||beb\\@mario08|
|3|BEB\\@msptra55|GO PAY<br>Muhamadsaputra<br>08**98013***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**3.000**|22/09/2026 12:03:53 AM|Agent Deposit|Confirmed|22/09/2026 12:03:58 AM||beb\\@mario08|
|4|BEB\\@Wakleng123|BNI<br>Sufriyadi<br>1888017846|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**15.000**|22/09/2026 12:04:12 AM|Agent Deposit|Confirmed|22/09/2026 12:04:24 AM||beb\\@mario08|
|5|BEB\\@bily12|DANA<br>pipit<br>08**15990***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**2.500**|22/09/2026 12:04:21 AM|Agent Deposit|Confirmed|22/09/2026 12:04:28 AM||beb\\@mario08|`;
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID').format(n||0);
const statusClass=s=>s==='SESUAI'?'good':s==='MISTAKE'?'warn':(s.includes('BELUM')||s.includes('BLOKIR'))?'bad':'muted';
const HIDDEN_CHECK_KEY='working-tools-bonus.hiddenCheckUsernames.v1';
const HIDDEN_INPUT_KEY='working-tools-bonus.hiddenInputUsernames.v1';
const SAFETY_KEY='working-tools-member.safetyMembers.v1';
const HIDDEN_NEW_MEMBER_KEY='working-tools-member.hiddenNewMemberUsernames.v1';
let checkRows=[], inputRows=[], checkFilter='pending', safetyMembers=[], newMemberRows=[], newMemberDateFilter='all', cashbackReports=[], cashbackRows=[], cashbackGameFilter='all';
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function loadHidden(key){try{const raw=localStorage.getItem(key);const list=JSON.parse(raw||'[]');return new Set(Array.isArray(list)?list.map(String):[]);}catch{return new Set();}}
function saveHidden(key,set){try{localStorage.setItem(key,JSON.stringify([...set]));}catch{}}
function getHiddenSet(key){return loadHidden(key);}
function loadSafetyMembers(){try{const raw=localStorage.getItem(SAFETY_KEY);const list=JSON.parse(raw||'[]');return Array.isArray(list)?list:[];}catch{return []}}
function saveSafetyMembers(){try{localStorage.setItem(SAFETY_KEY,JSON.stringify(safetyMembers));}catch{}}
function safetyMap(){return new Map(safetyMembers.map(x=>[String(x.key||x.username).toUpperCase(),x]));}
function applySafetyBlacklist(rows){const map=safetyMap();for(const r of rows){const e=map.get(String(r.username||'').toUpperCase());if(e)r.safetyBlacklist=e;}return rows;}
function isBlacklisted(r){if(r?.safetyBlacklist)return true; return /SAFETY BET|(^|[^A-Z])SB([^A-Z]|$)|NO BONUS|TIDAK MAU BONUS|(^|[^A-Z])NB([^A-Z]|$)|BATAL WD|WD DIKEMBALIKAN KE MEMBER|MEMBER LANJUT MAIN|WD DIKEMBALIKAN MEMBER LANJUT MAIN/i.test(String(r?.remarkStatus||''));}
function matchesCheckFilter(r){
  if(checkFilter==='all') return true;
  if(checkFilter==='pending') return /BELUM DIBERIKAN/i.test(String(r.status||'')) || isBlacklisted(r);
  if(checkFilter==='mistake') return r.status==='MISTAKE';
  if(checkFilter==='double') return !!r.doubleBonus;
  return true;
}
function rowHtml(r,index){
  const black=isBlacklisted(r);
  const mistakeDouble=r.status==='MISTAKE' || r.doubleBonus;
  const blacklistReason=r.safetyBlacklist?.reason||'';
  const blacklistNote=r.safetyBlacklist?.note||'';
  const statusText=black?'DI BLACKLIST MEMBER SB':r.status;
  const statusTone=black?'blacklist':statusClass(r.status);
  const remarkHtml=black
    ? `<div class="blacklist-message"><span class="blacklist-badge">DI BLACKLIST MEMBER SB</span><b>${escapeHtml(blacklistReason||'Blacklist member')}</b>${blacklistNote?`<span class="blacklist-note">${escapeHtml(blacklistNote)}</span>`:''}</div>`
    : escapeHtml(r.remarkStatus);
  return `<tr class="${black?'blacklist-row ':''}${mistakeDouble?'attention-row':''}" title="${black?'BLACKLIST: jangan berikan bonus untuk member ini.':''}">
    <td class="username-cell"><b>${escapeHtml(r.username)}</b></td>
    <td>${money(r.depositAmount)}</td>
    <td class="bonus-expected-cell"><span class="bonus-expected">${money(r.expectedBonus)}</span></td>
    <td class="bonus-given-cell"><span class="bonus-given">${money(r.givenBonus)}</span></td>
    <td><span class="status ${statusTone}">${escapeHtml(statusText)}</span></td>
    <td><span class="pill ${r.doubleBonus?'yes':'no'}">${r.doubleBonus?'YA':'TIDAK'}</span></td>
    <td>${remarkHtml}</td>
    <td>${escapeHtml(r.depositDate)}</td>
    <td><button class="hide-btn" data-hide-check="${index}">Sembunyikan</button></td>
  </tr>`;
}
function renderCheck(){
  const tb=$('#checkTable tbody');
  const hiddenNames=getHiddenSet(HIDDEN_CHECK_KEY);
  const currentRows=checkRows;
  const visible=currentRows.filter(r=>!hiddenNames.has(String(r.username))).filter(matchesCheckFilter);
  const hidden=currentRows.filter(r=>hiddenNames.has(String(r.username)));
  const pending=currentRows.filter(r=>/BELUM DIBERIKAN/i.test(String(r.status||''))).length;
  const mistakes=currentRows.filter(r=>r.status==='MISTAKE').length;
  const doubles=currentRows.filter(r=>r.doubleBonus).length;
  $('#checkSummary').innerHTML=`<span>${visible.length} tampil • ${hidden.length} disembunyikan</span> <span class="summary-counts">| Belum ${pending} • Mistake ${mistakes} • Double ${doubles} • Disaring ${currentRows.suppressedDeposits||0} deposit berulang (tanggal sama)</span>`;
  tb.innerHTML=visible.length?visible.map(r=>rowHtml(r,currentRows.indexOf(r))).join(''):'<tr><td colspan="9" class="empty">Tidak ada hasil pada filter yang dipilih.</td></tr>';
  $('#hiddenCheck').innerHTML=hidden.length?`<div class="hidden-title">Username yang disembunyikan — tetap tersembunyi saat data baru diproses (${hidden.length})</div><div class="hidden-items">${hidden.map(r=>`<div class="hidden-item"><b>${escapeHtml(r.username)}</b><span>Deposit ${money(r.depositAmount)} • ${escapeHtml(r.status)}</span><button class="hide-btn" data-show-check="${currentRows.indexOf(r)}">Munculkan</button></div>`).join('')}</div>`:'';
}
function renderInput(){
  const tb=$('#inputTable tbody');
  const hiddenNames=getHiddenSet(HIDDEN_INPUT_KEY);
  const currentRows=inputRows;
  const visible=currentRows.filter(r=>!hiddenNames.has(String(r.username)));
  const hidden=currentRows.filter(r=>hiddenNames.has(String(r.username)));
  const dates=[...new Set(currentRows.map(r=>r.calendarDate).filter(Boolean))];
  const dateText=dates.length===1?`Tanggal ${dates[0]}`:(dates.length>1?`${dates.length} tanggal terdeteksi`:'Tanggal tidak terbaca');
  const doubles=currentRows.filter(r=>r.doubleBonus).length;
  $('#inputSummary').textContent=`${visible.length} baris tampil • ${hidden.length} disembunyikan • ${doubles} transaksi berada pada username yang mendapat bonus lebih dari 1× pada tanggal yang sama • ${dateText}`;
  tb.innerHTML=visible.length?visible.map(r=>`<tr${r.doubleBonus?' class="duplicate-bonus-row"':''}><td class="username-cell input-username-cell"><b>${escapeHtml(r.username)}</b><button class="row-hide-icon" type="button" data-hide-input="${currentRows.indexOf(r)}" title="Sembunyikan username ini">×</button></td><td class="bonus-expected-cell"><span class="bonus-expected">${String(Math.trunc(Number(r.amount)||0))}</span></td></tr>`).join(''):'<tr><td colspan="2" class="empty">Tidak ada data bonus harian yang tampil.</td></tr>';
  $('#hiddenInput').innerHTML=hidden.length?`<div class="hidden-title">Username yang disembunyikan — tetap tersembunyi saat data baru diproses (${hidden.length})</div><div class="hidden-items">${hidden.map(r=>`<div class="hidden-item"><b>${escapeHtml(r.username)}</b><span>${String(Math.trunc(Number(r.amount)||0))} • ${escapeHtml(r.date)}</span><button class="hide-btn" data-show-input="${currentRows.indexOf(r)}">Munculkan</button></div>`).join('')}</div>`:'';
}
function updateFilterButtons(){document.querySelectorAll('[data-check-filter]').forEach(b=>b.classList.toggle('active',b.dataset.checkFilter===checkFilter));}
$('#processCheck').onclick=()=>{
  const qr=$('#qrText').value.trim(), h=$('#historyText').value.trim();
  if(!qr||!h){$('#checkSummary').textContent='Dua sumber wajib diisi.';return;}
  const qrParsed=parseReport(qr,'qrpay'), historyParsed=parseReport(h,'deposit-history');
  const rows=auditBonuses(qr,h,{rate:Number($('#rate').value)/100});
  applySafetyBlacklist(rows);
  const hiddenNames=getHiddenSet(HIDDEN_CHECK_KEY);
  rows.forEach(r=>{r.hidden=hiddenNames.has(String(r.username));});
  checkRows=rows;
  renderCheck();
  $('#checkSummary').innerHTML=`<span>QRPay terbaca ${qrParsed.length} transaksi • History terbaca ${historyParsed.length} transaksi • ${checkRows.length} periode bonus</span> <span class="summary-counts">| Filter: <b>${$('#checkFilterLabel').textContent}</b></span>`;
  setTimeout(renderCheck,0);
};
$('#clearCheck').onclick=()=>{
  $('#qrText').value='';$('#historyText').value='';checkRows=[];renderCheck();
  $('#checkSummary').textContent='Data hasil dibersihkan. Username yang sudah disembunyikan tetap tersimpan dan akan tetap tersembunyi pada data berikutnya.';
};
$('#processInput').onclick=()=>{
  const h=$('#inputHistory').value.trim();
  if(!h){$('#inputSummary').textContent='Data Deposit Request History wajib diisi.';return;}
  const parsed=parseReport(h,'deposit-history');
  const result=processDailyBonus(h,{sort:$('#sort').value});
  const hiddenNames=getHiddenSet(HIDDEN_INPUT_KEY);
  result.rows.forEach(r=>{r.hidden=hiddenNames.has(String(r.username));});
  inputRows=result.rows;
  renderInput();
  const dateText=result.distinctDates.length===1?` tanggal ${result.distinctDates[0]}`:(result.distinctDates.length?` pada ${result.distinctDates.length} tanggal`:'');
  $('#inputSummary').textContent=`History terbaca ${parsed.length} transaksi • ${inputRows.length} bonus harian Confirmed${dateText} • ${result.duplicateCount} transaksi double username/tanggal`;
};
$('#copyInput').onclick=async()=>{
  const hiddenNames=getHiddenSet(HIDDEN_INPUT_KEY);
  // EXACTLY TWO EXCEL COLUMNS: username + integer nominal. No thousands separators, no decimals.
  const txt=inputRows.filter(r=>!hiddenNames.has(String(r.username))).map(r=>`${r.username}\t${Math.trunc(Number(r.amount)||0)}`).join('\n');
  if(!txt)return;
  try{await navigator.clipboard.writeText(txt);$('#inputSummary').textContent=`Hasil 2 kolom berhasil disalin ke Excel: ${txt.split('\n').length} baris.`;}catch{$('#inputSummary').textContent='Clipboard browser tidak tersedia. Gunakan salin manual dari hasil 2 kolom.';}
};
document.addEventListener('click',e=>{
  const filter=e.target.closest('[data-check-filter]');
  if(filter){checkFilter=filter.dataset.checkFilter;$('#checkFilterLabel').textContent=filter.textContent.trim();updateFilterButtons();renderCheck();return;}
  const b=e.target.closest('[data-hide-check]');
  if(b){const row=checkRows[Number(b.dataset.hideCheck)];if(row){const s=getHiddenSet(HIDDEN_CHECK_KEY);s.add(String(row.username));saveHidden(HIDDEN_CHECK_KEY,s);row.hidden=true;}renderCheck();}
  const bs=e.target.closest('[data-show-check]');
  if(bs){const row=checkRows[Number(bs.dataset.showCheck)];if(row){const s=getHiddenSet(HIDDEN_CHECK_KEY);s.delete(String(row.username));saveHidden(HIDDEN_CHECK_KEY,s);row.hidden=false;}renderCheck();}
  const c=e.target.closest('[data-hide-input]');
  if(c){const row=inputRows[Number(c.dataset.hideInput)];if(row){const s=getHiddenSet(HIDDEN_INPUT_KEY);s.add(String(row.username));saveHidden(HIDDEN_INPUT_KEY,s);row.hidden=true;}renderInput();}
  const cs=e.target.closest('[data-show-input]');
  if(cs){const row=inputRows[Number(cs.dataset.showInput)];if(row){const s=getHiddenSet(HIDDEN_INPUT_KEY);s.delete(String(row.username));saveHidden(HIDDEN_INPUT_KEY,s);row.hidden=false;}renderInput();}
  const cn=e.target.closest('[data-show-new-member]');
  if(cn){const row=newMemberRows[Number(cn.dataset.showNewMember)];if(row){const s=getHiddenSet(HIDDEN_NEW_MEMBER_KEY);s.delete(String(row.username));saveHidden(HIDDEN_NEW_MEMBER_KEY,s);row.hidden=false;}renderFirstDeposit();}
  const ex=e.target.closest('[data-example]');
  if(ex){const type=ex.dataset.example;if(type==='qr')$('#qrText').value=EXAMPLE_QR;else if(type==='history'){$('#historyText').value=EXAMPLE_HISTORY;$('#inputHistory').value=EXAMPLE_HISTORY;$('#fdHistoryText').value=EXAMPLE_HISTORY;}else if(type==='newmembers')$('#newMembersText').value=EXAMPLE_NEW_MEMBERS;}
});
function setSection(tab){
  const map={check:['1. BONUS','Cek bonus dan input bonus harian — parser tetap menggunakan data transaksi dari browser.'],input:['1. BONUS','Input bonus harian — ambil seluruh SCB A BONUS DEPOSIT HARIAN.'],safety:['2. MEMBER','Daftar Member Safety Bet — daftar tersimpan sebagai blacklist lintas proses bonus/cashback.'],firstDeposit:['2. MEMBER','New Member First Deposit — cocokkan New Members dengan deposit tanggal yang sama.'],cashback:['3. CASHBACK MINGGUAN','Cashback Mingguan Slot — baca laporan Excel game, ambil kekalahan minimal Rp500.000.']};
  const cfg=map[tab]||map.check;
  $('#sectionTitle').textContent=cfg[0]; $('#sectionDesc').textContent=cfg[1];
}
function renderSafety(){
  const tb=$('#safetyTable tbody');
  $('#safetySummary').textContent=`${safetyMembers.length} member tersimpan sebagai Safety Bet / blacklist.`;
  tb.innerHTML=safetyMembers.length?safetyMembers.map((r,i)=>`<tr class="blacklist-row"><td class="username-cell"><b>${escapeHtml(r.username)}</b></td><td><span class="blacklist-badge">${escapeHtml(r.reason)}</span></td><td>${escapeHtml(r.note||'—')}</td><td><button class="hide-btn" data-delete-safety="${i}">Hapus</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">Belum ada daftar Safety Bet.</td></tr>';
}
function renderCashbackGameFilter(){
  const sel=$('#cashbackGameFilter');
  if(!sel)return;
  const games=[...new Set(cashbackReports.map(r=>r.game).filter(Boolean))];
  const current=(cashbackGameFilter==='all'||games.includes(cashbackGameFilter))?cashbackGameFilter:'all';
  sel.innerHTML='<option value="all">SEMUA GAME</option>'+games.slice(0,6).map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
  sel.value=current; cashbackGameFilter=current;
}
function renderCashback(){
  const tb=$('#cashbackTable tbody');
  if(!tb)return;
  const rows=cashbackRows;
  tb.innerHTML=rows.length?rows.map(r=>`<tr><td class="username-cell cashback-username"><b>${escapeHtml(r.username)}</b></td><td class="cashback-loss-cell"><span>${escapeHtml(displayLoss(r.rawLoss))}</span></td></tr>`).join(''):'<tr><td colspan="2" class="empty">Belum ada hasil. Upload file Excel lalu klik PROSES CASHBACK.</td></tr>';
  const selected=cashbackGameFilter==='all'?'SEMUA GAME':cashbackGameFilter;
  const games=[...new Set(cashbackReports.map(r=>r.game).filter(Boolean))];
  $('#cashbackSummary').textContent=`${cashbackReports.length} file terbaca • ${games.length} game terdeteksi • Filter ${selected} • ${rows.length} username memenuhi kekalahan minimal Rp500.000.`;
  $('#cashbackFilesSummary').innerHTML=cashbackReports.length?cashbackReports.map(r=>`<div class="cashback-file-item"><b>${escapeHtml(r.game)}</b><span>${escapeHtml(r.fileName)}</span><em>${r.rows.length} baris data</em></div>`).join(''):'<span>Belum ada file.</span>';
}
async function loadCashbackFiles(files){
  const list=[...files].filter(f=>/\.xlsx$/i.test(f.name));
  if(!list.length){$('#cashbackSummary').textContent='File yang didukung untuk Cashback Mingguan Slot adalah .xlsx.';return;}
  const groups=new Map();
  for(const file of list){
    const game=deriveGameName(file.name);
    const key=`${file.name}__${game}`;
    try{
      const parsed=await readXlsxReport(file);
      groups.set(key,{fileName:file.name,game,rows:parsed.rows,sheet:parsed.sheet});
    }catch(err){
      $('#cashbackSummary').textContent=`Gagal membaca ${file.name}: ${err.message||err}`;
    }
  }
  const uniqueGames=[...new Set([...groups.values()].map(r=>r.game))];
  if(uniqueGames.length>6){
    $('#cashbackSummary').textContent='Maksimal 6 game unik dapat digunakan pada Cashback Mingguan Slot.';
    return;
  }
  cashbackReports=[...groups.values()];
  renderCashbackGameFilter();
  const result=processCashbackReports(cashbackReports,cashbackGameFilter);
  cashbackRows=result.rows;
  renderCashback();
}
$('#processCashback').onclick=async()=>{
  const input=$('#cashbackFiles');
  if(!input.files?.length){$('#cashbackSummary').textContent='Silakan upload minimal 1 file Excel (.xlsx).';return;}
  $('#cashbackSummary').textContent='Membaca file Excel...';
  await loadCashbackFiles(input.files);
};
$('#cashbackGameFilter').onchange=()=>{cashbackGameFilter=$('#cashbackGameFilter').value;cashbackRows=processCashbackReports(cashbackReports,cashbackGameFilter).rows;renderCashback();};
$('#copyCashback').onclick=async()=>{
  const txt=cashbackRows.map(r=>`${r.username}\t${excelLoss(r.rawLoss)}`).join('\n');
  if(!txt)return;
  try{await navigator.clipboard.writeText(txt);$('#cashbackSummary').textContent=`Hasil 2 kolom berhasil disalin ke Excel: ${cashbackRows.length} baris.`;}catch{$('#cashbackSummary').textContent='Clipboard browser tidak tersedia. Salin manual dari tabel hasil.';}
};
$('#clearCashback').onclick=()=>{$('#cashbackFiles').value='';cashbackReports=[];cashbackRows=[];cashbackGameFilter='all';renderCashbackGameFilter();renderCashback();$('#cashbackSummary').textContent='Data cashback dibersihkan.';};

function renderFirstDeposit(){
  const hiddenSet=getHiddenSet(HIDDEN_NEW_MEMBER_KEY);
  const base=newMemberRows.filter(r=>!hiddenSet.has(String(r.username)));
  const filtered=newMemberDateFilter==='all'?base:base.filter(r=>r.calendarDate===newMemberDateFilter);
  const sorted=sortMemberFirstDepositRows(filtered,$('#firstDepositSort').value);
  const hidden=newMemberRows.filter(r=>hiddenSet.has(String(r.username)));
  const tb=$('#firstDepositTable tbody');
  tb.innerHTML=sorted.length?sorted.map((r,i)=>`<tr><td class="row-number-cell">${i+1}</td><td>${escapeHtml(r.registerDateRaw)}</td><td class="username-cell"><b>${escapeHtml(r.username)}</b></td><td class="bonus-expected-cell"><span class="bonus-expected ${Number(r.depositAmount)>0?'deposit-positive':'deposit-zero'}">${Math.trunc(Number(r.depositAmount)||0)}</span></td></tr>`).join(''):'<tr><td colspan="4" class="empty">Belum ada New Member pada hasil yang dipilih.</td></tr>';
  const dates=[...new Set(newMemberRows.map(r=>r.calendarDate).filter(Boolean))].sort();
  $('#firstDepositDateFilter').innerHTML='<option value="all">Semua tanggal</option>'+dates.map(d=>`<option value="${d}">${d}</option>`).join('');
  $('#firstDepositDateFilter').value=newMemberDateFilter;
  $('#firstDepositSummary').textContent=`${sorted.length} tampil • ${newMemberRows.length} New Member terbaca • ${hidden.length} disembunyikan • Ada deposit ${newMemberRows.filter(r=>Number(r.depositAmount)>0).length} • Tanpa deposit ${newMemberRows.filter(r=>Number(r.depositAmount)===0).length}${newMemberDateFilter==='all'?'':' • Filter '+newMemberDateFilter}`;
  $('#hiddenNewMember').innerHTML=hidden.length?`<div class="hidden-title">Username yang disembunyikan — tetap tersembunyi saat data baru diproses (${hidden.length})</div><div class="hidden-items">${hidden.map(r=>`<div class="hidden-item"><b>${escapeHtml(r.username)}</b><span>${escapeHtml(r.registerDateRaw)} • ${Math.trunc(Number(r.depositAmount)||0)}</span><button class="hide-btn" data-show-new-member="${newMemberRows.indexOf(r)}">Munculkan</button></div>`).join('')}</div>`:'';
}
$('#addSafety').onclick=()=>{
  const username=$('#safetyUsername').value.trim(); const reason=$('#safetyReason').value; const note=$('#safetyNote').value.trim();
  if(!username){$('#safetySummary').textContent='USERNAME wajib diisi.';return;}
  const rec=normalizeSafetyRecord({username,reason,note});
  const idx=safetyMembers.findIndex(x=>x.key===rec.key);
  if(idx>=0)safetyMembers[idx]=rec; else safetyMembers.push(rec);
  saveSafetyMembers(); renderSafety(); $('#safetyUsername').value='';$('#safetyNote').value='';
  applySafetyBlacklist(checkRows); if(checkRows.length)renderCheck();
};
$('#clearSafetyForm').onclick=()=>{$('#safetyUsername').value='';$('#safetyReason').value=SAFETY_REASONS[0];$('#safetyNote').value='';};
document.addEventListener('click',e=>{
  const ds=e.target.closest('[data-delete-safety]');
  if(ds){safetyMembers.splice(Number(ds.dataset.deleteSafety),1);saveSafetyMembers();renderSafety();applySafetyBlacklist(checkRows);renderCheck();} 
});
$('#processFirstDeposit').onclick=()=>{
  const nm=$('#newMembersText').value.trim(), qr=$('#fdQrText').value.trim(), hist=$('#fdHistoryText').value.trim();
  if(!nm||(!qr&&!hist)){ $('#firstDepositSummary').textContent='New Members wajib diisi dan minimal salah satu sumber deposit harus diisi.'; return;}
  const result=processNewMemberFirstDeposit(nm,qr,hist); newMemberRows=result.rows; newMemberDateFilter='all'; renderFirstDeposit();
  $('#firstDepositSummary').textContent=`New Members terbaca ${result.memberCount} • QRPay terbaca ${result.qrCount} • History terbaca ${result.historyCount} • Deposit ditemukan ${result.matchedCount} • Tidak deposit ${result.noDepositCount}. Semua New Member tetap ditampilkan sesuai urutan Register Date.`;
};
$('#clearFirstDeposit').onclick=()=>{$('#newMembersText').value='';$('#fdQrText').value='';$('#fdHistoryText').value='';newMemberRows=[];newMemberDateFilter='all';renderFirstDeposit();$('#firstDepositSummary').textContent='Data hasil dibersihkan.';};
$('#copyFirstDeposit').onclick=async()=>{const hidden=getHiddenSet(HIDDEN_NEW_MEMBER_KEY);const filtered=newMemberRows.filter(r=>!hidden.has(String(r.username))).filter(r=>newMemberDateFilter==='all'||r.calendarDate===newMemberDateFilter);const sorted=sortMemberFirstDepositRows(filtered,$('#firstDepositSort').value);const txt=sorted.map((r,i)=>`${i+1}\t${r.registerDateRaw}\t${r.username}\t${Math.trunc(Number(r.depositAmount)||0)}`).join('\n');if(!txt)return;try{await navigator.clipboard.writeText(txt);$('#firstDepositSummary').textContent=`Hasil 4 kolom berhasil disalin ke Excel: ${sorted.length} baris.`;}catch{$('#firstDepositSummary').textContent='Clipboard browser tidak tersedia. Salin manual dari tabel hasil.';}};
$('#firstDepositDateFilter').onchange=()=>{newMemberDateFilter=$('#firstDepositDateFilter').value;renderFirstDeposit();};
$('#firstDepositSort').onchange=()=>{renderFirstDeposit();};
function tick(){const now=new Date();const t=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);$('#clock').textContent=t+' WIB';}tick();setInterval(tick,1000);
document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#tab-'+btn.dataset.tab).classList.add('active');setSection(btn.dataset.tab);});
$('#safetyReason').innerHTML=SAFETY_REASONS.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
safetyMembers=loadSafetyMembers();renderSafety();renderFirstDeposit();updateFilterButtons();setSection('check');
