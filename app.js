const URLS={ledger:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRdfwYE5J9C4n7NSaU_2HT0E7zrdSZoHZOultcBjsroqoGPE1sdoTjarHDUcpctSJOMzt9fTJjokxG/pub?gid=2024407837&single=true&output=csv',settings:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRdfwYE5J9C4n7NSaU_2HT0E7zrdSZoHZOultcBjsroqoGPE1sdoTjarHDUcpctSJOMzt9fTJjokxG/pub?gid=130130682&single=true&output=csv',home:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRdfwYE5J9C4n7NSaU_2HT0E7zrdSZoHZOultcBjsroqoGPE1sdoTjarHDUcpctSJOMzt9fTJjokxG/pub?gid=2092058691&single=true&output=csv'};
function csv(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}else if(c===','&&!q){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
const num=v=>{const n=parseFloat(String(v).replace(/[$,%]/g,''));return Number.isFinite(n)?n:0},fmt=n=>Number(n).toFixed(2),pct=n=>Number(n).toFixed(3).replace(/^0/,''),weekOrder=w=>/^\d+$/.test(w)?+w:({'P Wild Card':15,'P Semis':16,'P Finals':17}[w]??99),esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let ledger=[],teams=[],champions=[];
const ROOT=document.body.dataset.root||'';
const FALLBACK_LOGO=ROOT+'league-logo.png';
function assetPath(src){src=String(src||'').trim();if(!src)return FALLBACK_LOGO;if(/^(?:https?:)?\/\//i.test(src)||src.startsWith('data:')||src.startsWith('/'))return src;return ROOT+src.replace(/^\.\//,'')}
function setupNav(){const b=document.querySelector('#navToggle'),s=document.querySelector('#sidebar');if(b&&s){b.addEventListener('click',()=>s.classList.toggle('open'));document.addEventListener('click',e=>{if(innerWidth<=850&&s.classList.contains('open')&&!s.contains(e.target)&&e.target!==b)s.classList.remove('open')})}}
async function load(){setupNav();try{const page=document.body.dataset.page||'home';const needed=page==='records'?[URLS.ledger,URLS.settings]:[URLS.ledger,URLS.settings,URLS.home];const texts=await Promise.all(needed.map(u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.text()})));const lr=csv(texts[0]),sr=csv(texts[1]);ledger=lr.slice(1).filter(r=>r[0]&&r[3]&&r[4]).map(r=>({owner:r[0].trim(),score:num(r[1]),opponent:r[2].trim(),year:String(r[3]).replace(/\.0$/,''),week:r[4].trim(),team:(r[5]||r[0]).trim(),oppScore:num(r[6]),outcome:(r[7]||'').trim().toLowerCase(),diff:num(r[12])}));parseTeams(sr);if(page==='records'){renderRecords();document.querySelector('#status').textContent='Live records loaded';return}const hr=csv(texts[2]);renderLeague(sr);parseChampions(hr);renderChampion();renderShrine();setupSelectors();document.querySelector('#status').textContent='Live data loaded'}catch(e){const status=document.querySelector('#status');if(status)status.textContent='Could not load live data';console.error(e)}}
function renderLeague(r){const at=(row,col)=>r[row-1]?.[col-1]?.trim()||'';document.querySelector('#leagueName').textContent=at(5,7)||'Rumble of Regards NFL';const size=at(17,7),info=at(8,7);document.querySelector('#leagueMeta').textContent=[size?`${parseInt(size)} Team`:'',info].filter(Boolean).join(' • ')}
function parseTeams(r){teams=[];for(let i=4;i<r.length;i++){const row=r[i]||[],year=String(row[0]||'').replace(/\.0$/,'').trim(),owner=String(row[1]||'').trim(),team=String(row[2]||'').trim(),logo=String(row[4]||'').trim();if(/^\d{4}$/.test(year)&&owner&&team)teams.push({year,owner,team,logo:logo||FALLBACK_LOGO})}}
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
function recordIdentity(year,owner,team){return identityHTML(String(year),owner,team,'team-logo')}
function renderRecordRows(id,items,valueFn,detailFn){const el=document.querySelector(id);if(!el)return;el.innerHTML=items.map((x,i)=>`<div class="record-row"><span class="record-rank">${i+1}</span><div>${recordIdentity(x.year,x.owner,x.team)}<div class="record-detail">${detailFn(x)}</div></div><span class="record-value">${valueFn(x)}</span></div>`).join('')||'<p class="muted">No record data.</p>'}
function recordGameHTML(x,i,label,value){const winner=teamInfo(x.year,x.owner,x.team),loser=teamInfo(x.year,x.opponent,x.opponent);return `<article class="record-game"><div class="record-game-head"><span>#${i+1} • ${esc(x.year)} • ${esc(x.week)}</span><strong>${esc(value)}${label?' '+esc(label):''}</strong></div><div class="game-team winner">${recordIdentity(x.year,x.owner,winner.team)}<span class="game-score">${fmt(x.score)}</span></div><div class="game-team loser">${recordIdentity(x.year,x.opponent,loser.team)}<span class="game-score">${fmt(x.oppScore)}</span></div></article>`}
function renderRecordGames(id,items,kind){const el=document.querySelector(id);if(!el)return;el.innerHTML=items.map((x,i)=>{const value=kind==='total'?fmt(x.score+x.oppScore):fmt(Math.abs(x.score-x.oppScore));return recordGameHTML(x,i,kind==='total'?'total':'pts',value)}).join('')||'<p class="muted">No record data.</p>'}
function calculateStreaks(type){const out=[];const owners=[...new Set(ledger.map(x=>x.owner))];for(const owner of owners){const years=[...new Set(ledger.filter(x=>x.owner===owner).map(x=>x.year))];for(const year of years){const games=ledger.filter(x=>x.owner===owner&&x.year===year).sort((a,b)=>weekOrder(a.week)-weekOrder(b.week));let n=0,best=0;for(const g of games){if(g.outcome===type){n++;best=Math.max(best,n)}else if(g.outcome==='w'||g.outcome==='l')n=0}if(best){const sample=games.find(g=>g.team)||games[0];out.push({owner,year,team:sample?.team||owner,streak:best})}}}return out.sort((a,b)=>b.streak-a.streak||+b.year-+a.year).slice(0,5)}
function calculateSeasons(){const completedYears=new Set(ledger.filter(x=>String(x.week).trim()==='14').map(x=>x.year));const map=new Map;for(const x of ledger.filter(x=>completedYears.has(x.year)&&/^\d+$/.test(String(x.week).trim())&&Number(x.week)<=14)){const k=`${x.year}|${x.owner}`;if(!map.has(k))map.set(k,{year:x.year,owner:x.owner,team:x.team,score:0});map.get(k).score+=x.score}return [...map.values()]}
function renderRecords(){const all=[...ledger].filter(x=>x.outcome==='w'||x.outcome==='l');renderRecordRows('#highestScores',[...all].sort((a,b)=>b.score-a.score).slice(0,10),x=>fmt(x.score),x=>`${esc(x.year)} • ${esc(x.week)}`);renderRecordRows('#lowestScores',[...all].sort((a,b)=>a.score-b.score).slice(0,10),x=>fmt(x.score),x=>`${esc(x.year)} • ${esc(x.week)}`);const wins=ledger.filter(x=>x.outcome==='w');renderRecordGames('#closestGames',[...wins].sort((a,b)=>Math.abs(a.score-a.oppScore)-Math.abs(b.score-b.oppScore)).slice(0,10),'margin');renderRecordGames('#biggestBlowouts',[...wins].sort((a,b)=>Math.abs(b.score-b.oppScore)-Math.abs(a.score-a.oppScore)).slice(0,10),'margin');renderRecordRows('#winStreaks',calculateStreaks('w'),x=>`W${x.streak}`,x=>esc(x.year));renderRecordRows('#lossStreaks',calculateStreaks('l'),x=>`L${x.streak}`,x=>esc(x.year));const seasons=calculateSeasons();renderRecordRows('#highSeasons',[...seasons].sort((a,b)=>b.score-a.score).slice(0,5),x=>fmt(x.score),x=>`${esc(x.year)} • Regular season`);renderRecordRows('#lowSeasons',[...seasons].sort((a,b)=>a.score-b.score).slice(0,5),x=>fmt(x.score),x=>`${esc(x.year)} • Regular season`);renderRecordGames('#highMatchups',[...wins].sort((a,b)=>(b.score+b.oppScore)-(a.score+a.oppScore)).slice(0,5),'total');renderRecordGames('#lowMatchups',[...wins].sort((a,b)=>(a.score+a.oppScore)-(b.score+b.oppScore)).slice(0,5),'total')}

load();
