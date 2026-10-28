const URLS={ledger:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=1562226911&single=true&output=csv',settings:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=2117014766&single=true&output=csv',home:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=847843630&single=true&output=csv',schedule:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=203232805&single=true&output=csv',draftHistory:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=388595968&single=true&output=csv',rosterSnapshots:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=515398859&single=true&output=csv',rosterMoves:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXrlutk_HgerfirsdUdHee4iSlWc9iG8PuyQx7CvtLcKI5knCtkG09WXN5C--NkTXt9Rr7ULzX_2f/pub?gid=435094542&single=true&output=csv'};
function csv(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}else if(c===','&&!q){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
const num=v=>{const n=parseFloat(String(v).replace(/[$,%]/g,''));return Number.isFinite(n)?n:0},nullableNum=v=>{const raw=String(v??'').trim();if(!raw)return null;const n=parseFloat(raw.replace(/[$,%]/g,''));return Number.isFinite(n)?n:null},parsePercent=v=>{const raw=String(v??'').trim();if(!raw)return null;const n=num(raw);return raw.includes('%')||Math.abs(n)>1?n/100:n},fmt=n=>Number(n).toFixed(2),pct=n=>Number(n).toFixed(3).replace(/^0/,''),displayWeek=w=>/^\d+$/.test(String(w))?`Week ${w}`:String(w),weekOrder=w=>/^\d+$/.test(w)?+w:({'P Wild Card':15,'P Semis':16,'P Finals':17}[w]??99),esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let scheduleData=[];
let ledger=[],teams=[],champions=[];
const ROOT=document.body.dataset.root||'';
const FALLBACK_LOGO=ROOT+'league-logo.png';
function assetPath(src){src=String(src||'').trim();if(!src)return FALLBACK_LOGO;if(/^(?:https?:)?\/\//i.test(src)||src.startsWith('data:')||src.startsWith('/'))return src;return ROOT+src.replace(/^\.\//,'')}
function setupNav(){
  const b=document.querySelector('#navToggle'),s=document.querySelector('#sidebar');
  if(s){
    const nav=s.querySelector('.side-nav');
    if(nav){
      // Normalize Trade Recap navigation on every page: remove stale/duplicate
      // copies, then insert exactly one link immediately after Draft Recap.
      [...nav.querySelectorAll('a')]
        .filter(a=>/^trade recap$/i.test(a.textContent.trim()))
        .forEach(a=>a.remove());
      const draft=[...nav.querySelectorAll('a')]
        .find(a=>/^draft recap$/i.test(a.textContent.trim()));
      if(draft){
        const a=document.createElement('a');
        a.href=ROOT+'trade-recap/';
        a.textContent='Trade Recap';
        if((document.body.dataset.page||'')==='trade-recap')a.classList.add('active');
        draft.insertAdjacentElement('afterend',a);
      }
    }
  }
  if(b&&s){b.addEventListener('click',()=>s.classList.toggle('open'));document.addEventListener('click',e=>{if(innerWidth<=850&&s.classList.contains('open')&&!s.contains(e.target)&&e.target!==b)s.classList.remove('open')})}
}
async function load(){setupNav();try{const page=document.body.dataset.page||'home';if(page==='roster-history'){await loadRosterHistoryPage();return;}if(page==='draft-recap'){await loadDraftRecapPage();return;}if(page==='trade-recap'){await loadTradeRecapPage();return;}const analysisPage=(page==='records'||page==='managers'||page==='research'||page==='dynasty'||page==='power-rankings'||page==='schedule-comparison'||page==='playoff-machine'||page==='playoff-odds');const needed=analysisPage?[URLS.ledger,URLS.settings]:[URLS.ledger,URLS.settings,URLS.home];if(page==='playoff-machine'||page==='playoff-odds')needed.push(URLS.schedule);const texts=await Promise.all(needed.map(u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.text()})));const lr=csv(texts[0]),sr=csv(texts[1]);ledger=lr.slice(1).filter(r=>r[0]&&r[3]&&r[4]).map(r=>({owner:r[0].trim(),score:num(r[1]),opponent:r[2].trim(),year:String(r[3]).replace(/\.0$/,''),week:r[4].trim(),team:(r[5]||r[0]).trim(),oppScore:num(r[6]),outcome:(r[7]||'').trim().toLowerCase(),diff:num(r[12]),median:num(r[8]),weekRank:num(r[10]),consistency:num(r[11]),winStreak:num(r[14]),lossStreak:num(r[16]),medianOutcome:(r[9]||'').trim().toLowerCase(),seasonPoints:nullableNum(r[18]),seasonFinalPoints:nullableNum(r[20]),likelihood:parsePercent(r[22]),oppLikelihood:parsePercent(r[23])}));parseTeams(sr);if(page==='playoff-machine'||page==='playoff-odds'){const sched=csv(texts[2]);scheduleData=sched.slice(1).filter(r=>r[0]&&r[1]&&r[2]&&r[3]).map(r=>({year:String(r[0]).replace(/\.0$/,''),week:+r[1],a:r[2].trim(),b:r[3].trim()}));}if(page==='records'){renderRecords();document.querySelector('#status').textContent='Live records loaded';return}if(page==='managers'){setupManagerPage();document.querySelector('#status').textContent='Live manager history loaded';return}if(page==='research'){setupResearchPage();document.querySelector('#status').textContent='Live research data loaded';return}if(page==='dynasty'){setupDynastyPage();document.querySelector('#status').textContent='Live dynasty data loaded';return}if(page==='power-rankings'){setupPowerRankingsPage();document.querySelector('#status').textContent='Live power rankings loaded';return}if(page==='schedule-comparison'){setupScheduleComparisonPage();document.querySelector('#status').textContent='Live schedule comparison loaded';return}if(page==='playoff-machine'){setupPlayoffMachinePage();return}if(page==='playoff-odds'){setupPlayoffOddsPage();return}const hr=csv(texts[2]);renderLeague(sr);parseChampions(hr);renderChampion();renderShrine();setupSelectors();document.querySelector('#status').textContent='Live data loaded'}catch(e){const status=document.querySelector('#status');if(status)status.textContent='Could not load live data';console.error(e)}}
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
function recordGameHTML(x,i,label,value){const winner=teamInfo(x.year,x.owner,x.team),loser=teamInfo(x.year,x.opponent,x.opponent);return `<article class="record-game"><div class="record-game-head"><span>#${i+1} • ${esc(x.year)} • ${esc(displayWeek(x.week))}</span><strong>${esc(value)}${label?' '+esc(label):''}</strong></div><div class="game-team winner">${recordIdentity(x.year,x.owner,winner.team)}<span class="game-score">${fmt(x.score)}</span></div><div class="game-team loser">${recordIdentity(x.year,x.opponent,loser.team)}<span class="game-score">${fmt(x.oppScore)}</span></div></article>`}
function renderRecordGames(id,items,kind){const el=document.querySelector(id);if(!el)return;el.innerHTML=items.map((x,i)=>{const value=kind==='total'?fmt(x.score+x.oppScore):fmt(Math.abs(x.score-x.oppScore));return recordGameHTML(x,i,kind==='total'?'total':'pts',value)}).join('')||'<p class="muted">No record data.</p>'}
function calculateStreaks(type){const out=[];const owners=[...new Set(ledger.map(x=>x.owner))];for(const owner of owners){const years=[...new Set(ledger.filter(x=>x.owner===owner).map(x=>x.year))];for(const year of years){const games=ledger.filter(x=>x.owner===owner&&x.year===year).sort((a,b)=>weekOrder(a.week)-weekOrder(b.week));let n=0,best=0;for(const g of games){if(g.outcome===type){n++;best=Math.max(best,n)}else if(g.outcome==='w'||g.outcome==='l')n=0}if(best){const sample=games.find(g=>g.team)||games[0];out.push({owner,year,team:sample?.team||owner,streak:best})}}}return out.sort((a,b)=>b.streak-a.streak||+b.year-+a.year).slice(0,5)}
function calculateSeasons(){const completedYears=new Set(ledger.filter(x=>String(x.week).trim()==='14').map(x=>x.year));const map=new Map;for(const x of ledger.filter(x=>completedYears.has(x.year)&&/^\d+$/.test(String(x.week).trim())&&Number(x.week)<=14)){const k=`${x.year}|${x.owner}`;if(!map.has(k))map.set(k,{year:x.year,owner:x.owner,team:x.team,score:0});map.get(k).score+=x.score}return [...map.values()]}
function renderRecords(){const all=[...ledger].filter(x=>x.outcome==='w'||x.outcome==='l');renderRecordRows('#highestScores',[...all].sort((a,b)=>b.score-a.score).slice(0,10),x=>fmt(x.score),x=>`${esc(x.year)} • ${esc(displayWeek(x.week))}`);renderRecordRows('#lowestScores',[...all].sort((a,b)=>a.score-b.score).slice(0,10),x=>fmt(x.score),x=>`${esc(x.year)} • ${esc(displayWeek(x.week))}`);const wins=ledger.filter(x=>x.outcome==='w');renderRecordGames('#closestGames',[...wins].sort((a,b)=>Math.abs(a.score-a.oppScore)-Math.abs(b.score-b.oppScore)).slice(0,10),'margin');renderRecordGames('#biggestBlowouts',[...wins].sort((a,b)=>Math.abs(b.score-b.oppScore)-Math.abs(a.score-a.oppScore)).slice(0,10),'margin');renderRecordRows('#winStreaks',calculateStreaks('w'),x=>`W${x.streak}`,x=>esc(x.year));renderRecordRows('#lossStreaks',calculateStreaks('l'),x=>`L${x.streak}`,x=>esc(x.year));const seasons=calculateSeasons();renderRecordRows('#highSeasons',[...seasons].sort((a,b)=>b.score-a.score).slice(0,5),x=>fmt(x.score),x=>esc(x.year));renderRecordRows('#lowSeasons',[...seasons].sort((a,b)=>a.score-b.score).slice(0,5),x=>fmt(x.score),x=>esc(x.year));renderRecordGames('#highMatchups',[...wins].sort((a,b)=>(b.score+b.oppScore)-(a.score+a.oppScore)).slice(0,5),'total');renderRecordGames('#lowMatchups',[...wins].sort((a,b)=>(a.score+a.oppScore)-(b.score+b.oppScore)).slice(0,5),'total')}

function setupManagerPage(){
  const owners=[...new Set(ledger.map(x=>x.owner).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),sel=document.querySelector('#managerSelect');
  sel.innerHTML=owners.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');
  const saved=localStorage.getItem('ror-manager');sel.value=owners.includes(saved)?saved:owners[0];
  sel.onchange=()=>{localStorage.setItem('ror-manager',sel.value);renderManager(sel.value)};renderManager(sel.value);
}
function managerStat(label,value){return `<div class="career-stat"><span>${esc(label)}</span><strong>${value}</strong></div>`}
function renderManager(owner){
  const rows=ledger.filter(x=>x.owner===owner),years=[...new Set(rows.map(x=>x.year))].sort((a,b)=>+b-+a),latest=years[0],ti=teamInfo(latest,owner,rows.find(x=>x.year===latest)?.team||owner);
  const logo=document.querySelector('#managerLogo');logo.src=assetPath(ti.logo);logo.onerror=()=>{logo.onerror=null;logo.src=FALLBACK_LOGO};document.querySelector('#managerName').textContent=owner;document.querySelector('#managerTeam').textContent=ti.team;
  const regular=rows.filter(x=>!x.week.startsWith('P')),w=regular.filter(x=>x.outcome==='w').length,l=regular.filter(x=>x.outcome==='l').length,pf=regular.reduce((s,x)=>s+x.score,0),pa=regular.reduce((s,x)=>s+x.oppScore,0),g=w+l;
  document.querySelector('#careerRegular').innerHTML=[managerStat('Career Record',`${w}-${l}`),managerStat('Points For',fmt(pf)),managerStat('Points Against',fmt(pa)),managerStat('PF / Game',fmt(g?pf/g:0)),managerStat('PA / Game',fmt(g?pa/g:0))].join('');
  document.querySelector('#seasonHistory').innerHTML=years.map(y=>{const r=regular.filter(x=>x.year===y),sw=r.filter(x=>x.outcome==='w').length,sl=r.filter(x=>x.outcome==='l').length,spf=r.reduce((s,x)=>s+x.score,0),spa=r.reduce((s,x)=>s+x.oppScore,0),sg=sw+sl,info=teamInfo(y,owner,r[0]?.team||owner);return `<tr><td>${esc(y)}</td><td>${identityHTML(y,owner,info.team,'stand-logo')}</td><td>${sw}-${sl}</td><td>${fmt(spf)}</td><td>${fmt(spa)}</td><td>${fmt(sg?spf/sg:0)}</td><td>${fmt(sg?spa/sg:0)}</td></tr>`}).join('');
  const scores=rows.map(x=>x.score),low=Math.min(...scores),high=Math.max(...scores),bestW=Math.max(0,...rows.map(x=>x.winStreak||0)),worstL=Math.max(0,...rows.map(x=>x.lossStreak||0));
  document.querySelector('#careerRecords').innerHTML=[managerStat('Lowest Score',fmt(low)),managerStat('Highest Score',fmt(high)),managerStat('Longest Winning Streak',`W${bestW}`),managerStat('Longest Losing Streak',`L${worstL}`)].join('');
  const opponents=[...new Set(rows.map(x=>x.opponent).filter(Boolean))].sort((a,b)=>a.localeCompare(b));document.querySelector('#h2h').innerHTML=opponents.map(o=>{const r=rows.filter(x=>x.opponent===o),ow=r.filter(x=>x.outcome==='w').length,ol=r.filter(x=>x.outcome==='l').length,oa=r.length?r.reduce((s,x)=>s+x.oppScore,0)/r.length:0,ma=r.length?r.reduce((s,x)=>s+x.score,0)/r.length:0;return `<tr><td>${esc(o)}</td><td>${fmt(ma)}</td><td>${fmt(oa)}</td><td>${ow}</td><td>${ol}</td></tr>`}).join('');
  const rounds=['P Wild Card','P Semis','P Finals'];document.querySelector('#playoffs').innerHTML=rounds.map(round=>{const r=rows.filter(x=>x.week===round),rw=r.filter(x=>x.outcome==='w').length,rl=r.filter(x=>x.outcome==='l').length,ys=[...new Set(r.map(x=>x.year))].sort((a,b)=>+a-+b);return `<tr><td>${esc(round.replace('P ',''))}</td><td>${rw}</td><td>${rl}</td><td>${ys.length?ys.join(', '):'—'}</td></tr>`}).join('');
  const currentYear=[...new Set(ledger.map(x=>x.year))].sort((a,b)=>+b-+a)[0],cur=rows.filter(x=>x.year===currentYear&&/^\d+$/.test(x.week)).sort((a,b)=>+a.week-+b.week);document.querySelector('#currentSeasonTitle').textContent=`${currentYear} Weekly Performance`;document.querySelector('#currentSeason').innerHTML=cur.map(x=>`<tr><td>${esc(x.week)}</td><td>${fmt(x.score)}</td><td>${fmt(x.median)}</td><td>${x.weekRank||0}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No current-season games.</td></tr>';
}

function setupResearchPage(){
  const years=[...new Set(ledger.filter(x=>/^\d+$/.test(x.week)).map(x=>x.year))].sort((a,b)=>+b-+a),ys=document.querySelector('#researchYear'),ss=document.querySelector('#researchStart'),es=document.querySelector('#researchEnd');
  ys.innerHTML=years.map(y=>`<option>${y}</option>`).join('');const saved=localStorage.getItem('ror-research-year');ys.value=years.includes(saved)?saved:years[0];
  function fill(){const weeks=[...new Set(ledger.filter(x=>x.year===ys.value&&/^\d+$/.test(x.week)).map(x=>+x.week))].sort((a,b)=>a-b);ss.innerHTML=weeks.map(w=>`<option>${w}</option>`).join('');es.innerHTML=ss.innerHTML;ss.value=String(weeks[0]||1);es.value=String(weeks.at(-1)||14);renderResearch()}
  ys.onchange=()=>{localStorage.setItem('ror-research-year',ys.value);fill()};ss.onchange=renderResearch;es.onchange=renderResearch;fill();
}
function researchTeamCell(y,x){return identityHTML(y,x.owner,x.team,'stand-logo')}
function researchMatrix(target,rows,weeks,metrics){const head=`<tr><th>Rank</th><th>Team</th>${weeks.map(w=>metrics.map(m=>`<th>W${w} ${m.label}</th>`).join('')).join('')}<th>Average</th></tr>`;const body=rows.map((t,i)=>`<tr><td>${i+1}</td><td>${researchTeamCell(t.year,t)}</td>${weeks.map(w=>metrics.map(m=>`<td>${m.format(t.byWeek.get(w)?.[m.key]??0)}</td>`).join('')).join('')}<td><strong>${fmt(t.avg)}</strong></td></tr>`).join('');document.querySelector(target).innerHTML=`<thead>${head}</thead><tbody>${body}</tbody>`}
function renderResearch(){let y=document.querySelector('#researchYear').value,start=+document.querySelector('#researchStart').value,end=+document.querySelector('#researchEnd').value;if(start>end){[start,end]=[end,start]}const weeks=[];for(let w=start;w<=end;w++)weeks.push(w);const rows=ledger.filter(x=>x.year===y&&/^\d+$/.test(x.week)&&+x.week>=start&&+x.week<=end),owners=[...new Set(rows.map(x=>x.owner))];
  function build(avgKey,fn){return owners.map(owner=>{const games=rows.filter(x=>x.owner===owner),latest=games.at(-1),byWeek=new Map(games.map(g=>[+g.week,{pf:g.score,pa:g.oppScore,diff:g.score-g.oppScore,total:g.score+g.oppScore,cons:g.consistency}]));return {year:y,owner,team:latest?.team||owner,byWeek,avg:fn(games)}}).sort((a,b)=>b.avg-a.avg)}
  const pf=build('pf',g=>g.reduce((s,x)=>s+x.score,0)/(g.length||1));researchMatrix('#researchPF',pf,weeks,[{key:'pf',label:'PF',format:fmt},{key:'pa',label:'PA',format:fmt}]);
  const diff=build('diff',g=>g.reduce((s,x)=>s+(x.score-x.oppScore),0)/(g.length||1));researchMatrix('#researchDiff',diff,weeks,[{key:'diff',label:'DIFF',format:fmt},{key:'total',label:'TOTAL',format:fmt}]);
  const cons=build('cons',g=>g.reduce((s,x)=>s+x.consistency,0)/(g.length||1));researchMatrix('#researchConsistency',cons,weeks,[{key:'cons',label:'SCORE',format:n=>String(Number(n).toFixed(0))}]);
  document.querySelector('#researchRange').textContent=`${y} • Weeks ${start}–${end}`;
}


function percentile(vals,p){const a=vals.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const k=(a.length-1)*p,f=Math.floor(k),c=Math.ceil(k);return f===c?a[f]:a[f]+(a[c]-a[f])*(k-f)}
function percentileRank(v,vals){const a=vals.filter(Number.isFinite).sort((x,y)=>x-y);if(a.length<=1)return 1;let below=0,equal=0;for(const x of a){if(x<v)below++;else if(x===v)equal++}return (below+(Math.max(equal,1)-1)/2)/(a.length-1)}
function dynastyGrade(score){if(score>=.99)return'S';if(score>.95)return'A+';if(score>=.9)return'A';if(score>=.85)return'A-';if(score>=.8)return'B+';if(score>=.7)return'B';if(score>=.6)return'B-';if(score>=.5)return'C+';if(score>=.4)return'C';if(score>=.3)return'C-';return'D'}
function dynastyStats(owner){const all=ledger.filter(x=>x.owner===owner),reg=all.filter(x=>/^\d+$/.test(x.week)),play=all.filter(x=>x.week.startsWith('P'));
 const games=reg.length, mw=reg.filter(x=>x.outcome==='w').length, medw=reg.filter(x=>x.medianOutcome==='w').length;
 const matchupPct=games?mw/games:0, medianPct=games?medw/games:0, totalPct=games?(mw+medw)/(games*2):0;
 // Dynasty!24: SUMIF(owner, score) / COUNTIF(owner). This intentionally includes playoff rows.
 const ppw=all.length?all.reduce((a,x)=>a+x.score,0)/all.length:0;
 // Dynasty!25: MAX(owner's S) + MIN(owner's U). S/U are the sheet's season-total helper columns.
 const svals=all.map(x=>x.seasonPoints).filter(Number.isFinite),uvals=all.map(x=>x.seasonFinalPoints).filter(Number.isFinite),volatility=(svals.length?Math.max(...svals):0)+(uvals.length?Math.min(...uvals):0);
 const playoffYears=new Set(play.map(x=>x.year)).size, playoffWins=play.filter(x=>x.outcome==='w').length, finals=all.filter(x=>x.week.includes('Finals')), finalApps=finals.length, titles=finals.filter(x=>x.outcome==='w').length;
 // AVERAGEIF ignores blank cells. Do the same instead of treating blanks as zero.
 const lik=all.map(x=>x.likelihood).filter(Number.isFinite),oppLik=all.map(x=>x.oppLikelihood).filter(Number.isFinite);
 const avgLik=lik.length?lik.reduce((a,x)=>a+x,0)/lik.length:0, avgOpp=oppLik.length?oppLik.reduce((a,x)=>a+x,0)/oppLik.length:0, luck=totalPct-avgLik;
 // Dynasty!35: SUMIF consistency / count of non-playoff rows.
 const cons=reg.length?all.reduce((a,x)=>a+x.consistency,0)/reg.length:0;
 // Exact Dynasty!33 formula.
 const prestige=((medianPct*100)+(matchupPct*300)+(avgLik*200)*.5+(ppw*1.5)+(volatility/30)+(playoffYears*10)+(playoffWins*10)+(finalApps*10)+(titles*75)+(cons*30))/10;
 const latest=[...all].sort((a,b)=>+b.year-+a.year||weekOrder(b.week)-weekOrder(a.week))[0];return{owner,totalPct,matchupPct,medianPct,ppw,volatility,playoffYears,playoffWins,finalApps,titles,avgLik,avgOpp,luck,cons,prestige,year:latest?.year||'',team:latest?.team||owner}}
function setupDynastyPage(){const box=document.querySelector('#includeDefunct'),sort=document.querySelector('#dynastySort');box.checked=localStorage.getItem('ror-dynasty-defunct')==='1';sort.value=localStorage.getItem('ror-dynasty-sort')||'prestige';box.onchange=()=>{localStorage.setItem('ror-dynasty-defunct',box.checked?'1':'0');renderDynasty()};sort.onchange=()=>{localStorage.setItem('ror-dynasty-sort',sort.value);renderDynasty()};renderDynasty()}
function renderDynasty(){const latestYear=[...new Set(ledger.map(x=>x.year))].sort((a,b)=>+b-+a)[0],current=new Set(ledger.filter(x=>x.year===latestYear).map(x=>x.owner)),allOwners=[...new Set(ledger.map(x=>x.owner))],owners=document.querySelector('#includeDefunct').checked?allOwners:allOwners.filter(x=>current.has(x));let rows=owners.map(dynastyStats);const allPrestige=rows.map(x=>x.prestige),allConsistency=rows.map(x=>x.cons);rows.forEach(x=>{x.gradeScore=percentileRank(x.prestige,allPrestige)*.7+percentileRank(x.cons,allConsistency)*.3;x.grade=dynastyGrade(x.gradeScore)});const sortBy=document.querySelector('#dynastySort').value;rows.sort((a,b)=>sortBy==='consistency'?(b.cons-a.cons||b.prestige-a.prestige):(b.prestige-a.prestige||b.cons-a.cons));rows.forEach((x,i)=>x.rank=i+1);
 const top=rows.slice(0,3),metric=sortBy==='consistency'?'Consistency':'Prestige';document.querySelector('#dynastyPodium').innerHTML=top.map(x=>`<article class="dynasty-podium"><span class="dynasty-rank">#${x.rank}</span>${identityHTML(x.year,x.owner,x.team,'history-logo')}<strong>${sortBy==='consistency'?x.cons.toFixed(2):fmt(x.prestige)}</strong><small>${metric}</small><div class="dynasty-core"><span>Prestige <b>${fmt(x.prestige)}</b></span><span>Consistency <b>${x.cons.toFixed(2)}</b></span><span>Grade <b>${x.grade}</b></span></div></article>`).join('');
 const head=`<tr><th>${metric} Rank</th><th>Manager</th><th>Prestige</th><th>Consistency</th><th>Dynasty Grade</th><th>Total Win %</th><th>Matchup Win %</th><th>Median Win %</th><th>PPW</th><th>Season Volatility</th><th>Playoff Apps</th><th>Playoff Wins</th><th>Finals Apps</th><th>Titles</th><th>Avg Likelihood</th><th>Opp Likelihood</th><th>Luck</th></tr>`;
 document.querySelector('#dynastyTable').innerHTML=`<thead>${head}</thead><tbody>${rows.map(x=>`<tr><td><strong>#${x.rank}</strong></td><td>${identityHTML(x.year,x.owner,x.team,'stand-logo')}</td><td><strong>${fmt(x.prestige)}</strong></td><td><strong>${x.cons.toFixed(2)}</strong></td><td><strong>${x.grade}</strong></td><td>${(x.totalPct*100).toFixed(1)}%</td><td>${(x.matchupPct*100).toFixed(1)}%</td><td>${(x.medianPct*100).toFixed(1)}%</td><td>${fmt(x.ppw)}</td><td>${fmt(x.volatility)}</td><td>${x.playoffYears}</td><td>${x.playoffWins}</td><td>${x.finalApps}</td><td>${x.titles}</td><td>${(x.avgLik*100).toFixed(2)}%</td><td>${(x.avgOpp*100).toFixed(2)}%</td><td>${x.luck>=0?'+':''}${(x.luck*100).toFixed(2)}%</td></tr>`).join('')}</tbody>`;
 document.querySelector('#dynastyCount').textContent=`Comparing ${rows.length} manager${rows.length===1?'':'s'} • ${document.querySelector('#includeDefunct').checked?'All historical teams':'Current teams only'} • Sorted by ${metric}`}


function setupPowerRankingsPage(){
  const ys=document.querySelector('#powerYear'),ws=document.querySelector('#powerWeek');
  const years=[...new Set((scheduleData.length?scheduleData.map(x=>x.year):ledger.filter(x=>/^\d+$/.test(x.week)).map(x=>x.year)))].sort((a,b)=>+b-+a);
  ys.innerHTML=years.map(y=>`<option>${y}</option>`).join('');
  const savedYear=localStorage.getItem('ror-power-year');ys.value=years.includes(savedYear)?savedYear:years[0];
  function fillWeeks(){
    const weeks=[...new Set(ledger.filter(x=>x.year===ys.value&&/^\d+$/.test(x.week)).map(x=>+x.week))].sort((a,b)=>a-b);
    ws.innerHTML=weeks.map(w=>`<option value="${w}">${w}</option>`).join('');
    const savedWeek=localStorage.getItem(`ror-power-week-${ys.value}`);ws.value=weeks.map(String).includes(savedWeek)?savedWeek:String(weeks.at(-1)||1);
    renderPowerRankings();
  }
  ys.onchange=()=>{localStorage.setItem('ror-power-year',ys.value);fillWeeks()};
  ws.onchange=()=>{localStorage.setItem(`ror-power-week-${ys.value}`,ws.value);renderPowerRankings()};
  fillWeeks();
}
function renderPowerRankings(){
  const y=document.querySelector('#powerYear').value,through=+document.querySelector('#powerWeek').value;
  const games=ledger.filter(x=>x.year===y&&/^\d+$/.test(x.week)&&+x.week<=through),owners=[...new Set(games.map(x=>x.owner))];
  const rows=owners.map(owner=>{
    const g=games.filter(x=>x.owner===owner).sort((a,b)=>+a.week-+b.week),latest=g.at(-1),played=g.length;
    const wins=g.filter(x=>x.outcome==='w').length,losses=g.filter(x=>x.outcome==='l').length;
    const medianWins=g.filter(x=>x.medianOutcome==='w').length,medianLosses=g.filter(x=>x.medianOutcome==='l').length;
    const pf=g.reduce((s,x)=>s+x.score,0),winPct=played?wins/played:0,medianWinPct=played?medianWins/played:0;
    const power=(pf*2)+(pf*winPct)+(pf*medianWinPct);
    return{owner,team:latest?.team||owner,year:y,pf,wins,losses,winPct,medianWins,medianLosses,medianWinPct,power};
  }).sort((a,b)=>b.power-a.power||b.pf-a.pf||a.owner.localeCompare(b.owner));
  document.querySelector('#powerTitle').textContent=`${y} Through Week ${through}`;
  document.querySelector('#powerRange').textContent=`${y} • Weeks 1–${through}`;
  document.querySelector('#powerRankings').innerHTML=rows.map((x,i)=>`<tr><td><strong>#${i+1}</strong></td><td>${identityHTML(y,x.owner,x.team,'stand-logo')}</td><td class="power-score"><strong>${fmt(x.power)}</strong></td><td>${x.wins}-${x.losses}</td><td>${(x.winPct*100).toFixed(1)}%</td><td>${x.medianWins}-${x.medianLosses}</td><td>${(x.medianWinPct*100).toFixed(1)}%</td><td>${fmt(x.pf)}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No regular-season games through this week.</td></tr>';
}


function setupScheduleComparisonPage(){
  const ys=document.querySelector('#scheduleYear'),ws=document.querySelector('#scheduleWeek'),ms=document.querySelector('#scheduleManager');
  const years=[...new Set((scheduleData.length?scheduleData.map(x=>x.year):ledger.filter(x=>/^\d+$/.test(x.week)).map(x=>x.year)))].sort((a,b)=>+b-+a);
  ys.innerHTML=years.map(y=>`<option>${y}</option>`).join('');
  const savedYear=localStorage.getItem('ror-schedule-year');ys.value=years.includes(savedYear)?savedYear:years[0];
  function fillForYear(){
    const games=ledger.filter(x=>x.year===ys.value&&/^\d+$/.test(x.week));
    const weeks=[...new Set(games.map(x=>+x.week))].sort((a,b)=>a-b);
    ws.innerHTML=weeks.map(w=>`<option value="${w}">${w}</option>`).join('');
    const savedWeek=localStorage.getItem(`ror-schedule-week-${ys.value}`);ws.value=weeks.map(String).includes(savedWeek)?savedWeek:String(weeks.at(-1)||1);
    const owners=[...new Set(games.map(x=>x.owner))].sort((a,b)=>a.localeCompare(b));
    ms.innerHTML=owners.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');
    const savedManager=localStorage.getItem(`ror-schedule-manager-${ys.value}`);ms.value=owners.includes(savedManager)?savedManager:owners[0];
    renderScheduleComparison();
  }
  ys.onchange=()=>{localStorage.setItem('ror-schedule-year',ys.value);fillForYear()};
  ws.onchange=()=>{localStorage.setItem(`ror-schedule-week-${ys.value}`,ws.value);renderScheduleComparison()};
  ms.onchange=()=>{localStorage.setItem(`ror-schedule-manager-${ys.value}`,ms.value);renderScheduleComparison()};
  fillForYear();
}
function renderScheduleComparison(){
  const y=document.querySelector('#scheduleYear').value,through=+document.querySelector('#scheduleWeek').value,selected=document.querySelector('#scheduleManager').value;
  const games=ledger.filter(x=>x.year===y&&/^\d+$/.test(x.week)&&+x.week<=through);
  const selectedGames=games.filter(x=>x.owner===selected),scoreByWeek=new Map(selectedGames.map(x=>[+x.week,x.score]));
  const actualWins=selectedGames.filter(x=>x.outcome==='w').length;
  const scheduleOwners=[...new Set(games.map(x=>x.owner))];
  const rows=scheduleOwners.map(owner=>{
    const schedule=games.filter(x=>x.owner===owner&&scoreByWeek.has(+x.week));let wins=0,losses=0,ties=0;
    for(const g of schedule){
      const selectedScore=scoreByWeek.get(+g.week);
      const opponentScore=g.opponent===selected?g.score:g.oppScore;
      if(selectedScore>opponentScore)wins++;else if(selectedScore<opponentScore)losses++;else ties++;
    }
    const latest=[...games].filter(x=>x.owner===owner).sort((a,b)=>+b.week-+a.week)[0];
    return{owner,team:latest?.team||owner,wins,losses,ties,diff:wins-actualWins,isOwn:owner===selected};
  }).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||a.owner.localeCompare(b.owner));
  const selectedLatest=[...selectedGames].sort((a,b)=>+b.week-+a.week)[0];
  const selectedTeam=selectedLatest?.team||selected;
  document.querySelector('#scheduleTitle').textContent=`${selectedTeam} Through Week ${through}`;
  document.querySelector('#scheduleRange').textContent=`${y} • Weeks 1–${through} • ${selected}`;
  document.querySelector('#scheduleResults').innerHTML=rows.map(x=>{
    const record=x.ties?`${x.wins}-${x.losses}-${x.ties}`:`${x.wins}-${x.losses}`;
    const diff=x.isOwn?'—':`${x.diff>0?'+':''}${x.diff}`;
    const cls=x.isOwn?'schedule-own':x.diff>0?'schedule-positive':x.diff<0?'schedule-negative':'';
    return `<tr class="${cls}"><td>${identityHTML(y,x.owner,x.team,'stand-logo')}</td><td><strong>${record}</strong></td><td class="schedule-diff"><strong>${diff}</strong></td></tr>`;
  }).join('')||'<tr><td colspan="3" class="muted">No regular-season games through this week.</td></tr>';
}


// v3.2 Playoff Machine
let playoffPicks=new Map();
let playoffScores=new Map(); // Optional scores, keyed by matchup and owner
let playoffActiveWeek=null;
let playoffOddsTimer=null;
let playoffOddsRun=0;
function playoffScoreKey(gameKey,owner){return JSON.stringify([gameKey,owner])}
function playoffScoreInput(game,owner){
  const value=playoffScores.get(playoffScoreKey(game.key,owner));
  return `<input class="playoff-score-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Points" aria-label="Projected points for ${esc(owner)} in week ${game.week}" data-key="${esc(game.key)}" data-owner="${esc(owner)}" value="${value===undefined?'':esc(value)}">`;
}
function setupPlayoffScoreStyles(){
  if(document.querySelector('#playoffScoreStyles'))return;
  const style=document.createElement('style');style.id='playoffScoreStyles';
  style.textContent=`.playoff-score-side{display:flex;align-items:center;gap:8px;min-width:0;flex:1}.playoff-score-side .playoff-pick{flex:1;min-width:0}.playoff-score-input{box-sizing:border-box;width:86px;max-width:32%;padding:9px 7px;border:1px solid var(--border,#777);border-radius:8px;background:#fff;color:#111;-webkit-text-fill-color:#111;font:inherit;appearance:textfield;-moz-appearance:textfield;font-size:14px;text-align:right}.playoff-score-input::-webkit-inner-spin-button,.playoff-score-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.playoff-score-input::placeholder{color:#666;-webkit-text-fill-color:#666}.playoff-score-input:focus{outline:2px solid var(--accent,#5589df);outline-offset:1px}@media(max-width:650px){.playoff-game{flex-wrap:wrap}.playoff-score-side{flex-basis:100%}.playoff-score-input{width:90px}}`;
  document.head.appendChild(style);
}

const PLAYOFF_TIE='__TIE__';
function playoffKey(year,week,a,b){return `${year}|${week}|${[a,b].sort().join('|')}`}
function regularGamePairs(year){
  const y=String(year), completed=new Map(), seen=new Set();
  for(const x of ledger.filter(g=>g.year===y&&/^\d+$/.test(g.week))){
    const k=playoffKey(y,+x.week,x.owner,x.opponent);if(seen.has(k))continue;seen.add(k);
    completed.set(k,{key:k,week:+x.week,a:x.owner,b:x.opponent,aTeam:x.team,bTeam:teamInfo(y,x.opponent,x.opponent).team,aScore:x.score,bScore:x.oppScore,played:true});
  }
  const out=[];
  for(const g of scheduleData.filter(x=>x.year===y)){
    const k=playoffKey(y,g.week,g.a,g.b), done=completed.get(k);
    out.push(done||{key:k,week:g.week,a:g.a,b:g.b,aTeam:teamInfo(y,g.a,g.a).team,bTeam:teamInfo(y,g.b,g.b).team,aScore:null,bScore:null,played:false});
  }
  if(!out.length)out.push(...completed.values());
  return out.sort((a,b)=>a.week-b.week||a.a.localeCompare(b.a));
}
function setupPlayoffMachinePage(){
  playoffPicks=new Map();
  playoffScores=new Map();
  playoffActiveWeek=null;
  setupPlayoffScoreStyles();
  document.querySelector('#playoffReset').onclick=()=>{playoffPicks=new Map();playoffScores=new Map();renderPlayoffMachine();scheduleConditionalOdds()};
  document.querySelector('#playoffQuickWin').onclick=()=>quickPickPlayoffs('win');
  document.querySelector('#playoffQuickPF').onclick=()=>quickPickPlayoffs('pf');
  document.querySelector('#playoffQuickRandom').onclick=()=>quickPickPlayoffs('random');
  renderPlayoffMachine();
  scheduleConditionalOdds(0);
}
function currentPlayoffYear(){
  const years=[...new Set((scheduleData.length?scheduleData.map(x=>x.year):ledger.filter(x=>/^\d+$/.test(x.week)).map(x=>x.year)))].sort((a,b)=>+b-+a);
  return years[0]||String(new Date().getFullYear());
}
function actualSeasonStats(year,pairs){
  const owners=[...new Set(pairs.flatMap(g=>[g.a,g.b]))],map=new Map(owners.map(o=>[o,{w:0,l:0,t:0,pf:0,pa:0}]));
  for(const g of pairs.filter(x=>x.played)){
    const a=map.get(g.a),b=map.get(g.b);a.pf+=g.aScore;a.pa+=g.bScore;b.pf+=g.bScore;b.pa+=g.aScore;
    if(g.aScore>g.bScore){a.w++;b.l++}else if(g.bScore>g.aScore){b.w++;a.l++}else{a.t++;b.t++}
  }
  return map;
}
function recordPct(r){const n=r.w+r.l+r.t;return n?(r.w+.5*r.t)/n:0}
function quickPickPlayoffs(mode){
  const y=currentPlayoffYear(),pairs=regularGamePairs(y),stats=actualSeasonStats(y,pairs);
  const future=pairs.filter(x=>!x.played).sort((a,b)=>a.week-b.week||a.a.localeCompare(b.a));
  playoffPicks=new Map();
  for(const g of future){
    const a=stats.get(g.a),b=stats.get(g.b);
    let pick;
    if(mode==='random')pick=Math.random()<.5?g.a:g.b;
    else if(mode==='pf')pick=a.pf===b.pf?PLAYOFF_TIE:(a.pf>b.pf?g.a:g.b);
    else{
      const av=recordPct(a),bv=recordPct(b);
      pick=Math.abs(av-bv)<1e-12?PLAYOFF_TIE:(av>bv?g.a:g.b);
    }
    playoffPicks.set(g.key,pick);
    // Winning % must evolve chronologically as each projected game is decided.
    // A tie counts as half a win for future winning-percentage comparisons.
    if(pick===PLAYOFF_TIE){a.t++;b.t++}
    else if(pick===g.a){a.w++;b.l++}
    else{b.w++;a.l++}
  }
  renderPlayoffMachine();
  scheduleConditionalOdds();
}
function simulatedStandings(year,pairs){
  const owners=[...new Set(pairs.flatMap(g=>[g.a,g.b]))];
  const map=new Map(owners.map(owner=>[owner,{owner,team:teamInfo(year,owner,owner).team,w:0,l:0,t:0,pf:0,pa:0}]));
  const h2h=[];
  for(const g of pairs){
    const a=map.get(g.a),b=map.get(g.b);if(!a||!b)continue;
    if(g.played){
      a.pf+=g.aScore;a.pa+=g.bScore;b.pf+=g.bScore;b.pa+=g.aScore;
      if(g.aScore>g.bScore){a.w++;b.l++;h2h.push({a:g.a,b:g.b,winner:g.a})}
      else if(g.bScore>g.aScore){b.w++;a.l++;h2h.push({a:g.a,b:g.b,winner:g.b})}
      else{a.t++;b.t++;h2h.push({a:g.a,b:g.b,winner:PLAYOFF_TIE})}
    }else{
      // Scores are independent of the selected winner and may be entered for just one team.
      const aScore=playoffScores.get(playoffScoreKey(g.key,g.a));
      const bScore=playoffScores.get(playoffScoreKey(g.key,g.b));
      if(aScore!==undefined){a.pf+=Number(aScore);b.pa+=Number(aScore)}
      if(bScore!==undefined){b.pf+=Number(bScore);a.pa+=Number(bScore)}
      const pick=playoffPicks.get(g.key);if(!pick)continue;
      if(pick===PLAYOFF_TIE){a.t++;b.t++;h2h.push({a:g.a,b:g.b,winner:PLAYOFF_TIE})}
      else if(pick===g.a){a.w++;b.l++;h2h.push({a:g.a,b:g.b,winner:g.a})}
      else if(pick===g.b){b.w++;a.l++;h2h.push({a:g.a,b:g.b,winner:g.b})}
    }
  }
  const tieInfo=new Map();
  function seedTie(group){
    const rem=[...group],seeded=[];
    while(rem.length){
      if(rem.length===1){seeded.push(rem[0]);break}
      const names=rem.map(t=>t.owner),set=new Set(names),rec=new Map(rem.map(t=>[t.owner,{w:0,l:0,t:0,g:0}]));
      for(const g of h2h){if(!set.has(g.a)||!set.has(g.b))continue;const ra=rec.get(g.a),rb=rec.get(g.b);ra.g++;rb.g++;if(g.winner===g.a){ra.w++;rb.l++}else if(g.winner===g.b){rb.w++;ra.l++}else{ra.t++;rb.t++}}
      const counts=[...rec.values()].map(r=>r.g),valid=counts[0]>0&&counts.every(n=>n===counts[0]);
      let candidates=[...rem],steps=[];
      if(valid){
        const vals=candidates.map(t=>({t,p:(rec.get(t.owner).w+.5*rec.get(t.owner).t)/rec.get(t.owner).g})),best=Math.max(...vals.map(x=>x.p));
        candidates=vals.filter(x=>Math.abs(x.p-best)<1e-12).map(x=>x.t);
        steps.push(`H2H: ${names.map(n=>{const r=rec.get(n);return `${n} ${r.w}-${r.l}${r.t?`-${r.t}`:''}`}).join(' • ')}`);
      }else steps.push('H2H skipped: tied teams have not played the same number of head-to-head games.');
      if(candidates.length>1){const best=Math.max(...candidates.map(t=>t.pf));candidates=candidates.filter(t=>t.pf===best);steps.push(`Points For: ${rem.map(t=>`${t.owner} ${fmt(t.pf)}`).join(' • ')}`)}
      if(candidates.length>1){const best=Math.min(...candidates.map(t=>t.pa));candidates=candidates.filter(t=>t.pa===best);steps.push(`Points Against: ${rem.map(t=>`${t.owner} ${fmt(t.pa)}`).join(' • ')}`)}
      if(candidates.length>1){candidates.sort((a,b)=>a.owner.localeCompare(b.owner));steps.push('Still tied after known tiebreakers; stable display order is used until ESPN resolves the final tie.')}
      const winner=candidates[0];
      tieInfo.set(winner.owner,{title:`Tiebreaker among ${names.join(', ')}`,detail:steps.join('\n')});
      seeded.push(winner);rem.splice(rem.findIndex(t=>t.owner===winner.owner),1);
    }
    return seeded;
  }
  const raw=[...map.values()].sort((a,b)=>recordPct(b)-recordPct(a)),out=[];
  for(let i=0;i<raw.length;){let j=i+1;while(j<raw.length&&Math.abs(recordPct(raw[j])-recordPct(raw[i]))<1e-12)j++;const group=raw.slice(i,j);out.push(...(group.length>1?seedTie(group):group));i=j}
  return{standings:out,tieInfo};
}
function tiebreakInfoHTML(info){
  if(!info)return '';
  const text=`${info.title}\n${info.detail}`;
  return `<span class="tiebreak-info" tabindex="0" aria-label="${esc(text)}"><span>i</span><span class="tiebreak-tip"><strong>${esc(info.title)}</strong>${info.detail.split('\n').map(x=>`<em>${esc(x)}</em>`).join('')}</span></span>`;
}
function renderPlayoffMachine(){
  const y=currentPlayoffYear(),pairs=regularGamePairs(y),remaining=pairs.filter(g=>!g.played),knownWeeks=[...new Set(remaining.map(g=>g.week))].sort((a,b)=>a-b);
  if(playoffActiveWeek==null||!knownWeeks.includes(playoffActiveWeek))playoffActiveWeek=knownWeeks[0]??null;
  const actual=actualSeasonStats(y,pairs),completedWeeks=[...new Set(pairs.filter(g=>g.played).map(g=>g.week))],lastCompleted=completedWeeks.length?Math.max(...completedWeeks):0;
  const tabs=document.querySelector('#playoffWeekTabs');
  tabs.innerHTML=knownWeeks.map(w=>`<button class="playoff-week-tab ${w===playoffActiveWeek?'active':''}" data-week="${w}">Week ${w}</button>`).join('')||'<span class="muted">Regular season complete</span>';
  tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{playoffActiveWeek=+b.dataset.week;renderPlayoffMachine()});
  const future=document.querySelector('#playoffGames'),weekGames=remaining.filter(g=>g.week===playoffActiveWeek);
  future.innerHTML=weekGames.length?`<div class="playoff-game-list">${weekGames.map(g=>{
    const pick=playoffPicks.get(g.key)||'';
    return `<div class="playoff-game"><div class="playoff-score-side"><button class="playoff-pick ${pick===g.a?'selected':''}" data-key="${esc(g.key)}" data-pick="${esc(g.a)}">${identityHTML(y,g.a,g.aTeam,'stand-logo')}</button>${playoffScoreInput(g,g.a)}</div><div class="playoff-score-side"><button class="playoff-pick ${pick===g.b?'selected':''}" data-key="${esc(g.key)}" data-pick="${esc(g.b)}">${identityHTML(y,g.b,g.bTeam,'stand-logo')}</button>${playoffScoreInput(g,g.b)}</div>${pick===PLAYOFF_TIE?'<div class="playoff-tie-label">Projected tie</div>':''}</div>`}).join('')}</div>`:'<p class="muted">No remaining games.</p>';
  future.querySelectorAll('.playoff-pick').forEach(b=>b.onclick=()=>{if(playoffPicks.get(b.dataset.key)===b.dataset.pick)playoffPicks.delete(b.dataset.key);else playoffPicks.set(b.dataset.key,b.dataset.pick);renderPlayoffMachine();scheduleConditionalOdds()});
  future.querySelectorAll('.playoff-score-input').forEach(input=>{
    input.addEventListener('input',()=>{
      const key=playoffScoreKey(input.dataset.key,input.dataset.owner),raw=input.value.trim();
      if(raw===''||!Number.isFinite(Number(raw))||Number(raw)<0){playoffScores.delete(key)}
      else playoffScores.set(key,Number(raw));
      // Recalculate the standings without replacing the focused input.
      renderPlayoffStandings(y,pairs,remaining);
      scheduleConditionalOdds();
    });
  });
  renderPlayoffStandings(y,pairs,remaining);
}
function renderPlayoffStandings(y,pairs,remaining){
  const {standings,tieInfo}=simulatedStandings(y,pairs),picked=remaining.filter(g=>playoffPicks.has(g.key)).length;
  document.querySelector('#playoffStandings').innerHTML=standings.map((t,i)=>{const rec=t.t?`${t.w}-${t.l}-${t.t}`:`${t.w}-${t.l}`;const ti=teamInfo(y,t.owner,t.team);return `<tr class="${i<6?'playoff-in':''}"><td><strong>#${i+1}</strong></td><td><div class="playoff-team-cell"><img class="stand-logo" ${logoAttrs(ti.logo)} alt=""><div class="playoff-team-copy"><div class="playoff-team-name"><strong>${esc(ti.team)}</strong>${tiebreakInfoHTML(tieInfo.get(t.owner))}</div><small>${esc(t.owner)}</small></div></div></td><td><strong>${rec}</strong></td><td>${fmt(t.pf)}</td><td>${fmt(t.pa)}</td><td>${i<2?'1st Round Bye':i<6?'Playoffs':'Eliminated'}</td>${Array.from({length:9},(_,j)=>`<td class="conditional-odds ${j===8?'odds-total':j<2?'odds-bye':j>5?'odds-out':''}" data-owner="${esc(t.owner)}" data-seed="${j}">—</td>`).join('')}</tr>`}).join('');
  if(window.playoffOddsLast)paintConditionalOdds(window.playoffOddsLast);
  document.querySelector('#playoffProgress').textContent=remaining.length?`${picked} of ${remaining.length} remaining games selected`:'Regular season complete.';
}


// v3.6 Playoff Odds — 10,000 Monte Carlo season simulations.
const ODDS_SIMS=10000;
function oddsNormal(mean,sd){
  if(!sd)return mean;
  let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
  return Math.max(0,mean+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v));
}
function oddsDistribution(scores){
  const mean=scores.reduce((a,b)=>a+b,0)/scores.length;
  // Population SD: the scoring history observed to date is the complete distribution used by the model.
  const variance=scores.reduce((sum,x)=>sum+(x-mean)**2,0)/scores.length;
  return{mean,sd:Math.sqrt(variance)};
}
function seedSimulatedSeason(owners,stats,h2h){
  function pct(t){const n=t.w+t.l+t.t;return n?(t.w+.5*t.t)/n:0}
  function breakTie(group){
    const rem=[...group],seeded=[];
    while(rem.length){
      if(rem.length===1){seeded.push(rem[0]);break}
      const set=new Set(rem.map(t=>t.owner)),rec=new Map(rem.map(t=>[t.owner,{w:0,l:0,t:0,g:0}]));
      for(const g of h2h){if(!set.has(g.a)||!set.has(g.b))continue;const a=rec.get(g.a),b=rec.get(g.b);a.g++;b.g++;if(g.winner===g.a){a.w++;b.l++}else if(g.winner===g.b){b.w++;a.l++}else{a.t++;b.t++}}
      const counts=[...rec.values()].map(r=>r.g),valid=counts[0]>0&&counts.every(n=>n===counts[0]);
      let candidates=[...rem];
      if(valid){const best=Math.max(...candidates.map(t=>{const r=rec.get(t.owner);return(r.w+.5*r.t)/r.g}));candidates=candidates.filter(t=>{const r=rec.get(t.owner);return Math.abs((r.w+.5*r.t)/r.g-best)<1e-12})}
      if(candidates.length>1){const best=Math.max(...candidates.map(t=>t.pf));candidates=candidates.filter(t=>Math.abs(t.pf-best)<1e-9)}
      if(candidates.length>1){const best=Math.min(...candidates.map(t=>t.pa));candidates=candidates.filter(t=>Math.abs(t.pa-best)<1e-9)}
      // Exact simulated ties after all known tiebreakers are vanishingly rare; randomize the unresolved coin-flip step.
      const winner=candidates.length===1?candidates[0]:candidates[Math.floor(Math.random()*candidates.length)];
      seeded.push(winner);rem.splice(rem.findIndex(t=>t.owner===winner.owner),1);
    }
    return seeded;
  }
  const raw=owners.map(o=>stats.get(o)).sort((a,b)=>pct(b)-pct(a)),out=[];
  for(let i=0;i<raw.length;){let j=i+1;while(j<raw.length&&Math.abs(pct(raw[j])-pct(raw[i]))<1e-12)j++;const g=raw.slice(i,j);out.push(...(g.length>1?breakTie(g):g));i=j}
  return out;
}
function setupPlayoffOddsPage(){
  const y=currentPlayoffYear(),sel=document.querySelector('#oddsWeek');
  const playedWeeks=[...new Set(ledger.filter(x=>x.year===y&&/^\d+$/.test(x.week)).map(x=>+x.week))].sort((a,b)=>a-b);
  sel.innerHTML=playedWeeks.map(w=>`<option value="${w}">Week ${w}</option>`).join('');
  const saved=localStorage.getItem(`ror-odds-week-${y}`);sel.value=playedWeeks.map(String).includes(saved)?saved:String(playedWeeks.at(-1)||1);
  sel.onchange=()=>{localStorage.setItem(`ror-odds-week-${y}`,sel.value);renderPlayoffOdds()};
  renderPlayoffOdds();
}
function renderPlayoffOdds(){
  const y=currentPlayoffYear(),through=+document.querySelector('#oddsWeek').value,status=document.querySelector('#oddsStatus');
  document.querySelector('#oddsTitle').textContent=`${y} Through Week ${through}`;
  status.textContent='Running 10,000 simulations…';
  // Yield once so the calculating state can paint before the CPU work begins.
  setTimeout(()=>{
    const schedule=regularGamePairs(y),owners=[...new Set(schedule.flatMap(g=>[g.a,g.b]))];
    const hist=ledger.filter(x=>x.year===y&&/^\d+$/.test(x.week)&&+x.week<=through);
    const dist=new Map(owners.map(o=>[o,oddsDistribution(hist.filter(x=>x.owner===o).map(x=>x.score))]));
    if([...dist.values()].some(x=>!x||!Number.isFinite(x.mean))){status.textContent='Not enough scoring data';return}
    const completed=new Map(),seen=new Set();
    for(const x of hist){const k=playoffKey(y,+x.week,x.owner,x.opponent);if(seen.has(k))continue;seen.add(k);completed.set(k,{week:+x.week,a:x.owner,b:x.opponent,aScore:x.score,bScore:x.oppScore})}
    const counts=new Map(owners.map(o=>[o,Array(8).fill(0)]));
    for(let sim=0;sim<ODDS_SIMS;sim++){
      const stats=new Map(owners.map(o=>[o,{owner:o,w:0,l:0,t:0,pf:0,pa:0}])),h2h=[];
      for(const g of schedule){
        const a=stats.get(g.a),b=stats.get(g.b);if(!a||!b)continue;
        const done=completed.get(g.key);let as,bs;
        if(done){as=done.a===g.a?done.aScore:done.bScore;bs=done.a===g.a?done.bScore:done.aScore}
        else{as=oddsNormal(dist.get(g.a).mean,dist.get(g.a).sd);bs=oddsNormal(dist.get(g.b).mean,dist.get(g.b).sd)}
        a.pf+=as;a.pa+=bs;b.pf+=bs;b.pa+=as;
        if(as>bs){a.w++;b.l++;h2h.push({a:g.a,b:g.b,winner:g.a})}else if(bs>as){b.w++;a.l++;h2h.push({a:g.a,b:g.b,winner:g.b})}else{a.t++;b.t++;h2h.push({a:g.a,b:g.b,winner:PLAYOFF_TIE})}
      }
      const seeded=seedSimulatedSeason(owners,stats,h2h);seeded.forEach((t,i)=>counts.get(t.owner)[i]++);
    }
    const actualPF=new Map(owners.map(o=>[o,hist.filter(x=>x.owner===o).reduce((s,x)=>s+x.score,0)]));
    const rows=owners.map(o=>({owner:o,team:teamInfo(y,o,o).team,c:counts.get(o),playoffs:counts.get(o).slice(0,6).reduce((a,b)=>a+b,0),pf:actualPF.get(o)})).sort((a,b)=>b.playoffs-a.playoffs||b.c[0]-a.c[0]||b.pf-a.pf||a.owner.localeCompare(b.owner));
    const pct=n=>`${(n/ODDS_SIMS*100).toFixed(n===0||n===ODDS_SIMS?0:1)}%`;
    document.querySelector('#oddsResults').innerHTML=rows.map(r=>`<tr><td>${identityHTML(y,r.owner,r.team,'stand-logo')}</td>${r.c.map((n,i)=>`<td class="${i<2?'odds-bye':i>5?'odds-out':''}">${pct(n)}</td>`).join('')}<td class="odds-total"><strong>${pct(r.playoffs)}</strong></td></tr>`).join('');
    status.textContent=`${ODDS_SIMS.toLocaleString()} simulations complete`;
  },20);
}


// A debounced conditional Monte Carlo simulation, sharing the Playoff Machine selections.
function scheduleConditionalOdds(delay=1000){
  clearTimeout(playoffOddsTimer);
  const token=++playoffOddsRun;
  const status=document.querySelector('#oddsStatus');
  if(status)status.textContent=delay?'Waiting for selections…':'Calculating…';
  playoffOddsTimer=setTimeout(()=>runConditionalOdds(token),delay);
}
function paintConditionalOdds(counts){
  const pct=n=>`${(100*n/ODDS_SIMS).toFixed(n===0||n===ODDS_SIMS?0:1)}%`;
  document.querySelectorAll('.conditional-odds').forEach(cell=>{
    const values=counts.get(cell.dataset.owner);
    if(!values)return;
    const seed=+cell.dataset.seed;
    cell.textContent=pct(seed===8?values.slice(0,6).reduce((a,b)=>a+b,0):values[seed]);
  });
}
function runConditionalOdds(token){
  if(token!==playoffOddsRun)return;
  const status=document.querySelector('#oddsStatus');
  status.textContent='Running 10,000 simulations…';
  setTimeout(()=>{
    if(token!==playoffOddsRun)return;
    const year=currentPlayoffYear(),schedule=regularGamePairs(year);
    const owners=[...new Set(schedule.flatMap(g=>[g.a,g.b]))];
    const hist=ledger.filter(x=>x.year===year&&/^\d+$/.test(x.week));
    const dist=new Map(owners.map(o=>[o,oddsDistribution(hist.filter(x=>x.owner===o).map(x=>x.score))]));
    if([...dist.values()].some(x=>!Number.isFinite(x.mean))){status.textContent='Not enough scoring history';return;}
    const counts=new Map(owners.map(o=>[o,Array(owners.length).fill(0)]));
    for(let sim=0;sim<ODDS_SIMS;sim++){
      const stats=new Map(owners.map(o=>[o,{owner:o,w:0,l:0,t:0,pf:0,pa:0}])),h2h=[];
      for(const g of schedule){
        const a=stats.get(g.a),b=stats.get(g.b);
        let as,bs,winner;
        if(g.played){as=g.aScore;bs=g.bScore;}
        else{
          const aFixed=playoffScores.get(playoffScoreKey(g.key,g.a));
          const bFixed=playoffScores.get(playoffScoreKey(g.key,g.b));
          as=aFixed===undefined?oddsNormal(dist.get(g.a).mean,dist.get(g.a).sd):aFixed;
          bs=bFixed===undefined?oddsNormal(dist.get(g.b).mean,dist.get(g.b).sd):bFixed;
          const pick=playoffPicks.get(g.key);
          // Selected winners are guaranteed; projected points remain independent for tiebreaks.
          if(pick===g.a||pick===g.b||pick===PLAYOFF_TIE)winner=pick;
        }
        a.pf+=as;a.pa+=bs;b.pf+=bs;b.pa+=as;
        winner=winner||(as>bs?g.a:bs>as?g.b:PLAYOFF_TIE);
        if(winner===g.a){a.w++;b.l++;}else if(winner===g.b){b.w++;a.l++;}else{a.t++;b.t++;}
        h2h.push({a:g.a,b:g.b,winner});
      }
      seedSimulatedSeason(owners,stats,h2h).forEach((t,i)=>counts.get(t.owner)[i]++);
    }
    if(token!==playoffOddsRun)return;
    window.playoffOddsLast=counts;
    paintConditionalOdds(counts);
    status.textContent=`${ODDS_SIMS.toLocaleString()} simulations complete`;
  },20);
}

load();


// Roster History: completed weekly snapshots + cleaned lasting moves.
let historyDraft=[],historyRosters=[],historyMoves=[];
const HISTORY_TEAM_NAMES={1:'OsmaBinBallin',2:'Snails Eat Tomato',4:'Triangle',5:'Mug Maniacs',7:'wholesale',8:'Njggabas in Paris',9:'CMC Bunni',10:"Erik's Excellent Team"};
function historyObjects(text){const rows=csv(text);if(!rows.length)return[];const headers=rows[0].map(h=>String(h||'').trim());return rows.slice(1).filter(r=>r.some(v=>String(v||'').trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()]))) }
function hval(row,...names){const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');const wanted=names.map(norm);for(const [k,v] of Object.entries(row||{}))if(wanted.includes(norm(k)))return v;return''}
function hyear(r){return hval(r,'Year','Season')}
function hweek(r){return Number(hval(r,'Week','Scoring Period','ScoringPeriodId'))||0}
function hteamId(r){return Number(hval(r,'Team ID','TeamId','Team'))||0}
function hteamName(r){
  const id=hteamId(r);
  const year=hyear(r);
  const raw=hval(r,'Team','Team Name','TeamName');
  return raw||(year==='2026'?HISTORY_TEAM_NAMES[id]:'')||`Team ${id}`;
}
function historyTeamLogo(r){const year=hyear(r),name=hteamName(r);const match=teams.find(t=>t.year===year&&t.team===name);return match?.logo||FALLBACK_LOGO}
function hplayer(r){return hval(r,'Player Name','PlayerName','Player')||`Player ${hval(r,'Player ID','PlayerId')}`}
function hslot(r){return Number(hval(r,'Lineup Slot ID','LineupSlotId','Slot ID','SlotId'))}
function hscore(r){const v=hval(r,'Fantasy Points','FantasyPoints','Points','Score','Week Points','WeekPoints');return v===''?null:Number(v)}
function slotName(id){return ({0:'QB',2:'RB',4:'WR',6:'TE',16:'D/ST',17:'K',20:'BENCH',21:'IR',23:'FLEX'})[Number(id)]||`SLOT ${id}`}
const STARTER_SLOT_ORDER={0:0,2:1,4:2,6:3,23:4,16:5,17:6};
function historyTeamOptions(year){const ids=new Map();[...historyRosters,...historyMoves,...historyDraft].filter(r=>hyear(r)===year).forEach(r=>{const id=hteamId(r);if(id)ids.set(id,hteamName(r))});return [...ids].sort((a,b)=>a[1].localeCompare(b[1]))}
async function loadRosterHistoryPage(){
  const status=document.querySelector('#status');
  try{
    const [d,r,m]=await Promise.all([URLS.draftHistory,URLS.rosterSnapshots,URLS.rosterMoves].map(u=>fetch(u,{cache:'no-store'}).then(x=>{if(!x.ok)throw Error(x.status);return x.text()})));
    historyDraft=historyObjects(d);historyRosters=historyObjects(r);historyMoves=historyObjects(m);
    setupRosterHistoryControls();status.textContent='Live roster history loaded';
  }catch(e){status.textContent='Could not load roster history';console.error(e)}
}
function setupRosterHistoryControls(){
  const ys=document.querySelector('#historyYear'),ts=document.querySelector('#historyTeam'),ws=document.querySelector('#historyWeek');
  const years=[...new Set([...historyDraft,...historyRosters,...historyMoves].map(hyear).filter(Boolean))].sort((a,b)=>+b-+a);ys.innerHTML=years.map(y=>`<option>${esc(y)}</option>`).join('');
  function fillTeams(){const opts=historyTeamOptions(ys.value);ts.innerHTML=`<option value="all">All Teams</option>`+opts.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join('');ts.value=opts.some(([id])=>id===5)?'5':String(opts[0]?.[0]||'all');fillWeeks()}
  function fillWeeks(){const team=ts.value;const weeks=[...new Set(historyRosters.filter(r=>hyear(r)===ys.value&&(team==='all'||hteamId(r)===+team)).map(hweek).filter(Boolean))].sort((a,b)=>a-b);ws.innerHTML=weeks.map(w=>`<option value="${w}">Week ${w}</option>`).join('');ws.value=String(weeks.at(-1)||'');renderRosterHistory()}
  ys.onchange=fillTeams;ts.onchange=fillWeeks;ws.onchange=renderRosterHistory;fillTeams();
}
function renderRosterHistory(){const all=document.querySelector('#historyTeam').value==='all';document.querySelector('#weeklyRosterCard').hidden=all;document.querySelector('#historyGrid').classList.toggle('moves-only',all);renderHistoricalRoster();renderRosterMoves()}
function renderHistoricalRoster(){
  const target=document.querySelector('#historicalRoster');if(!target)return;
  const y=document.querySelector('#historyYear').value,t=document.querySelector('#historyTeam').value,w=+document.querySelector('#historyWeek').value;
  if(t==='all'){target.innerHTML='';return}
  const rows=historyRosters.filter(r=>hyear(r)===y&&hteamId(r)===+t&&hweek(r)===w);
  const starters=rows.filter(r=>![20,21].includes(hslot(r))).sort((a,b)=>(STARTER_SLOT_ORDER[hslot(a)]??99)-(STARTER_SLOT_ORDER[hslot(b)]??99));
  const bench=rows.filter(r=>hslot(r)===20),ir=rows.filter(r=>hslot(r)===21);
  const line=r=>{const score=hscore(r);return `<div class="roster-player"><span class="roster-slot">${esc(slotName(hslot(r)))}</span><strong>${esc(hplayer(r))}</strong>${Number.isFinite(score)?`<span class="roster-score">${score.toFixed(1)}</span>`:''}</div>`};
  target.innerHTML=rows.length?`<div class="roster-group"><h3>Starting Roster</h3>${starters.map(line).join('')}</div><div class="roster-group roster-bench"><h3>Bench</h3>${bench.map(line).join('')||'<p class="muted">None</p>'}</div>${ir.length?`<div class="roster-group"><h3>IR</h3>${ir.map(line).join('')}</div>`:''}`:'<p class="muted">No completed roster snapshot for this selection.</p>';
}
function isHistoryTrade(r){
  const moveType=hval(r,'Move Type','MoveType').toUpperCase();
  const transactionType=hval(r,'Transaction Type','Type').toUpperCase();
  const partner=hval(r,'Trade Partner','TradePartner','Partner Team','PartnerTeam','Other Team','OtherTeam');
  return moveType.includes('TRADE')||transactionType.includes('TRADE')||Boolean(partner);
}
function tradePartnerName(r){
  const direct=hval(r,'Trade Partner','TradePartner','Partner Team','PartnerTeam','Other Team','OtherTeam');
  if(direct)return direct;
  const partnerId=Number(hval(r,'Trade Partner ID','TradePartnerId','Partner Team ID','PartnerTeamId'))||0;
  if(!partnerId)return'';
  const year=hyear(r);
  const match=[...historyMoves,...historyRosters,...historyDraft].find(x=>hyear(x)===year&&hteamId(x)===partnerId);
  return match?hteamName(match):(year==='2026'?HISTORY_TEAM_NAMES[partnerId]||'':'')||`Team ${partnerId}`;
}
function tradeGroupKey(r){
  // Transaction ID is the primary boundary. Different ESPN transactions
  // are always displayed as different trades, even for the same two teams.
  const year=hyear(r);
  const week=hweek(r);
  const tx=hval(r,'Transaction ID','TransactionId');
  if(tx)return`trade:${year}:week:${week}:tx:${tx}`;

  // Some reconstructed historical trades have no ESPN transaction ID.
  // Keep those bounded by season + week + team pairing so repeated trades
  // between the same managers in different weeks never merge together.
  const a=hteamId(r),b=Number(hval(r,'Trade Partner ID','TradePartnerId','Partner Team ID','PartnerTeamId'))||0;
  const ids=[a,b].filter(Boolean).sort((x,y)=>x-y).join('-');
  const names=[hteamName(r),tradePartnerName(r)].filter(Boolean).sort().join('|');
  const notes=hval(r,'Notes');
  return`trade:${year}:week:${week}:${ids||names}:${notes}`;
}
function uniqueTradeRows(rows){
  const seen=new Set();
  return rows.filter(r=>{
    const key=[hteamId(r),hplayer(r),(hval(r,'Direction','Move')||'IN').toUpperCase()].join('|');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}
function tradeTeamBlock(teamRows,teamName){
  const rows=uniqueTradeRows(teamRows);
  const incoming=rows.filter(r=>(hval(r,'Direction','Move')||'IN').toUpperCase()!=='OUT');
  const outgoing=rows.filter(r=>(hval(r,'Direction','Move')||'IN').toUpperCase()==='OUT');
  const lines=[];
  incoming.forEach(r=>lines.push(`<div class="trade-player"><span class="move-sign move-in">+</span><span>${esc(hplayer(r))}</span></div>`));
  outgoing.forEach(r=>lines.push(`<div class="trade-player"><span class="move-sign move-out">−</span><span>${esc(hplayer(r))}</span></div>`));
  return `<div class="trade-side"><strong>${esc(teamName)}</strong>${lines.join('')||'<small class="muted">No player movement listed</small>'}</div>`;
}
function renderTradeGroup(rows,allTeams){
  const clean=uniqueTradeRows(rows);
  const teamIds=[...new Set(clean.map(hteamId).filter(Boolean))];
  const first=clean[0];
  const firstTeam=hteamName(first),partner=tradePartnerName(first);
  let title=partner?`Trade: ${firstTeam} ↔ ${partner}`:`Trade: ${firstTeam}`;
  let body='';
  if(allTeams&&teamIds.length>1){
    const names=teamIds.map(id=>hteamName(clean.find(r=>hteamId(r)===id)));
    title=`Trade: ${names.join(' ↔ ')}`;
    body=teamIds.map(id=>tradeTeamBlock(clean.filter(r=>hteamId(r)===id),hteamName(clean.find(r=>hteamId(r)===id)))).join('');
  }else{
    const selectedId=Number(document.querySelector('#historyTeam').value)||hteamId(first);
    const mine=clean.filter(r=>hteamId(r)===selectedId);
    const mineName=mine.length?hteamName(mine[0]):firstTeam;
    const other=mine.length?tradePartnerName(mine[0]):partner;
    title=other?`Trade with ${other}`:`Trade`;
    body=tradeTeamBlock(mine.length?mine:clean,mineName);
  }
  return `<div class="trade-card"><div class="trade-title">${esc(title)}</div><div class="trade-body">${body}</div></div>`;
}
function renderRosterMoves(){
  const y=document.querySelector('#historyYear').value,t=document.querySelector('#historyTeam').value,w=+document.querySelector('#historyWeek').value;
  const rows=historyMoves.filter(r=>hyear(r)===y&&(t==='all'||hteamId(r)===+t)&&hweek(r)===w);
  const target=document.querySelector('#rosterMoves');
  if(!rows.length){target.innerHTML='<p class="muted">No lasting roster moves for this selection in this week.</p>';return}

  const tradeGroups=new Map(),normal=[];
  rows.forEach(r=>{
    if(isHistoryTrade(r)){
      const key=tradeGroupKey(r);
      if(!tradeGroups.has(key))tradeGroups.set(key,[]);
      tradeGroups.get(key).push(r);
    }else normal.push(r);
  });

  const tradeHTML=[...tradeGroups.values()].map(group=>renderTradeGroup(group,t==='all')).join('');
  const normalHTML=normal.map(r=>{
    const dir=(hval(r,'Direction','Move')||'IN').toUpperCase();
    const type=hval(r,'Transaction Type','Type')||hval(r,'Move Type','MoveType');
    const faab=hval(r,'FAAB','Bid');
    const showFaab=Number(y)>=2026&&faab!=='';
    const meta=[t==='all'?hteamName(r):'',type,showFaab?`$${faab} FAAB`:''].filter(Boolean).join(' • ');
    return `<div class="move-row"><span class="move-sign ${dir==='OUT'?'move-out':'move-in'}">${dir==='OUT'?'−':'+'}</span><div><strong>${esc(hplayer(r))}</strong>${meta?`<small>${esc(meta)}</small>`:''}</div></div>`;
  }).join('');

  target.innerHTML=tradeHTML+normalHTML;
}




async function loadDraftRecapPage(){
  const status=document.querySelector('#status');
  try{const [draftText,settingsText]=await Promise.all([URLS.draftHistory,URLS.settings].map(u=>fetch(u,{cache:'no-store'}).then(x=>{if(!x.ok)throw Error(x.status);return x.text()})));historyDraft=historyObjects(draftText);parseTeams(csv(settingsText));setupDraftRecapControls();status.textContent='Live draft history loaded'}catch(e){status.textContent='Could not load draft history';console.error(e)}
}
function draftOwnerForRow(r){
  const year=hyear(r),teamName=hteamName(r);
  const exact=teams.find(t=>t.year===year&&t.team===teamName);
  return exact?.owner||'';
}
function draftOwnersForYear(year){
  return [...new Set(historyDraft.filter(r=>hyear(r)===year).map(draftOwnerForRow).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function draftYearsForOwner(owner){
  return [...new Set(historyDraft.filter(r=>draftOwnerForRow(r)===owner).map(hyear).filter(Boolean))].sort((a,b)=>+b-+a);
}
function setupDraftRecapControls(){
  const ys=document.querySelector('#draftYear'),os=document.querySelector('#draftOwner');
  const allYears=[...new Set(historyDraft.map(hyear).filter(Boolean))].sort((a,b)=>+b-+a);
  const latestYear=allYears[0]||'';
  let year=latestYear;
  let owner='all';

  function setOwnerOptions(owners,preferred){
    const options=['all',...owners];
    os.innerHTML=options.map(o=>o==='all'?'<option value="all">All Owners</option>':`<option value="${esc(o)}">${esc(o)}</option>`).join('');
    os.value=options.includes(preferred)?preferred:'all';
  }
  function setYearOptions(years,preferred){
    ys.innerHTML=years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
    ys.value=years.includes(preferred)?preferred:(years[0]||'');
  }
  function ownerChanged(){
    owner=os.value;
    const years=owner==='all'?allYears:draftYearsForOwner(owner);
    setYearOptions(years,ys.value);
    year=ys.value;
    renderDraftRecap();
  }
  function yearChanged(){
    year=ys.value;
    const owners=draftOwnersForYear(year);
    setOwnerOptions(owners,os.value);
    owner=os.value;
    renderDraftRecap();
  }

  setYearOptions(allYears,year);
  setOwnerOptions(draftOwnersForYear(ys.value),'all');
  os.onchange=ownerChanged;
  ys.onchange=yearChanged;
  renderDraftRecap();
}
function draftPlayerLabel(r){const pos=hval(r,'Position','Pos','Player Position','PlayerPosition'),team=hval(r,'Pro Team','ProTeam','NFL Team','NFLTeam','Team Abbreviation','TeamAbbreviation','Pro Team Abbreviation','ProTeamAbbreviation');return `${hplayer(r)}${pos||team?` — ${pos||''}${team?` (${team})`:''}`:''}`}
function renderDraftRecap(){
  const y=document.querySelector('#draftYear').value,owner=document.querySelector('#draftOwner').value;
  const rows=historyDraft.filter(r=>hyear(r)===y&&(owner==='all'||draftOwnerForRow(r)===owner)).sort((a,b)=>Number(hval(a,'Overall Pick','OverallPick','Pick'))-Number(hval(b,'Overall Pick','OverallPick','Pick')));
  const teamName=owner!=='all'&&rows.length?hteamName(rows[0]):'';
  document.querySelector('#draftTitle').textContent=owner==='all'?`${y} Draft Recap`:(teamName?`${owner} — ${teamName} — ${y} Draft`:`${owner} — ${y} Draft`);
  document.querySelector('#draftHistory').innerHTML=rows.length?rows.map(r=>{const overall=hval(r,'Overall Pick','OverallPick','Pick'),round=hval(r,'Round'),rp=hval(r,'Round Pick','RoundPick'),rowOwner=draftOwnerForRow(r);const meta=[round?`Round ${round}`:'',rp?`Pick ${rp}`:'',owner==='all'?rowOwner:''].filter(Boolean).join(' • ');return `<div class="draft-row"><span class="draft-pick">${overall?`#${esc(overall)}`:'—'}</span><img class="draft-team-logo" ${logoAttrs(historyTeamLogo(r))} alt=""><div><strong>${esc(draftPlayerLabel(r))}</strong><small>${esc(meta)}</small></div></div>`}).join(''):'<p class="muted">No draft data for this selection.</p>';
}


// Trade Recap: every completed historical trade, grouped by transaction.
async function loadTradeRecapPage(){
  const status=document.querySelector('#status');
  try{
    const [movesText,settingsText]=await Promise.all([URLS.rosterMoves,URLS.settings].map(u=>fetch(u,{cache:'no-store'}).then(x=>{if(!x.ok)throw Error(x.status);return x.text()})));
    historyMoves=historyObjects(movesText);
    parseTeams(csv(settingsText));
    setupTradeRecapControls();
    status.textContent='Live trade history loaded';
  }catch(e){
    status.textContent='Could not load trade history';
    console.error(e);
  }
}
function setupTradeRecapControls(){
  const ys=document.querySelector('#tradeYear');
  const years=[...new Set(historyMoves.filter(isHistoryTrade).map(hyear).filter(Boolean))].sort((a,b)=>+b-+a);
  ys.innerHTML=years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
  ys.onchange=renderTradeRecap;
  renderTradeRecap();
}
function tradeRecapTeamInfo(year,id,name){
  const exact=teams.find(t=>t.year===String(year)&&t.team===name);
  if(exact)return exact;
  const row=historyMoves.find(r=>hyear(r)===String(year)&&hteamId(r)===Number(id));
  const resolved=row?hteamName(row):name||`Team ${id}`;
  return teams.find(t=>t.year===String(year)&&t.team===resolved)||{team:resolved,owner:'',logo:FALLBACK_LOGO};
}
function tradeRecapSide(rows,teamId,year,fallbackName,partnerId){
  const ownRows=uniqueTradeRows(rows.filter(r=>hteamId(r)===Number(teamId)));
  const partnerRows=uniqueTradeRows(rows.filter(r=>hteamId(r)===Number(partnerId)));
  const name=ownRows.length?hteamName(ownRows[0]):fallbackName||`Team ${teamId}`;
  const info=tradeRecapTeamInfo(year,teamId,name);

  // Build this side from every asset in the transaction. If one reciprocal
  // row is absent, infer it from the partner's row instead of dropping it.
  const assets=new Map();
  ownRows.forEach(r=>{
    const player=hplayer(r),dir=(hval(r,'Direction','Move')||'IN').toUpperCase();
    if(player)assets.set(player,dir);
  });
  partnerRows.forEach(r=>{
    const player=hplayer(r);
    if(!player||assets.has(player))return;
    const partnerDir=(hval(r,'Direction','Move')||'IN').toUpperCase();
    assets.set(player,partnerDir==='OUT'?'IN':'OUT');
  });

  const incoming=[...assets].filter(([,dir])=>dir!=='OUT').map(([player])=>player);
  const outgoing=[...assets].filter(([,dir])=>dir==='OUT').map(([player])=>player);
  const players=[
    ...incoming.map(player=>`<div class="trade-recap-player"><span class="move-sign move-in">+</span><span>${esc(player)}</span></div>`),
    ...outgoing.map(player=>`<div class="trade-recap-player"><span class="move-sign move-out">−</span><span>${esc(player)}</span></div>`)
  ].join('')||'<p class="muted">No player movement listed.</p>';
  return `<div class="trade-recap-side"><div class="trade-recap-team"><img ${logoAttrs(info.logo)} alt=""><div><strong>${esc(info.team||name)}</strong>${info.owner?`<small>${esc(info.owner)}</small>`:''}</div></div><div class="trade-recap-players">${players}</div></div>`;
}
function renderTradeRecap(){
  const target=document.querySelector('#tradeRecapList');
  const title=document.querySelector('#tradeRecapTitle');
  const y=document.querySelector('#tradeYear').value;
  if(!y){title.textContent='Trade Recap';target.innerHTML='<p class="muted">No trade history available.</p>';return}
  const rows=historyMoves.filter(r=>hyear(r)===y&&isHistoryTrade(r));
  const groups=new Map();
  rows.forEach(r=>{const key=tradeGroupKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)});
  const trades=[...groups.values()].sort((a,b)=>hweek(a[0])-hweek(b[0]));
  title.textContent=`${y} Trades`;
  target.innerHTML=trades.length?trades.map(group=>{
    const clean=uniqueTradeRows(group),first=clean[0],week=hweek(first);
    const ids=[...new Set(clean.map(hteamId).filter(Boolean))];
    const firstId=ids[0]||hteamId(first);
    let partnerId=Number(hval(first,'Trade Partner ID','TradePartnerId','Partner Team ID','PartnerTeamId'))||0;
    let partnerName=tradePartnerName(first);
    if(ids.length>1)partnerId=ids.find(id=>id!==firstId)||partnerId;
    if(!partnerName&&partnerId){const pr=historyMoves.find(r=>hyear(r)===y&&hteamId(r)===partnerId);partnerName=pr?hteamName(pr):`Team ${partnerId}`}
    const firstName=hteamName(first);
    const left=tradeRecapSide(clean,firstId,y,firstName,partnerId);
    const right=partnerId?tradeRecapSide(clean,partnerId,y,partnerName,firstId):`<div class="trade-recap-side"><div class="trade-recap-team"><img ${logoAttrs(FALLBACK_LOGO)} alt=""><div><strong>${esc(partnerName||'Trade Partner')}</strong></div></div></div>`;
    return `<article class="trade-recap-card"><div class="trade-recap-week">Week ${week}</div><div class="trade-recap-sides">${left}<div class="trade-recap-arrow">↔</div>${right}</div></article>`;
  }).join(''):'<p class="muted">No trades recorded for this season.</p>';
}