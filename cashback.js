export const CASHBACK_THRESHOLD_RP = 500000;
export const CASHBACK_REPORT_UNIT = 1000;

export function deriveGameName(fileName=''){
  const base=String(fileName).replace(/\.[^.]+$/,'').trim();
  const beforeDate=base.split(/[_-]\d{4}-\d{2}-\d{2}/i)[0].trim();
  const prefix=beforeDate.split('_')[0].trim();
  return prefix || base || 'GAME';
}

function normalizeUsername(v){ return String(v??'').trim(); }
function normalizeLossRaw(v){ const n=Number(v); return Number.isFinite(n)?n:NaN; }

/**
 * Round a loss reported in "thousands of rupiah" to the nearest whole thousand-unit.
 * Because losses are negative, round the magnitude first so .50 and above goes away
 * from zero and below .50 goes toward zero.
 * Examples: -29647.99 -> -29648, -19955.29 -> -19955, -19955.50 -> -19956.
 */
export function roundCashbackLoss(rawLoss){
  const n=Number(rawLoss);
  if(!Number.isFinite(n)) return 0;
  return n < 0 ? -Math.round(Math.abs(n)) : Math.round(n);
}

export function processCashbackReports(reports, gameFilter='all'){
  const grouped=new Map();
  const sourceStats=[];
  for(const report of reports){
    const game=report.game||deriveGameName(report.fileName||'GAME');
    let read=0, excludedTotal=0, eligible=0;
    for(const r of (report.rows||[])){
      const username=normalizeUsername(r.username);
      const raw=normalizeLossRaw(r.winLoseAmt);
      if(!username || username.toUpperCase()==='TOTAL' || !Number.isFinite(raw)) { excludedTotal += username.toUpperCase()==='TOTAL' ? 1 : 0; continue; }
      read++;
      const key=`${game.toUpperCase()}\u0000${username.toUpperCase()}`;
      const prev=grouped.get(key);
      if(prev) prev.rawLoss += raw;
      else grouped.set(key,{game,username,rawLoss:raw});
      if(raw <= -500) eligible++;
    }
    sourceStats.push({fileName:report.fileName||'',game,read,eligible,excludedTotal});
  }

  let result=[...grouped.values()];
  if(gameFilter && gameFilter!=='all') result=result.filter(r=>r.game===gameFilter);
  else {
    const allMap=new Map();
    for(const r of result){
      const key=r.username.toUpperCase();
      const prev=allMap.get(key);
      if(prev) prev.rawLoss+=r.rawLoss;
      else allMap.set(key,{game:'Semua Game',username:r.username,rawLoss:r.rawLoss});
    }
    result=[...allMap.values()];
  }
  result=result.filter(r=>r.rawLoss <= -500).sort((a,b)=>a.rawLoss-b.rawLoss || a.username.localeCompare(b.username));
  return {rows:result, sourceStats, threshold:CASHBACK_THRESHOLD_RP, reportUnit:CASHBACK_REPORT_UNIT, gameFilter};
}

export function displayLoss(rawLoss){
  // UI shows the rounded whole-thousand-unit value without the trailing .000.
  // Example: -29,647.99 -> -29,648
  const rounded=roundCashbackLoss(rawLoss);
  return rounded.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
}

export function excelLoss(rawLoss){
  // Excel copy uses the same rounded whole-thousand-unit value, without .000
  // and without multiplying by 1,000. Example: -29,647.99 -> -29648.
  return roundCashbackLoss(rawLoss);
}
