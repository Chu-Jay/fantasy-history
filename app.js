const URLS={ledger:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRdfwYE5J9C4n7NSaU_2HT0E7zrdSZoHZOultcBjsroqoGPE1sdoTjarHDUcpctSJOMzt9fTJjokxG/pub?gid=2024407837&single=true&output=csv',settings:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRdfwYE5J9C4n7NSaU_2HT0E7zrdSZoHZOultcBjsroqoGPE1sdoTjarHDUcpctSJOMzt9fTJjokxG/pub?gid=130130682&single=true&output=csv',home:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRdfwYE5J9C4n7NSaU_2HT0E7zrdSZoHZOultcBjsroqoGPE1sdoTjarHDUcpctSJOMzt9fTJjokxG/pub?gid=2092058691&single=true&output=csv'};
function csv(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}else if(c===','&&!q){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
const num=v=>{const n=parseFloat(String(v).replace(/[$,%]/g,''));return Number.isFinite(n)?n:0},fmt=n=>Number(n).toFixed(2),pct=n=>Number(n).toFixed(3).replace(/^0/,''),weekOrder=w=>/^\d+$/.test(w)?+w:({'P Wild Card':15,'P Semis':16,'P Finals':17}[w]??99),esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let ledger=[],teams=[],champions=[];
const PAGE=document.body.dataset.page||'home';
const ROOT=PAGE==='records'?'../':'';
const FALLBACK_LOGO=ROOT+'league-logo.png';
function assetPath(src){src=String(src||'').trim();if(!src)return FALLBACK_LOGO;if(/^https?:\/\//i.test(src)||src.startsWith('/'))return src;return ROOT+src.replace(/^\.\//,'')}
function setupNav(){const b=document.querySelector('#menuButton'),s=document.querySelector('#sidebar'),x=document.querySelector('#navScrim');if(!b||!s||!x)return;const close=()=>{s.classList.remove('open');x.classList.remove('show')};b.onclick=()=>{s.classList.toggle('open');x.classList.toggle('show')};x.onclick=close;document.querySelectorAll('.sidebar a').forEach(a=>a.addEventListener('click',close))}
async function load(){setupNav();try{const [lt,st,ht]=await Promise.all(Object.values(URLS).map(u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.text()})));const lr=csv(lt),sr=csv(st),hr=csv(ht);ledger=lr.slice(1).filter(r=>r[0]&&r[3]&&r[4]).map(r=>({owner:r[0].trim(),score:num(r[1]),opponent:r[2].trim(),year:String(r[3]).replace(/\.0$/,''),week:r[4].trim(),team:(r[5]||r[0]).trim(),oppScore:num(r[6]),outcome:(r[7]||'').trim().toLowerCase(),diff:num(r[12])}));parseTeams(sr);renderLeague(sr);if(PAGE==='home'){parseChampions(hr);renderChampion();renderShrine();setupSelectors()}else if(PAGE==='records'){renderRecords()}const status=document.querySelector('#status');if(status)status.textContent='Live data loaded'}catch(e){const status=document.querySelector('#status');if(status)status.textContent='Could not load live data';console.error(e)}}
function renderLeague(r){const at=(row,col)=>r[row-1]?.[col-1]?.trim()||'',name=at(5,7)||'Rumble of Regards NFL';const n=document.querySelector('#leagueName'),sn=document.querySelector('#sideLeagueName');if(n)n.textContent=name;if(sn)sn.textContent=name;const size=at(17,7),info=at(8,7),meta=document.querySelector('#leagueMeta');if(meta)meta.textContent=[size?`${parseInt(size)} Team`:'',info].filter(Boolean).join(' • ')}
function parseTeams(r){teams=[];for(let i=4;i<r.length;i++){const row=r[i]||[],year=String(row[0]||'').replace(/\.0$/,'').trim(),owner=String(row[1]||'').trim(),team=String(row[2]||'').trim(),logo=String(row[4]||'').trim();if(/^\d{4}$/.test(year)&&owner&&team)teams.push({year,owner,team,logo:assetPath(logo)})}}
function teamInfo(year,owner,fallbackTeam=''){return teams.find(t=>t.year===String(year)&&t.owner===owner)||{year:String(year),owner,team:fallbackTeam||owner,logo:FALLBACK_LOGO}}
function logoAttrs(src){return `src=\"${esc(assetPath(src))}\" onerror=\"this.onerror=null;this.src='${FALLBACK_LOGO}'\"`}
function parseChampions(r){champions=[];for(let i=39;i<r.length;i++){const row=r[i]||[],year=String(row[1]||'').trim(),team=String(row[0]||'').trim(),owner=String(row[2]||'').trim();if(/^\d{4}$/.test(year)&&team&&owner)champions.push({year:+year,team,owner,players:row.slice(3,13).map(x=>String(x||'').trim()).filter(Boolean)})}champions.sort((a,b)=>b.year-a.year)}
function renderChampion(){const c=champions[0];if(!c)return;const ti=teamInfo(c.year,c.owner,c.team);const champLogo=document.querySelector('#champLogo');champLogo.src=assetPath(ti.logo);champLogo.onerror=()=>{champLogo.onerror=null;champLogo.src=FALLBACK_LOGO};document.querySelector('#champTeam').textContent=c.team;document.querySelector('#champOwner').textContent=c.owner;document.querySelector('#champYear').textContent=c.year;document.querySelector('#enshrined').innerHTML=c.players.map(p=>`<span class="chip">${esc(p)}</span>`).join('')||'<span class="muted">No players enshrined</span>'}
function renderShrine(){document.querySelector('#shrine').innerHTML=champions.map(c=>{const ti=teamInfo(c.year,c.owner,c.team);return `<article class="champ-history"><div class="history-head"><img class="history-logo" ${logoAttrs(ti.logo)} alt=""><div><span class="history-year">${c.year} CHAMPION</span><h3>${esc(c.team)}</h3><p>${esc(c.owner)}</p></div></div><div class="history-roster">${c.players.map(p=>`<span>${esc(p)}</span>`).join('')||'<span class="muted">No enshrined players</span>'}</div></article>`}).join('')}
function setupSelectors(){const years=[...new Set(ledger.map(x=>x.year))].sort((a,b)=>+b-+a),ys=document.querySelector('#yearSelect'),ws=document.querySelector('#weekSelect');ys.innerHTML=years.map(y=>`<option>${y}</option>`).join('');const savedY=localStorage.getItem('ror-year');ys.value=years.includes(savedY)?savedY:years[0];function fillWeeks(){const weeks=[...new Set(ledger.filter(x=>x.year===ys.value).map(x=>x.week))].sort((a,b)=>weekOrder(a)-weekOrder(b));ws.innerHTML=weeks.map(w=>`<option>${esc(w)}</option>`).join('');const saved=localStorage.getItem(`ror-week-${ys.value}`);ws.value=weeks.includes(saved)?saved:weeks.filter(w=>/^\d+$/.test(w)).at(-1)||weeks.at(-1);render()}ys.onchange=()=>{localStorage.setItem('ror-year',ys.value);fillWeeks()};ws.onchange=()=>{localStorage.setItem(`ror-week-${ys.value}`,ws.value);render()};fillWeeks()}
function render(){const y=document.querySelector('#yearSelect').value,w=document.querySelector('#weekSelect').value;renderWeekly(y,w);renderWeeklyMatchups(y,w);renderStandings(y)}
function identityHTML(year,owner,team,logoClass='team-logo'){const ti=teamInfo(year,owner,team);return `<span class="team-ident"><img class="${logoClass}" ${logoAttrs(ti.logo)} alt=""><span><strong>${esc(ti.team)}</strong><small>${esc(owner)}</small></span></span>`}
function renderWeekly(y,w){const rows=ledger.filter(x=>x.year===y&&x.week===w),wins=rows.filter(x=>x.outcome==='w');const blow=[...wins].sort((a,b)=>b.diff-a.diff)[0],close=[...wins].sort((a,b)=>a.diff-b.diff)[0];matchup('#blowout',blow,y);matchup('#closest',close,y);const scorers=[...rows].sort((a,b)=>b.score-a.score);document.querySelector('#scorers').innerHTML=scorers.map((x,i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span>${identityHTML(y,x.owner,x.team,'rank-logo')}<strong class="score">${fmt(x.score)}</strong></div>`).join('')||'<p class="muted">No games for this week.</p>'}
function matchup(sel,x,y){const el=document.querySelector(sel);if(!x){el.innerHTML='<p class="muted">No matchup data.</p>';return}const opp=teamInfo(y,x.opponent,x.opponent);el.innerHTML=`<div class="matchup-line">${identityHTML(y,x.owner,x.team)}<span class="score">${fmt(x.score)}</span></div><div class="matchup-line">${identityHTML(y,x.opponent,opp.team)}<span class="score">${fmt(x.oppScore)}</span></div><div class="diff">${fmt(Math.abs(x.score-x.oppScore))} pts</div>`}
function gamesThroughWeek(year,owner,selectedWeek){
  const target=weekOrder(selectedWeek);
  return ledger.filter(x=>x.year===String(year)&&x.owner===owner&&weekOrder(x.week)<=target).sort((a,b)=>weekOrder(a.week)-weekOrder(b.week));
}
function recordAndStreak(year,owner,selectedWeek){
  const games=gamesThroughWeek(year,owner,selectedWeek);
  let w=0,l=0,streakType='',streakCount=0;
  for(const g of games){
    if(g.outcome==='w')w++; else if(g.outcome==='l')l++;
    const type=g.outcome==='w'?'W':g.outcome==='l'?'L':'';
    if(!type)continue;
    if(type===streakType)streakCount++; else {streakType=type;streakCount=1}
  }
  return {record:`${w}-${l}`,streak:streakType?`${streakType}${streakCount}`:'—',winStreak:streakType==='W'};
}
function weeklyGameTeamHTML(year,owner,team,score,selectedWeek,isWinner){
  const ti=teamInfo(year,owner,team),rs=recordAndStreak(year,owner,selectedWeek);
  return `<div class="game-team ${isWinner?'winner':'loser'}"><span class="team-ident"><img class="team-logo" ${logoAttrs(ti.logo)} alt=""><span><strong>${esc(ti.team)}</strong><small>${esc(owner)}</small><span class="game-meta"><span class="game-record">${rs.record}</span><span class="streak ${rs.winStreak?'streak-win':'streak-loss'}">${rs.streak}</span></span></span></span><span class="game-score">${fmt(score)}</span></div>`;
}
function renderWeeklyMatchups(y,w){
  const section=document.querySelector('#weeklySection');
  section.classList.toggle('playoffs',w.startsWith('P'));
  const wins=ledger.filter(x=>x.year===y&&x.week===w&&x.outcome==='w');
  document.querySelector('#weeklyMatchups').innerHTML=wins.map(x=>{
    const opp=teamInfo(y,x.opponent,x.opponent);
    return `<article class="weekly-game">${weeklyGameTeamHTML(y,x.owner,x.team,x.score,w,true)}${weeklyGameTeamHTML(y,x.opponent,opp.team,x.oppScore,w,false)}</article>`;
  }).join('')||'<p class="muted">No matchups for this week.</p>';
}
function h2hCompare(a,b,y){const games=ledger.filter(x=>x.year===y&&!x.week.startsWith('P')&&x.owner===a.owner&&x.opponent===b.owner);if(!games.length)return 0;const aw=games.filter(x=>x.outcome==='w').length,bw=games.filter(x=>x.outcome==='l').length;return aw===bw?0:aw>bw?-1:1}
function sortTieGroup(group,y){
  // ESPN-style recursive seeding: award the highest available seed to one team,
  // remove that team, then restart the tiebreaker from H2H for the remaining teams.
  const remaining=[...group],seeded=[];
  while(remaining.length){
    if(remaining.length===1){seeded.push(remaining[0]);break}

    const set=new Set(remaining.map(t=>t.owner));
    const rec=new Map(remaining.map(t=>[t.owner,{w:0,l:0,g:0}]));
    for(const x of ledger.filter(x=>x.year===y&&!x.week.startsWith('P')&&set.has(x.owner)&&set.has(x.opponent))){
      const r=rec.get(x.owner);r.g++;
      if(x.outcome==='w')r.w++;
      else if(x.outcome==='l')r.l++;
    }

    // H2H is valid only if every currently tied team has played the same
    // number of games against the other teams still in this tie.
    const games=[...rec.values()].map(r=>r.g);
    const h2hValid=games.length>0&&games[0]>0&&games.every(g=>g===games[0]);

    let winner;
    if(h2hValid){
      winner=[...remaining].sort((a,b)=>{
        const ra=rec.get(a.owner),rb=rec.get(b.owner);
        const pa=ra.w/(ra.w+ra.l||1),pb=rb.w/(rb.w+rb.l||1);
        return pb-pa||b.pf-a.pf;
      })[0];
    }else{
      winner=[...remaining].sort((a,b)=>b.pf-a.pf)[0];
    }

    seeded.push(winner);
    remaining.splice(remaining.findIndex(t=>t.owner===winner.owner),1);
    // Loop restarts here, recalculating H2H using only the teams still tied.
  }
  return seeded;
}
function renderStandings(y){const rows=ledger.filter(x=>x.year===y&&!x.week.startsWith('P')),map=new Map;for(const x of rows){const key=x.owner;if(!map.has(key))map.set(key,{owner:key,team:x.team,w:0,l:0,pf:0,pa:0,scores:[],games:0});const t=map.get(key);t.games++;t.pf+=x.score;t.pa+=x.oppScore;t.scores.push(x.score);if(x.outcome==='w')t.w++;else if(x.outcome==='l')t.l++}let raw=[...map.values()].map(t=>({...t,pct:t.w/(t.w+t.l||1),avg:t.pf/(t.games||1),avgpa:t.pa/(t.games||1),hi:Math.max(...t.scores),lo:Math.min(...t.scores)})).sort((a,b)=>b.w-a.w);let s=[];for(let i=0;i<raw.length;){let j=i+1;while(j<raw.length&&raw[j].w===raw[i].w&&raw[j].l===raw[i].l)j++;s.push(...sortTieGroup(raw.slice(i,j),y));i=j}document.querySelector('#standingsTitle').textContent=`${y} Standings`;document.querySelector('#standings').innerHTML=s.map((t,i)=>`<tr><td>${i+1}</td><td>${identityHTML(y,t.owner,t.team,'stand-logo')}</td><td>${t.w}-${t.l}</td><td>${pct(t.pct)}</td><td>${fmt(t.avg)}</td><td>${fmt(t.pf)}</td><td>${fmt(t.hi)}</td><td>${fmt(t.lo)}</td><td>${fmt(t.avgpa)}</td><td>${fmt(t.pa)}</td></tr>`).join('')}

function topWeekly(desc=true){return [...ledger].sort((a,b)=>desc?b.score-a.score:a.score-b.score)}
function winnerGames(){return ledger.filter(x=>x.outcome==='w')}
function renderSimpleRecords(id,items,valueFn,contextFn,klass=''){const el=document.querySelector(id);if(!el)return;el.innerHTML=items.map((x,i)=>`<div class="record-row ${klass}"><span class="record-rank">#${i+1}</span><div class="record-team">${identityHTML(x.year,x.owner,x.team)}<span class="record-context">${esc(contextFn(x))}</span></div><span class="record-value">${esc(valueFn(x))}</span></div>`).join('')}
function renderGameRecords(id,items,valueFn,kind=''){const el=document.querySelector(id);if(!el)return;el.innerHTML=items.map((x,i)=>{const opp=teamInfo(x.year,x.opponent,x.opponent);return `<article class="record-matchup ${kind}"><div class="record-matchup-top"><span class="record-matchup-rank">#${i+1}</span><span class="record-matchup-value">${esc(valueFn(x))}</span></div><div class="matchup-line">${identityHTML(x.year,x.owner,x.team)}<span class="score">${fmt(x.score)}</span></div><div class="matchup-line">${identityHTML(x.year,x.opponent,opp.team)}<span class="score muted-score">${fmt(x.oppScore)}</span></div><div class="record-matchup-foot">${esc(x.year)} • ${esc(String(x.week).toUpperCase())}</div></article>`}).join('')}
function streakRecords(outcome){const result=[],keys=[...new Set(ledger.map(x=>`${x.year}\u0000${x.owner}`))];for(const key of keys){const [year,owner]=key.split('\u0000'),games=ledger.filter(x=>x.year===year&&x.owner===owner).sort((a,b)=>weekOrder(a.week)-weekOrder(b.week));let run=0,best=0,team=owner;for(const g of games){if(g.outcome===outcome){run++;if(run>best){best=run;team=g.team}}else if(g.outcome==='w'||g.outcome==='l')run=0}if(best)result.push({year,owner,team,streak:best})}return result.sort((a,b)=>b.streak-a.streak||+b.year-+a.year).slice(0,5)}
function seasonRecords(){const map=new Map();for(const x of ledger.filter(x=>!x.week.startsWith('P'))){const k=`${x.year}\u0000${x.owner}`;if(!map.has(k))map.set(k,{year:x.year,owner:x.owner,team:x.team,total:0,games:0});const s=map.get(k);s.total+=x.score;s.games++}const yearMax=new Map();for(const s of map.values())yearMax.set(s.year,Math.max(yearMax.get(s.year)||0,s.games));const latest=Math.max(...[...yearMax.keys()].map(Number)),latestComplete=[...map.values()].filter(s=>+s.year===latest).every(s=>s.games>=14);return [...map.values()].filter(s=>s.games===yearMax.get(s.year)&&(+s.year<latest||latestComplete))}
function renderRecords(){const hi=topWeekly(true).slice(0,10),lo=topWeekly(false).slice(0,10),games=winnerGames();renderSimpleRecords('#highestScores',hi,x=>fmt(x.score),x=>`${x.year} • ${String(x.week).toUpperCase()}`);renderSimpleRecords('#lowestScores',lo,x=>fmt(x.score),x=>`${x.year} • ${String(x.week).toUpperCase()}`);renderGameRecords('#closestGames',[...games].sort((a,b)=>Math.abs(a.score-a.oppScore)-Math.abs(b.score-b.oppScore)).slice(0,10),x=>`${fmt(Math.abs(x.score-x.oppScore))} PTS`,'closest');renderGameRecords('#biggestBlowouts',[...games].sort((a,b)=>Math.abs(b.score-b.oppScore)-Math.abs(a.score-a.oppScore)).slice(0,10),x=>`${fmt(Math.abs(x.score-x.oppScore))} PTS`,'largest');const ws=streakRecords('w'),ls=streakRecords('l');renderSimpleRecords('#winStreaks',ws,x=>`W${x.streak}`,x=>x.year,'streak-win');renderSimpleRecords('#lossStreaks',ls,x=>`L${x.streak}`,x=>x.year,'streak-loss');const seasons=seasonRecords();renderSimpleRecords('#highestSeasons',[...seasons].sort((a,b)=>b.total-a.total).slice(0,5),x=>fmt(x.total),x=>x.year);renderSimpleRecords('#lowestSeasons',[...seasons].sort((a,b)=>a.total-b.total).slice(0,5),x=>fmt(x.total),x=>x.year);renderGameRecords('#highestMatchups',[...games].sort((a,b)=>(b.score+b.oppScore)-(a.score+a.oppScore)).slice(0,5),x=>`${fmt(x.score+x.oppScore)} TOTAL`);renderGameRecords('#lowestMatchups',[...games].sort((a,b)=>(a.score+a.oppScore)-(b.score+b.oppScore)).slice(0,5),x=>`${fmt(x.score+x.oppScore)} TOTAL`)}
load();
