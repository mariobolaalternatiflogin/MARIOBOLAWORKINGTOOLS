import {auditBonuses,processDailyBonus,parseReport} from './parser.js';
const EXAMPLE_QR=`| | **User Name** | **From Bank** | **To Bank** | **Amount** | **Reference** | **RRN** | **Date** | **Payment Method** | **Status** | **Invoice** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|PrabuPay<br>mariobola_oauser<br>id|**500.000**|17900064366235456||22/09/2026 12:00:37 AM|QR Pay|Confirmed|View|22/09/2026 12:01:23 AM||QRPay User|
|2|BEB\\@Copler27|BCA<br>Ismail Nadhom<br>1012091804|PrabuPay<br>mariobola_oauser<br>id|**200.000**|17900064916815972||22/09/2026 12:01:33 AM|QR Pay|Confirmed|View|22/09/2026 12:02:11 AM||QRPay User|
|3|BEB\\@msptra55|GO PAY<br>Muhamadsaputra<br>08**98013***|PrabuPay<br>mariobola_oauser<br>id|**60.000**|17900064936129568||22/09/2026 12:01:33 AM|QR Pay|Confirmed|View|22/09/2026 12:03:00 AM||QRPay User|
|4|BEB\\@Wakleng123|BNI<br>Sufriyadi<br>1888017846|PrabuPay<br>mariobola_oauser<br>id|**300.000**|17900065612387334||22/09/2026 12:02:41 AM|QR Pay|Confirmed|View|22/09/2026 12:03:19 AM||QRPay User|
|5|BEB\\@bily12|DANA<br>pipit<br>08**15990***|PrabuPay<br>mariobola_oauser<br>id|**50.000**|17900065329696942||22/09/2026 12:02:14 AM|QR Pay|Confirmed|View|22/09/2026 12:03:33 AM||QRPay User|`;
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
let checkRows=[], inputRows=[], checkFilter='pending';
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function loadHidden(key){try{const raw=localStorage.getItem(key);const list=JSON.parse(raw||'[]');return new Set(Array.isArray(list)?list.map(String):[]);}catch{return new Set();}}
function saveHidden(key,set){try{localStorage.setItem(key,JSON.stringify([...set]));}catch{}}
function getHiddenSet(key){return loadHidden(key);}
function isBlacklisted(r){return /SAFETY BET|(^|[^A-Z])SB([^A-Z]|$)|NO BONUS|TIDAK MAU BONUS|(^|[^A-Z])NB([^A-Z]|$)|BATAL WD|WD DIKEMBALIKAN KE MEMBER|MEMBER LANJUT MAIN|WD DIKEMBALIKAN MEMBER LANJUT MAIN/i.test(String(r?.remarkStatus||''));}
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
  return `<tr class="${black?'blacklist-row ':''}${mistakeDouble?'attention-row':''}" title="${black?'BLACKLIST: jangan berikan bonus untuk member ini.':''}">
    <td class="username-cell"><b>${escapeHtml(r.username)}</b></td>
    <td>${money(r.depositAmount)}</td>
    <td class="bonus-expected-cell"><span class="bonus-expected">${money(r.expectedBonus)}</span></td>
    <td class="bonus-given-cell"><span class="bonus-given">${money(r.givenBonus)}</span></td>
    <td><span class="status ${statusClass(r.status)}">${escapeHtml(r.status)}</span></td>
    <td><span class="pill ${r.doubleBonus?'yes':'no'}">${r.doubleBonus?'YA':'TIDAK'}</span></td>
    <td>${black?'<span class="blacklist-badge">BLACKLIST</span> ':''}${escapeHtml(r.remarkStatus)}</td>
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
  const ex=e.target.closest('[data-example]');
  if(ex){const type=ex.dataset.example;if(type==='qr')$('#qrText').value=EXAMPLE_QR;else{$('#historyText').value=EXAMPLE_HISTORY;$('#inputHistory').value=EXAMPLE_HISTORY;}}
});
document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#tab-'+btn.dataset.tab).classList.add('active');});
function tick() {
  const now = new Date();

  const jakartaTime = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);

  $('#clock').textContent = jakartaTime + ' WIB';
}

tick();
setInterval(tick, 1000);
updateFilterButtons();
