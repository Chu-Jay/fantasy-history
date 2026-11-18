/* Exact record/head-to-head clinching engine. No projections or Monte Carlo.
 * One matchup has exactly one of three outcomes; unfinished H2H meetings are
 * assigned inside the same schedule search. Points are NEVER silently used
 * to settle an unresolved pre-final-week tiebreaker.
 * Exported for unit-testing in Node and imported by scenario-worker.js.
 */
(function(root){
'use strict';
const LEVELS=[{n:1,label:'1st Seed'},{n:2,label:'First-Round Bye'},{n:3,label:'3rd or Better'},{n:4,label:'4th or Better'},{n:5,label:'5th or Better'},{n:6,label:'Playoff Berth'},{n:0,label:'Elimination'}];
const LIMIT=8;
const descendants=[null];
function setup(pairs){
  const owners=[...new Set(pairs.flatMap(g=>[g.a,g.b]))].sort();
  const ix=new Map(owners.map((x,i)=>[x,i]));
  const games=pairs.map(g=>({key:g.key,week:Number(g.week),a:ix.get(g.a),b:ix.get(g.b),played:!!g.played,v:g.played?(g.aScore>g.bScore?0:g.bScore>g.aScore?1:2):-1}));
  return {owners,games,n:owners.length,firstWeek:Math.min(...games.filter(g=>!g.played).map(g=>g.week),99)};
}
function addGame(p,hg,hp,g,v,sign){
  const a=g.a,b=g.b,n=LIMIT;
  p[a]+=sign*(v===0?2:v===2?1:0);
  p[b]+=sign*(v===1?2:v===2?1:0);
  hg[a*n+b]+=sign; hg[b*n+a]+=sign;
  hp[a*n+b]+=sign*(v===0?2:v===2?1:0);
  hp[b*n+a]+=sign*(v===1?2:v===2?1:0);
}
// Returns all possible ranks of one team within its tied-record group, allowing
// every unresolved PF/PA or ESPN coin-flip ordering. After ONE winner is selected,
// head-to-head is recalculated for the surviving tie group.
function tieRange(target,mask,hg,hp,n){
  const memo=new Map();
  const visit=(m)=>{
    if(m===(1<<target))return [1,1];
    if(memo.has(m))return memo.get(m);
    const ids=[];for(let i=0;i<n;i++)if(m&(1<<i))ids.push(i);
    const totals=[],counts=[];
    for(const i of ids){let pts=0,games=0;for(const j of ids){pts+=hp[i*LIMIT+j];games+=hg[i*LIMIT+j]}totals.push(pts);counts.push(games)}
    const h2hOK=counts[0]>0&&counts.every(x=>x===counts[0]);
    const highest=h2hOK?Math.max(...totals):null;
    const winners=h2hOK?ids.filter((_,k)=>totals[k]===highest):ids;
    let min=Infinity,max=-Infinity;
    for(const winner of winners){
      if(winner===target){min=1;max=Math.max(max,1)}
      else{const r=visit(m&~(1<<winner));min=Math.min(min,1+r[0]);max=Math.max(max,1+r[1])}
    }
    const result=[min,max];memo.set(m,result);return result;
  };
  return visit(mask);
}
function rankRange(target,p,hg,hp,n){
  let ahead=0,group=0;
  for(let i=0;i<n;i++){if(p[i]>p[target])ahead++;if(p[i]===p[target])group|=1<<i}
  const r=tieRange(target,group,hg,hp,n);return [ahead+r[0],ahead+r[1]];
}
// Find mathematically exact extreme seed for a candidate, conditional on any
// known/forced outcomes. The candidate's *own* remaining games can safely be
// fixed to ALL WINS for best seed or ALL LOSSES for worst seed: either change
// can only help/hurt that candidate's record and H2H standing.
// Crucially, the OTHER teams' games are searched JOINTLY, never independently.
function extremeSeed(config,target,forced,kind){
  const {games,n}=config;if(n>LIMIT)throw Error('The engine supports up to eight teams.');
  const p=new Int16Array(n),hg=new Int16Array(LIMIT*LIMIT),hp=new Int16Array(LIMIT*LIMIT),free=[];
  for(const g of games){
    let v=g.v;
    if(v<0&&forced&&forced[g.key]!==undefined)v=forced[g.key];
    if(v<0&&(g.a===target||g.b===target))v=kind==='worst'?(g.a===target?1:0):(g.a===target?0:1);
    if(v<0)free.push(g);else addGame(p,hg,hp,g,v,1);
  }
  const targetPts=p[target],potential=Array(n).fill(0);
  for(const g of free){potential[g.a]+=2;potential[g.b]+=2}
  // Outcomes of games with neither possible contender are immaterial to the
  // target's ranking. Excluding them does NOT create incompatible results.
  const mayTie=Array.from({length:n},(_,i)=>i!==target&&p[i]+potential[i]>=targetPts);
  const relevant=free.filter(g=>mayTie[g.a]||mayTie[g.b]);
  potential.fill(0);
  for(const g of relevant){potential[g.a]+=2;potential[g.b]+=2}
  relevant.sort((a,b)=>(+mayTie[b.a]+ +mayTie[b.b])-(+mayTie[a.a]+ +mayTie[a.b]));
  let optimum=kind==='worst'?1:n,leaves=0,nodes=0;
  function walk(at){
    nodes++;
    let lower=1,upper=1;
    for(let i=0;i<n;i++){if(i===target)continue;
      if(p[i]>targetPts)lower++;
      if(p[i]+potential[i]>=targetPts)upper++;
    }
    if(kind==='worst'){
      if(upper<=optimum)return;
      if(lower>optimum)optimum=lower;
      if(optimum===n)return;
    }else{
      if(lower>=optimum)return;
      if(upper===1){optimum=1;return}
    }
    if(at===relevant.length){
      leaves++;const range=rankRange(target,p,hg,hp,n);
      if(kind==='worst')optimum=Math.max(optimum,range[1]);
      else optimum=Math.min(optimum,range[0]);
      return;
    }
    const g=relevant[at];potential[g.a]-=2;potential[g.b]-=2;
    const order=kind==='worst'?[0,1,2]:[0,1,2];
    for(const v of order){addGame(p,hg,hp,g,v,1);walk(at+1);addGame(p,hg,hp,g,v,-1);
      if((kind==='worst'&&optimum===n)||(kind==='best'&&optimum===1))break;
    }
    potential[g.a]+=2;potential[g.b]+=2;
  }
  walk(0);
  return {rank:optimum,nodes,leaves};
}
function stateAssignments(games,n){
  const total=3**games.length,states=[];
  for(let i=0;i<total;i++){
    let x=i;const outcomes=Array(games.length).fill(0);
    for(let j=games.length-1;j>=0;j--){outcomes[j]=x%3;x=Math.floor(x/3)}
    const forced={};games.forEach((g,j)=>forced[g.key]=outcomes[j]);
    states.push({outcomes,forced,rankMin:Array(n),rankMax:Array(n)});
  }
  return states;
}
function calculateState(config,state){
  let nodes=0;
  for(let i=0;i<config.n;i++){
    const best=extremeSeed(config,i,state.forced,'best');
    const worst=extremeSeed(config,i,state.forced,'worst');
    state.rankMin[i]=best.rank;state.rankMax[i]=worst.rank;
    nodes+=best.nodes+worst.nodes;
  }
  return nodes;
}
function patternsFor(states,oi,level){
  const games=states[0].outcomes.length,good=states.map(s=>level===0?s.rankMin[oi]>6:s.rankMax[oi]<=level);
  if(good.every(Boolean)||good.every(x=>!x))return [];
  const out=[];
  function enumerate(at,pat){
    if(at===games){
      if(pat.every(x=>x===-1))return;
      let matches=false;
      for(let j=0;j<states.length;j++){
        if(pat.every((v,k)=>v===-1||v===states[j].outcomes[k])){
          if(!good[j])return;matches=true;
        }
      }
      if(matches)out.push(pat.slice());return;
    }
    for(const v of [-1,0,1,2]){pat.push(v);enumerate(at+1,pat);pat.pop()}
  }
  enumerate(0,[]);
  return out.filter(p=>!out.some(q=>q!==p&&q.every((v,i)=>v===-1||v===p[i])&&q.some((v,i)=>v===-1&&p[i]!==-1)))
    .sort((a,b)=>a.filter(x=>x!==-1).length-b.filter(x=>x!==-1).length||a.join().localeCompare(b.join()));
}
function summarize(config,states){
  const games=config.games.filter(g=>!g.played&&g.week===config.firstWeek),
  marks=[],scenarios=[];
  for(let oi=0;oi<config.n;oi++){
    const worst=Math.max(...states.map(s=>s.rankMax[oi]));
    const best=Math.min(...states.map(s=>s.rankMin[oi]));
    const marker=worst<=1?'xyz':worst<=2?'xy':worst<=6?'x':best>6?'e':'';
    marks.push(marker);
    const levels=[];
    for(const lev of LEVELS){
      if(lev.n===0&&best>6)continue;
      if(lev.n>0&&worst<=lev.n)continue;
      const patterns=patternsFor(states,oi,lev.n);
      if(patterns.length)levels.push({label:lev.label,n:lev.n,patterns});
    }
    // Redundant identical patterns are covered by the stronger achievement,
    // but strict alternative requirements are retained under each milestone.
    const higher=new Set();
    for(const lev of levels){lev.patterns=lev.patterns.filter(p=>!higher.has(p.join(',')));
      for(const p of lev.patterns)higher.add(p.join(','));
    }
    scenarios.push({owner:config.owners[oi],levels:levels.filter(l=>l.patterns.length)});
  }
  return {games:games.map(g=>({key:g.key,a:config.owners[g.a],b:config.owners[g.b]})),marks,scenarios,owners:config.owners,week:config.firstWeek};
}
const api={LEVELS,setup,extremeSeed,calculateState,stateAssignments,summarize,rankRange,tieRange};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ScenarioCore=api;
})(typeof self!=='undefined'?self:globalThis);
