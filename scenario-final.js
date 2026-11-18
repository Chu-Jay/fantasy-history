/* Exact final-week score-domain scenario solver.
 * Each Week 14 score is an integer number of hundredths. Comparisons of season
 * PF, PA and game results are difference constraints. Floyd-Warshall eliminates
 * impossible combinations without enumerating billions of score assignments.
 * Multi-team ties restart H2H after each selected seed. An unresolved coin flip
 * is considered in EVERY direction for mathematical guarantees.
 */
(function(root){
'use strict';
const INF=1000000000000,LOW=1000,HIGH=99999;
class Bounds{
  constructor(n){this.n=n;this.z=n;const len=n+1;this.d=Array.from({length:len},(_,i)=>Array.from({length:len},(_,j)=>i===j?0:INF));
    for(let i=0;i<n;i++){this.d[i][n]=HIGH;this.d[n][i]=-LOW}
    this.close();
  }
  copy(){const c=Object.create(Bounds.prototype);c.n=this.n;c.z=this.z;c.d=this.d.map(r=>r.slice());return c}
  close(){const d=this.d,len=this.n+1;
    for(let k=0;k<len;k++)for(let i=0;i<len;i++)if(d[i][k]<INF)for(let j=0;j<len;j++){
      const v=d[i][k]+d[k][j];if(v<d[i][j])d[i][j]=v;
    }
    return d.every((r,i)=>r[i]>=0)
  }
  limit(i,j,max){if(this.d[i][j]>max){this.d[i][j]=max;return this.close()}return true}
  constrain(i,j,lo,hi){const clone=this.copy();if(lo!==null&&!clone.limit(j,i,-lo))return null;if(hi!==null&&!clone.limit(i,j,hi))return null;return clone}
  range(i,j){return [-this.d[j][i],this.d[i][j]]}
}
function staticRanking(pairs,owners,outcomes){
  const n=owners.length,index=new Map(owners.map((x,i)=>[x,i]));
  const rp=Array(n).fill(0),hg=Array.from({length:n},()=>Array(n).fill(0)),hp=Array.from({length:n},()=>Array(n).fill(0));
  const pf=Array(n).fill(0),pa=Array(n).fill(0),opponent=Array(n).fill(-1),scoreVar=Array(n).fill(n);
  for(const g of pairs){const a=index.get(g.a),b=index.get(g.b),v=g.played?(g.aScore>g.bScore?0:g.bScore>g.aScore?1:2):outcomes[g.key];
    if(v===undefined)throw Error('Every final-week game must have an outcome.');
    rp[a]+=v===0?2:v===2?1:0;rp[b]+=v===1?2:v===2?1:0;
    hg[a][b]++;hg[b][a]++;hp[a][b]+=v===0?2:v===2?1:0;hp[b][a]+=v===1?2:v===2?1:0;
    if(g.played){pf[a]+=Math.round(g.aScore*100);pf[b]+=Math.round(g.bScore*100);pa[a]+=Math.round(g.bScore*100);pa[b]+=Math.round(g.aScore*100)}
    else{opponent[a]=b;opponent[b]=a;scoreVar[a]=a;scoreVar[b]=b}
  }
  return{n,owners,rp,hg,hp,pf,pa,opponent,scoreVar};
}
function h2hCandidates(ids,data){
  if(ids.length<=1)return ids;
  const rec=ids.map(i=>{let games=0,points=0;for(const j of ids){games+=data.hg[i][j];points+=data.hp[i][j]}return{games,points}});
  if(rec[0].games===0||!rec.every(r=>r.games===rec[0].games))return ids;
  const top=Math.max(...rec.map(r=>r.points));return ids.filter((_,i)=>rec[i].points===top);
}
function metricVars(data,i,j,metric){
  if(metric==='pf')return {i:data.scoreVar[i],j:data.scoreVar[j],offset:data.pf[i]-data.pf[j]};
  return {i:data.opponent[i]>=0?data.opponent[i]:data.n,j:data.opponent[j]>=0?data.opponent[j]:data.n,offset:data.pa[i]-data.pa[j]};
}
function comparison(data,db,i,j){
  const p=metricVars(data,i,j,'pf'),pr=db.range(p.i,p.j),lo=pr[0]+p.offset,hi=pr[1]+p.offset;
  if(lo>=1)return {sign:1};if(hi<=-1)return {sign:-1};
  if(lo<0||hi>0)return {split:{metric:'pf',i,j}};
  const a=metricVars(data,i,j,'pa'),ar=db.range(a.i,a.j),al=ar[0]+a.offset,ah=ar[1]+a.offset;
  if(al>=1)return {sign:1};if(ah<=-1)return {sign:-1};
  if(al<0||ah>0)return {split:{metric:'pa',i,j}};
  return {sign:0}; // all known tiebreakers equal -> ESPN coin flip
}
function winnerState(ids,data,db){
  const h=h2hCandidates(ids,data),beaten=new Set(),unknown=[];
  const statuses=[];
  for(let ai=0;ai<h.length;ai++)for(let bi=ai+1;bi<h.length;bi++){
    const i=h[ai],j=h[bi],res=comparison(data,db,i,j);
    statuses.push({i,j,...res});
    if(res.sign===1)beaten.add(j);if(res.sign===-1)beaten.add(i);
  }
  const contenders=h.filter(i=>!beaten.has(i));
  for(const s of statuses)if(s.split&&contenders.includes(s.i)&&contenders.includes(s.j))unknown.push(s.split);
  return {winners:contenders,split:unknown[0]||null};
}
function findSplit(data,db){
  const groups=new Map();data.rp.forEach((value,i)=>{if(!groups.has(value))groups.set(value,[]);groups.get(value).push(i)});
  const seen=new Set();
  function explore(ids){
    if(ids.length<2)return null;
    const key=ids.reduce((m,i)=>m|(1<<i),0);if(seen.has(key))return null;seen.add(key);
    const state=winnerState(ids,data,db);if(state.split)return state.split;
    for(const w of state.winners){const split=explore(ids.filter(i=>i!==w));if(split)return split}
    return null;
  }
  for(const ids of groups.values()){const split=explore(ids);if(split)return split}
  return null;
}
function outcomeRanks(data,db){
  const n=data.n,min=Array(n).fill(n),max=Array(n).fill(1);
  const groups=[...new Map(data.rp.map((v,i)=>[v,(data.rp.map((x,j)=>x===v?j:-1).filter(x=>x>=0))])).entries()]
    .sort((a,b)=>b[0]-a[0]).map(([_,v])=>v);
  let start=1;
  for(const ids of groups){
    const memo=new Map();
    function recurse(rem){
      const key=rem.reduce((s,i)=>s|1<<i,0);if(memo.has(key))return memo.get(key);
      const localMin=Array(n).fill(n),localMax=Array(n).fill(1);
      if(rem.length===1){localMin[rem[0]]=1;localMax[rem[0]]=1}
      else{
        const w=winnerState(rem,data,db);
        if(w.split)throw Error('Undetermined scoring comparison reached terminal ranking.');
        for(const top of w.winners){
          localMin[top]=1;localMax[top]=Math.max(localMax[top],1);
          const r=recurse(rem.filter(i=>i!==top));
          for(const i of rem)if(i!==top){localMin[i]=Math.min(localMin[i],r[0][i]+1);localMax[i]=Math.max(localMax[i],r[1][i]+1)}
        }
      }
      const result=[localMin,localMax];memo.set(key,result);return result;
    }
    const [lo,hi]=recurse(ids);
    for(const i of ids){min[i]=start+lo[i]-1;max[i]=start+hi[i]-1}start+=ids.length;
  }
  return {min,max};
}
function addCondition(db,data,condition){
  const {metric,i,j,relation}=condition,{offset,...vars}=metricVars(data,i,j,metric);
  const lo=relation==='gt'?1-offset:(relation==='eq'||relation==='ge')?-offset:null;
  const hi=relation==='lt'?-1-offset:(relation==='eq'||relation==='le')?-offset:null;
  return db.constrain(vars.i,vars.j,lo,hi);
}
function keyAtom(a){return `${a.metric}:${a.i}:${a.j}:${a.relation}`}
function serializeAtoms(atoms){return atoms.map(keyAtom).sort().join(';')}
function dedupPaths(paths){const seen=new Set();return paths.filter(p=>{const k=serializeAtoms(p);if(seen.has(k))return false;seen.add(k);return true})}
// Disjoint score regions are exact: each path is sufficient for the reported
// milestone. An equal PF branch may include a PA condition as a separate AND.
// At most 8 score variables are used; no integer score itself is enumerated.
function evaluateFinalState(config,pairs,outcomes,opts={}){
  const data=staticRanking(pairs,config.owners,outcomes),next=config.games.filter(g=>!g.played&&g.week===14),db=new Bounds(data.n);
  let current=db;
  for(const g of next){const v=outcomes[g.key];
    const lo=v===0?1:v===2?0:null,hi=v===1?-1:v===2?0:null;
    const restricted=current.constrain(g.a,g.b,lo,hi);if(!restricted)return null;current=restricted;
  }
  const targets=config.n*7;
  let leaves=0,nodes=0;
  const cap=opts.cap||400000;
  function solve(bounds){
    nodes++;if(nodes>cap)throw Error(`Week 14 symbolic search exceeded ${cap.toLocaleString()} regions; no incomplete scenarios will be claimed.`);
    const undecided=findSplit(data,bounds);
    if(!undecided){
      leaves++;const ranks=outcomeRanks(data,bounds);
      return Array.from({length:targets},(_,k)=>{
        const i=Math.floor(k/7),z=k%7,n=z===6?0:z+1;
        const good=n===0?ranks.min[i]>6:ranks.max[i]<=n;
        return good?[[]]:[];
      });
    }
    const branches=[];
    for(const relation of ['gt','eq','lt']){
      const restricted=addCondition(bounds,data,{...undecided,relation});if(!restricted)continue;
      branches.push({relation,paths:solve(restricted)});
    }
    const available=new Set(branches.map(b=>b.relation));
    return Array.from({length:targets},(_,k)=>{
      const byTail=new Map();
      for(const branch of branches){
        for(const tail of branch.paths[k]){
          const key=serializeAtoms(tail);
          if(!byTail.has(key))byTail.set(key,{tail,relations:new Set()});
          byTail.get(key).relations.add(branch.relation);
        }
      }
      const output=[];
      for(const {tail,relations} of byTail.values()){
        // If a clause covers *every feasible branch*, the comparison is
        // unnecessary. Adjacent signs merge into inclusive comparisons.
        if([...available].every(r=>relations.has(r))){output.push(tail);continue}
        if(relations.has('gt')&&relations.has('eq')){
          output.push([{...undecided,relation:'ge'},...tail]);relations.delete('gt');relations.delete('eq');
        }
        if(relations.has('eq')&&relations.has('lt')){
          output.push([{...undecided,relation:'le'},...tail]);relations.delete('eq');relations.delete('lt');
        }
        for(const relation of relations)output.push([{...undecided,relation},...tail]);
      }
      return dedupPaths(output).filter(p=>!output.some(q=>q!==p&&q.length<p.length&&q.every(a=>p.some(b=>keyAtom(a)===keyAtom(b)))));
    });
  }
  const allPaths=solve(current);
  return{data,paths:allPaths,all:allPaths.map(paths=>paths.some(p=>p.length===0)),leaves,nodes};
}
function formatCondition(data,atom){
  const a=data.owners[atom.i],b=data.owners[atom.j],{offset}=metricVars(data,atom.i,atom.j,atom.metric);
  const delta=atom.relation==='gt'?1-offset:(atom.relation==='eq'||atom.relation==='ge')?-offset:-1-offset;
  const f=n=>(Math.abs(n)/100).toFixed(2);
  const subject=atom.metric==='pf'?'scores':'allows',word=atom.relation==='eq'?'exactly':'at least';
  // Week 14 may be partly completed. Express remaining scoring thresholds
  // directly, rather than referring to a score from a finished matchup.
  const metric=metricVars(data,atom.i,atom.j,atom.metric);
  if(metric.i===data.n&&metric.j!==data.n){
    const cutoff=metric.offset-(atom.relation==='gt'?1:atom.relation==='lt'?-1:0);
    if(atom.relation==='eq')return `${b} ${subject} exactly ${(cutoff/100).toFixed(2)} points`;
    if(atom.relation==='gt')return `${b} ${subject} at most ${(cutoff/100).toFixed(2)} points`;
    if(atom.relation==='ge')return `${b} ${subject} at most ${(cutoff/100).toFixed(2)} points`;
    if(atom.relation==='lt')return `${b} ${subject} at least ${(cutoff/100).toFixed(2)} points`;
    return `${b} ${subject} at least ${(cutoff/100).toFixed(2)} points`;
  }
  if(metric.j===data.n&&metric.i!==data.n){
    const cutoff=-metric.offset+(atom.relation==='gt'?1:atom.relation==='lt'?-1:0);
    if(atom.relation==='eq')return `${a} ${subject} exactly ${(cutoff/100).toFixed(2)} points`;
    if(atom.relation==='gt')return `${a} ${subject} at least ${(cutoff/100).toFixed(2)} points`;
    if(atom.relation==='ge')return `${a} ${subject} at least ${(cutoff/100).toFixed(2)} points`;
    if(atom.relation==='lt')return `${a} ${subject} at most ${(cutoff/100).toFixed(2)} points`;
    return `${a} ${subject} at most ${(cutoff/100).toFixed(2)} points`;
  }
  if(atom.relation==='lt'||atom.relation==='le'){
    // A < B is expressed as the equivalent B > A.
    const reversed={...atom,i:atom.j,j:atom.i,relation:atom.relation==='lt'?'gt':'ge'};return formatCondition(data,reversed);
  }
  if(delta>=0)return `${a} ${subject} ${word} ${f(delta)} more points than ${b}`;
  return atom.relation==='eq'?`${a} ${subject} exactly ${f(delta)} fewer points than ${b}`:`${a} ${subject} no more than ${f(delta)} fewer points than ${b}`;
}
function finishPaths(finalOutcomes,results,config){
  // Each region represents a real, feasible score assignment. The map stores
  // exactly the conjunction of outcomes and score inequalities that certifies
  // a milestone; none may depend on projected Playoff Machine picks.
  const info=[];let nodes=0,leaves=0;
  for(const {outcomes,state} of results){nodes+=state.nodes;leaves+=state.leaves;
    for(let i=0;i<config.n;i++)for(let z=0;z<7;z++){
      const clauses=state.paths[i*7+z];for(const atoms of clauses)info.push({owner:config.owners[i],level:z,weekOutcomes:outcomes.slice(),atoms:atoms.map(a=>formatCondition(state.data,a)),rawAtoms:atoms});
    }
  }
  return{info,nodes,leaves};
}
const api={Bounds,staticRanking,comparison,addCondition,findSplit,outcomeRanks,evaluateFinalState,formatCondition,finishPaths};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ScenarioFinal=api;
})(typeof self!=='undefined'?self:globalThis);
