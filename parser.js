export const CONFIG = {
  defaultBonusRate: 0.05,
  maxBonusAmount: 100000,
  matchingWindowHours: 24, // legacy compatibility only; audit uses calendar dates, not rolling hours
  bonusTarget: 'SCB A BONUS DEPOSIT HARIAN',
  memberDepositToBanks: ['DANA','BCA','MANDIRI','BNI','BRI','DANAMON','GOPAY','GO PAY','LINKAJA','OVO'],
  excludedRemarks: [
    'SAFETY BET','SB','NO BONUS','TIDAK MAU BONUS','NB','BATAL WD',
    'WD DIKEMBALIKAN KE MEMBER','MEMBER LANJUT MAIN','WD DIKEMBALIKAN MEMBER LANJUT MAIN'
  ]
};

function clean(s='') {
  return String(s).replace(/<br\s*\/?\s*>/gi,'\n').replace(/&nbsp;/gi,' ').replace(/\\@/g,'@').trim();
}
function norm(s='') { return clean(s).replace(/\s+/g,' ').trim().toUpperCase(); }
export function parseAmount(value) {
  let s = clean(value).replace(/[^0-9,.-]/g,'');
  if (!s) return 0;
  // Report convention: 5,000.000 / 500.000 means integer thousands.
  if (/^-?\d{1,3}(?:[.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g,''));
  if (s.includes(',') && s.includes('.')) return Number(s.replace(/[.,]/g,''));
  if (s.includes('.')) return Number(s.replace(/\./g,''));
  if (s.includes(',')) return Number(s.replace(/,/g,''));
  return Number(s) || 0;
}
export function parseDateTime(value) {
  const s=clean(value).replace(/\s+/g,' ');
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
  if(!m) return null;
  let [,d,mo,y,h,mi,se,ampm]=m; h=Number(h);
  if(ampm){ const a=ampm.toUpperCase(); if(a==='PM'&&h<12)h+=12; if(a==='AM'&&h===12)h=0; }
  return new Date(Date.UTC(Number(y),Number(mo)-1,Number(d),h,Number(mi),Number(se)));
}
export function formatDateTime(value) {
  const d=value instanceof Date?value:parseDateTime(value); if(!d)return clean(value);
  let h=d.getUTCHours(), ap=h>=12?'PM':'AM'; h=h%12||12;
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()} ${h}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')} ${ap}`;
}
function splitCell(cell){ return clean(cell).split(/\n+/).map(x=>x.trim()).filter(Boolean); }
function isSeparatorRow(cells){ return cells.every(c=>/^\s*:?-{3,}:?\s*$/.test(c)); }
function splitTableLine(line){
  let s=line.trim(); if(s.startsWith('|'))s=s.slice(1); if(s.endsWith('|'))s=s.slice(0,-1);
  return s.split('|').map(clean);
}
function parseMarkdownTable(text){
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const headerIndex=lines.findIndex(l=>/^\|.*\|$/.test(l) && /User Name/i.test(l));
  if(headerIndex<0 || headerIndex+1>=lines.length) return [];
  const headers=splitTableLine(lines[headerIndex]).map(h=>h.replace(/\*\*/g,''));
  const rows=[];
  for(let i=headerIndex+1;i<lines.length;i++){
    if(!/^\|.*\|$/.test(lines[i])) continue;
    const cells=splitTableLine(lines[i]);
    if(cells.length!==headers.length || isSeparatorRow(cells)) continue;
    const obj={}; headers.forEach((h,j)=>obj[h]=cells[j]??''); rows.push(obj);
  }
  return rows;
}
function parseTSV(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  const idx=lines.findIndex(l=>/User Name/i.test(l)&&/Amount/i.test(l)); if(idx<0)return [];
  const headers=lines[idx].split(/\t+/).map(clean);
  return lines.slice(idx+1).map(line=>{
    const c=line.split(/\t+/).map(clean); if(c.length<headers.length-1)return null;
    const o={};headers.forEach((h,i)=>o[h]=c[i]??'');return o;
  }).filter(Boolean);
}

function rowStart(line){
  // Browser copy from the report commonly starts each visual row with the row number,
  // followed by the member username. Cells containing <br> are then emitted as extra lines.
  return /^\s*\d{1,8}\s+(?:BEB@|[A-Za-z0-9_.-]+@)/i.test(line);
}
function browserRowBlocks(text){
  const lines=clean(text).replace(/\r/g,'').split('\n');
  const blocks=[]; let current=[];
  for(const line of lines){
    if(rowStart(line)){
      if(current.length) blocks.push(current.join('\n'));
      current=[line];
    } else if(current.length){
      current.push(line);
    }
  }
  if(current.length) blocks.push(current.join('\n'));
  return blocks;
}
function firstDate(text){
  return clean(text).match(/\b\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\b/i)?.[0] || '';
}
function allAmountTokens(text){
  return [...clean(text).matchAll(/(?<![\d/])\d{1,3}(?:[.,]\d{3})+(?!\d)/g)].map(m=>m[0]);
}
function firstAmountToken(text){
  return allAmountTokens(text)[0] || '';
}
function lastAmountTokenBeforeDate(text){
  const s=clean(text);
  const dateMatch=s.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\b/i);
  const prefix=dateMatch ? s.slice(0,dateMatch.index) : s;
  const tokens=allAmountTokens(prefix);
  return tokens.length ? tokens[tokens.length-1] : firstAmountToken(s);
}
function browserPlainRowToRaw(block, source){
  const n=clean(block).replace(/\t+/g,'\t');
  const lines=n.split(/\n+/).map(clean).filter(Boolean);
  const user=n.match(/\bBEB@[^\s\t]+/i)?.[0] || n.match(/\b[A-Za-z0-9_.-]+@[^\s\t]+/i)?.[0] || '';
  const date=firstDate(n);
  // In browser-copy rows the actual Amount is the last monetary-looking token before
  // the first transaction Date. This avoids mistaking a dotted account number for Amount.
  const amount=lastAmountTokenBeforeDate(n);
  const payment=n.match(/\b(?:QR\s*Pay|Agent\s+Deposit|Member\s+Deposit)\b/i)?.[0] || '';
  const status=n.match(/\b(?:Confirmed|Deleted|Pending|Processing|Rejected|Cancelled)\b/i)?.[0] || '';
  const remark=CONFIG.excludedRemarks.find(x=>norm(n).includes(x)) || '';

  // Browser clipboard output can flatten <br>-separated cells into individual lines.
  // For Deposit Request History the layout is effectively:
  //   From Bank cell -> To Bank cell -> Amount -> Date -> Payment Method -> Status -> ...
  // We must NOT assume either bank cell is always exactly 3 lines long. Instead, locate
  // the first two recognizable bank/destination labels before Amount/Date. The SECOND
  // recognized bank label is the To Bank value. This is what lets Agent Deposit -> BRI/BCA/
  // DANA/etc. be classified as MEMBER_DEPOSIT while Agent Deposit -> SCB A BONUS... remains
  // DAILY_BONUS.
  const knownBankLabels=[
    'SCB','DANA','BCA','MANDIRI','BNI','BRI','DANAMON','GOPAY','GO PAY','LINKAJA','OVO','PRABUPAY'
  ];
  const bankRegexFor=(name)=>name==='GO PAY'?/^GO\s*PAY$/i:new RegExp('^'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'$','i');
  const isKnownBankLine=(line)=>knownBankLabels.some(name=>bankRegexFor(name).test(norm(line)));

  const detectToBank=()=>{
    if(source!=='deposit-history') return '';
    const dateMatch=n.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\b/i);
    const amountDateBoundary=dateMatch?.index ?? n.length;
    const preMeta=n.slice(0,amountDateBoundary);
    const preLines=preMeta.split(/\n+/).map(clean).filter(Boolean);

    // If the row has a normal tab structure, the explicit second column is authoritative.
    const cells=n.split('\t').map(clean).filter(Boolean);
    if(cells.length>=4 && user){
      const userIndex=cells.findIndex(c=>new RegExp('\\b'+user.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\b','i').test(c));
      if(userIndex>=0 && cells[userIndex+2]) return cells[userIndex+2];
    }

    // Remove the row-number/username prefix from the first visual line.
    let logicalLines=[...preLines];
    if(logicalLines.length){
      const first=logicalLines[0];
      const um=first.match(/\b(?:BEB@|[A-Za-z0-9_.-]+@)[^\s\t]+/i);
      if(um){
        const rem=first.slice((um.index||0)+um[0].length).trim();
        logicalLines[0]=rem;
        if(!rem) logicalLines.shift();
      }
    }

    // Normally the second known bank label is the To Bank. This handles variable-length
    // From/To cells and does not depend on account-name/account-number line counts.
    const hits=[];
    logicalLines.forEach((line,i)=>{
      for(const name of knownBankLabels){
        if(bankRegexFor(name).test(norm(line))){ hits.push({i,name}); break; }
      }
    });
    if(hits.length>=2){
      return hits[1].name==='GO PAY'?'GO PAY':hits[1].name;
    }

    // Strong fallbacks for the two most important patterns.
    if(norm(n).includes(norm(CONFIG.bonusTarget))) return CONFIG.bonusTarget;
    const targets=CONFIG.memberDepositToBanks.map(norm);
    for(let i=logicalLines.length-1;i>=0;i--){
      const line=norm(logicalLines[i]);
      const target=targets.find(x=>x==='GO PAY'?line==='GO PAY':line===x);
      if(target) return target;
    }
    return '';
  };

  const flattenedToBank=detectToBank();

  // When clipboard data still contains cell tabs, reconstruct the known report columns.
  const cells=n.split('\t').map(clean);
  const first=cells[0].match(/^\d{1,8}$/) ? 1 : 0;
  if(cells.length >= (source==='qrpay'?10:7) && user){
    if(source==='qrpay'){
      const idxDate=cells.findIndex(c=>parseDateTime(c));
      const idxAmount=cells.findIndex(c=>firstAmountToken(c));
      const obj={
        'User Name': user,
        'From Bank': cells[first+1]||'',
        'To Bank': cells[first+2]||'',
        'Amount': cells[idxAmount>=0?idxAmount:first+3]||amount,
        'Reference': cells[first+4]||'',
        'RRN': cells[first+5]||'',
        'Date': cells[idxDate>=0?idxDate:first+6]||date,
        'Payment Method': cells.find(c=>/^(QR\s*Pay|Agent\s+Deposit|Member\s+Deposit)$/i.test(c))||payment,
        'Status': cells.find(c=>/^(Confirmed|Deleted|Pending|Processing|Rejected|Cancelled)$/i.test(c))||status,
        'Invoice': cells.find(c=>/^View$/i.test(c))||'',
        'Status Date': cells.slice(Math.max(idxDate+1,0)).find(c=>parseDateTime(c))||'',
        'Remark': remark,
        'Edited By': ''
      };
      return obj;
    }
    const obj={
      'User Name': user,
      'From Bank': cells[first+1]||'',
      'To Bank': cells[first+2]||flattenedToBank,
      'Amount': amount || cells[first+3]||'',
      'Date': date || cells[first+4]||'',
      'Payment Method': cells.find(c=>/^(QR\s*Pay|Agent\s+Deposit|Member\s+Deposit)$/i.test(c))||payment,
      'Status': cells.find(c=>/^(Confirmed|Deleted|Pending|Processing|Rejected|Cancelled)$/i.test(c))||status,
      'Status Date': cells.filter(c=>parseDateTime(c)).find(c=>c!==date)||'',
      'Remark': remark,
      'Edited By': ''
    };
    // The browser can preserve tabs for some rows but still split the bank cell internally.
    // Prefer our structural To Bank detection when available.
    if(norm(n).includes(norm(CONFIG.bonusTarget))) obj['To Bank']=`${obj['To Bank']}\n${CONFIG.bonusTarget}`.trim();
    else if(flattenedToBank) obj['To Bank']=flattenedToBank;
    return obj;
  }

  // Fully flattened browser text (no useful tabs): parse the fields required by the bonus
  // engine, including To Bank classification for Agent Deposit bank-to-bank transfers.
  return {
    'User Name':user,
    'From Bank':'',
    'To Bank': norm(n).includes(norm(CONFIG.bonusTarget)) ? CONFIG.bonusTarget : flattenedToBank,
    'Amount':amount,
    'Reference':'',
    'RRN':'',
    'Date':date,
    'Payment Method':payment,
    'Status':status,
    'Invoice':'',
    'Status Date':'',
    'Remark':remark,
    'Edited By':''
  };
}
function parseBrowserCopy(text, source){
  const blocks=browserRowBlocks(text);
  if(!blocks.length)return [];
  return blocks.map((b)=>browserPlainRowToRaw(b,source)).filter(r=>r['User Name'] && r['Amount'] && r['Date']);
}
function parseLoose(text, source='deposit-history'){
  // 1) Markdown table (our test/example format).
  if(/(^|\n)\s*\|[^\n]*\|\s*(\n|$)/.test(text)) { const rows=parseMarkdownTable(text); if(rows.length)return rows; }
  // 2) Real browser copy: row numbers + multiline table cells.
  const browserRows=parseBrowserCopy(text,source); if(browserRows.length)return browserRows;
  // 3) Conventional TSV fallback.
  const rows=parseTSV(text); if(rows.length)return rows;
  return parseMarkdownTable(text);
}
export function parseReport(text, source='deposit-history'){
  const rows=parseLoose(text,source);
  return rows.map((r,i)=>normalizeRow(r,i,source)).filter(Boolean);
}
function get(r, ...names){
  const keys=Object.keys(r); for(const n of names){ const k=keys.find(x=>norm(x)===norm(n)); if(k)return r[k]; }
  return '';
}
export function classifyTransaction(r){
  const pm=norm(r.paymentMethod), from=norm(r.fromBank), to=norm(r.toBank);
  if(to.includes(norm(CONFIG.bonusTarget)) && pm==='AGENT DEPOSIT') return 'DAILY_BONUS';
  if(pm==='MEMBER DEPOSIT') return 'MEMBER_DEPOSIT';
  // Agent Deposit to one of the supported member-facing bank/e-wallet destinations is
  // also a MEMBER_DEPOSIT. This is intentionally based on To Bank, not From Bank.
  if(pm==='AGENT DEPOSIT' && CONFIG.memberDepositToBanks.some(name=>to.includes(norm(name)))) return 'MEMBER_DEPOSIT';
  // Legacy/fallback rule retained for reports that literally expose "Member Deposit" in
  // one of the bank fields.
  if(pm==='AGENT DEPOSIT' && (from.includes('MEMBER DEPOSIT') || to.includes('MEMBER DEPOSIT'))) return 'MEMBER_DEPOSIT';
  return pm==='AGENT DEPOSIT'?'AGENT_DEPOSIT':pm==='MEMBER DEPOSIT'?'MEMBER_DEPOSIT':'OTHER';
}
function normalizeRow(r,i,source){
  const username=clean(get(r,'User Name','Username','UserName'));
  const amount=parseAmount(get(r,'Amount','Nominal'));
  const dateRaw=clean(get(r,'Date','Transaction Date'));
  const date=parseDateTime(dateRaw);
  const out={
    row:i+1, username, fromBank:clean(get(r,'From Bank')), toBank:clean(get(r,'To Bank')),
    amountRaw:clean(get(r,'Amount','Nominal')), amount, dateRaw, date,
    paymentMethod:clean(get(r,'Payment Method')), status:clean(get(r,'Status')),
    statusDate:clean(get(r,'Status Date')), remark:clean(get(r,'Remark')), source,
    reference:clean(get(r,'Reference')), editedBy:''
  };
  out.transactionType=classifyTransaction(out);
  out.remarkStatus=detectRemark(out.remark);
  return out;
}
export function detectRemark(remark){
  const n=norm(remark); if(!n)return 'NORMAL';
  const found=CONFIG.excludedRemarks.find(x=>n.includes(x));
  return found||'NORMAL';
}
export function isConfirmed(r){return norm(r.status)==='CONFIRMED';}
export function getDailyBonusRecords(records){
  return records.filter(r=>r.transactionType==='DAILY_BONUS' && isConfirmed(r));
}
export function getDepositRecords(records, source='history'){
  if(source==='qrpay') return records.filter(r=>isConfirmed(r) && r.amount>0);
  return records.filter(r=>r.transactionType==='MEMBER_DEPOSIT' && isConfirmed(r));
}
export function latestByUsername(records){
  const m=new Map();
  for(const r of records){ if(!r.username)continue; const prev=m.get(r.username); if(!prev || (r.date&&prev.date&&r.date>prev.date) || (!prev.date&&r.date))m.set(r.username,r); }
  return [...m.values()];
}
function calendarDateKey(value){
  const d=value instanceof Date ? value : parseDateTime(value);
  if(!d)return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
export function calculateExpectedBonus(depositAmount, rate){
  const raw=Math.round(Number(depositAmount||0)*Number(rate||0));
  return Math.min(Math.max(raw,0), CONFIG.maxBonusAmount);
}
function expectedBonus(deposit, rate){return calculateExpectedBonus(deposit.amount,rate);}
function sortByDate(records){
  return [...records].sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0));
}
function buildDepositEvents(qrRecords, historyRecords){
  const qrDeposits=getDepositRecords(qrRecords,'qrpay').filter(r=>r.amount>0);
  const memberDeposits=getDepositRecords(historyRecords,'history').filter(r=>r.amount>0);
  return sortByDate([...qrDeposits,...memberDeposits]);
}
function makeDayKey(user, dateKey){return `${user}\u001f${dateKey}`;}

// Business rule: one bonus per username per CALENDAR DAY (00:00:00–23:59:59),
// not a rolling 24-hour window. QRPay and Member Deposit share the same day bucket.
// A normal bonus is valid only when there is a confirmed deposit for the same username
// on the same calendar date and the deposit happened before the bonus.
export function auditBonuses(qrText, historyText, opts={}){
  const rate=Number.isFinite(Number(opts.rate))?Number(opts.rate):CONFIG.defaultBonusRate;
  const qr=parseReport(qrText,'qrpay');
  const hist=parseReport(historyText,'deposit-history');
  const deposits=buildDepositEvents(qr,hist);
  const bonuses=sortByDate(getDailyBonusRecords(hist));

  const users=new Map();
  const ensureUser=(username)=>{
    if(!users.has(username))users.set(username,{deposits:[],bonuses:[]});
    return users.get(username);
  };
  for(const dep of deposits){ if(dep.username) ensureUser(dep.username).deposits.push(dep); }
  for(const bonus of bonuses){ if(bonus.username) ensureUser(bonus.username).bonuses.push(bonus); }

  const rows=[];
  let suppressedDeposits=0;

  const buildRow=(username, dateKey, dep, bonusRecords, extra={})=>{
    const expected=dep ? expectedBonus(dep,rate) : 0;
    const given=bonusRecords.reduce((sum,b)=>sum+b.amount,0);
    const doubleBonus=bonusRecords.length>1;
    const overBonus=given>expected;
    const noSameDayDeposit=!!extra.noSameDayDeposit;
    let status='BELUM DIBERIKAN';
    if(extra.blockedRemark && !bonusRecords.length){
      status='DIBLOKIR / TIDAK BONUS';
    } else if(bonusRecords.length){
      if(doubleBonus || overBonus || noSameDayDeposit) status='MISTAKE';
      else if(given===expected) status='SESUAI';
      else status='SUDAH DIBERIKAN';
    }
    const bonusTime=bonusRecords[0]?.dateRaw||extra.orphanBonusTime||'';
    return {
      username,
      dateKey,
      depositAmount:dep?.amount||0,
      expectedBonus:expected,
      givenBonus:given,
      difference:given-expected,
      status,
      doubleBonus,
      overBonus,
      remarkStatus:extra.remarkStatus||'NORMAL',
      depositDate:dep?.dateRaw || (bonusTime ? `— (bonus ${bonusTime})` : '—'),
      deposit:dep||null,
      bonusRecords:[...bonusRecords],
      hidden:false,
      depositSource:dep?.source||'',
      noSameDayDeposit,
      bonusWithoutSameDayDeposit:noSameDayDeposit
    };
  };

  // Process one calendar date at a time. This makes cross-midnight transactions
  // intentionally independent: a deposit on 22/09 cannot validate a bonus on 23/09.
  for(const [username,state] of users){
    const depositsByDay=new Map();
    for(const dep of sortByDate(state.deposits)){
      const key=calendarDateKey(dep.date);
      if(!key)continue;
      if(!depositsByDay.has(key))depositsByDay.set(key,[]);
      depositsByDay.get(key).push(dep);
    }
    const bonusesByDay=new Map();
    for(const bonus of sortByDate(state.bonuses)){
      const key=calendarDateKey(bonus.date);
      if(!key)continue;
      if(!bonusesByDay.has(key))bonusesByDay.set(key,[]);
      bonusesByDay.get(key).push(bonus);
    }

    const dayKeys=[...new Set([...depositsByDay.keys(),...bonusesByDay.keys()])].sort();
    for(const dateKey of dayKeys){
      const dayDeposits=sortByDate(depositsByDay.get(dateKey)||[]);
      const dayBonuses=sortByDate(bonusesByDay.get(dateKey)||[]);
      const normalBonuses=dayBonuses.filter(b=>b.remarkStatus==='NORMAL');
      const blockedRemark=dayBonuses.find(b=>b.remarkStatus!=='NORMAL')?.remarkStatus||'';

      if(normalBonuses.length){
        const firstBonus=normalBonuses[0];
        // Only deposits on the SAME calendar date and at/before the first bonus are eligible.
        const beforeFirstBonus=dayDeposits.filter(d=>d.date && firstBonus.date && d.date.getTime()<=firstBonus.date.getTime());
        const selected=beforeFirstBonus.length?beforeFirstBonus[beforeFirstBonus.length-1]:null;
        const noSameDayDeposit=!selected;

        // Once one normal bonus exists on this date, every other deposit for this username
        // on that same date is ineligible. Exactly one deposit slot remains for the day.
        if(dayDeposits.length){
          suppressedDeposits += selected ? Math.max(0,dayDeposits.length-1) : dayDeposits.length;
        }

        const row=buildRow(username,dateKey,selected,normalBonuses,{
          blockedRemark:blockedRemark,
          remarkStatus:noSameDayDeposit ? 'BONUS TANPA DEPOSIT PADA TANGGAL YANG SAMA' : (blockedRemark||'NORMAL'),
          noSameDayDeposit,
          orphanBonusTime:firstBonus.dateRaw
        });
        rows.push(row);
        continue;
      }

      // No normal bonus on this date: show only the latest confirmed deposit for the day.
      // Repeated deposits from both QRPay and Member Deposit are intentionally suppressed.
      if(dayDeposits.length){
        const selected=dayDeposits[dayDeposits.length-1];
        suppressedDeposits += Math.max(0,dayDeposits.length-1);
        rows.push(buildRow(username,dateKey,selected,[],{
          blockedRemark,
          remarkStatus:blockedRemark||'NORMAL'
        }));
      }
      // A blocked/no-bonus record without a deposit on that same date does not create a
      // mistake because it represents a bonus that was explicitly blocked, not a granted bonus.
    }
  }

  rows.sort((a,b)=>{
    const d=(a.deposit?.date?.getTime()??Infinity)-(b.deposit?.date?.getTime()??Infinity);
    return d || a.username.localeCompare(b.username);
  });
  rows.suppressedDeposits=suppressedDeposits;
  rows.doubleBonusRows=rows.filter(r=>r.doubleBonus).length;
  rows.mistakeRows=rows.filter(r=>r.status==='MISTAKE').length;
  rows.calendarDayRule=true;
  return rows;
}
export function processDailyBonus(historyText, opts={}){
  // 1.2 INPUT BONUS HARIAN HAS ITS OWN READ PATH.
  // Do not call auditBonuses() or depend on the 1.1 reconciliation rules here.
  // The only business condition is: To Bank contains SCB A BONUS DEPOSIT HARIAN.
  // Payment Method may be present (normally Agent Deposit), but the input report format
  // may also omit Payment Method/Status columns. A blank status is therefore accepted;
  // when a status is present, only Confirmed records are included.
  const rawRecords=parseLoose(historyText,'deposit-history');
  const target=norm(CONFIG.bonusTarget);

  function inputDateKey(value){
    const parsed=parseDateTime(value);
    if(parsed) return calendarDateKey(parsed);
    const m=clean(value).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : '';
  }

  const bonus=rawRecords.map((r,i)=>{
    const username=clean(get(r,'User Name','Username','UserName'));
    const toBank=clean(get(r,'To Bank'));
    const amountRaw=clean(get(r,'Amount','Deposit','Nominal'));
    const status=clean(get(r,'Status'));
    const dateRaw=clean(get(r,'Date','Date/Time','Transaction Date'));
    const paymentMethod=clean(get(r,'Payment Method'));
    return {
      row:i+1, username, toBank, amount:Math.trunc(parseAmount(amountRaw)), amountRaw,
      dateRaw, date:parseDateTime(dateRaw), calendarDate:inputDateKey(dateRaw),
      paymentMethod, status
    };
  }).filter(r=>{
    if(!r.username || r.amount<=0) return false;
    if(!norm(r.toBank).includes(target)) return false;
    return !r.status || norm(r.status)==='CONFIRMED';
  });

  // DOUBLE BONUS is only an audit flag: every matching transaction remains in the output.
  const byDay=new Map();
  for(const r of bonus){
    const key=makeDayKey(r.username,r.calendarDate);
    if(!byDay.has(key))byDay.set(key,[]);
    byDay.get(key).push(r);
  }

  const rows=bonus.map(r=>({
    username:r.username,
    amount:r.amount,
    date:r.dateRaw,
    status:r.status||'CONFIRMED',
    doubleBonus:(byDay.get(makeDayKey(r.username,r.calendarDate))||[]).length>1,
    calendarDate:r.calendarDate,
    toBank:r.toBank,
    hidden:false
  }));

  const sort=opts.sort||'amount-desc';
  rows.sort((a,b)=>{
    if(sort==='username-asc') return a.username.localeCompare(b.username) || a.amount-b.amount;
    if(sort==='username-desc') return b.username.localeCompare(a.username) || b.amount-a.amount;
    if(sort==='amount-asc') return a.amount-b.amount;
    return b.amount-a.amount;
  });

  const distinctDates=[...new Set(rows.map(r=>r.calendarDate).filter(Boolean))].sort();
  return {
    rows,
    duplicateCount:rows.filter(r=>r.doubleBonus).length,
    distinctDates,
    calendarDayRule:true,
    sourceRule:'To Bank contains SCB A BONUS DEPOSIT HARIAN; blank status accepted; non-Confirmed status excluded'
  };
}
