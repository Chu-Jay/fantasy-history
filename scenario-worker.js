/* Runs exact search off the main UI thread. */
importScripts('scenario-core.js','scenario-final.js');
let serial=0;
self.onmessage=function(event){
  const msg=event.data||{},run=++serial;
  try{
    const config=ScenarioCore.setup(msg.pairs||[]);
    if(!config.games.length||config.n!==8||(config.firstWeek>14&&msg.type!=='marks')){
      postMessage({type:'error',token:msg.token,message:'The eight-team regular-season schedule is incomplete.'});return;
    }
    if(msg.type==='marks'){
      if(config.firstWeek===99){
        const data=ScenarioFinal.staticRanking(msg.pairs,config.owners,{});
        const ranks=ScenarioFinal.outcomeRanks(data,new ScenarioFinal.Bounds(config.n));
        const marks=config.owners.map((_,i)=>ranks.max[i]===1?'xyz':ranks.max[i]<=2?'xy':ranks.max[i]<=6?'x':ranks.min[i]>6?'e':'');
        postMessage({type:'marks',token:msg.token,owners:config.owners,marks,nodes:1});return;
      }
      const marks=[];let nodes=0;
      for(let i=0;i<config.n;i++){
        const b=ScenarioCore.extremeSeed(config,i,msg.forced||{},'best');
        const w=ScenarioCore.extremeSeed(config,i,msg.forced||{},'worst');
        marks.push(w.rank<=1?'xyz':w.rank<=2?'xy':w.rank<=6?'x':b.rank>6?'e':'');
        nodes+=b.nodes+w.nodes;
      }
      postMessage({type:'marks',token:msg.token,owners:config.owners,marks,nodes});return;
    }
    const games=config.games.filter(g=>!g.played&&g.week===config.firstWeek);
    if(games.length>6){postMessage({type:'error',token:msg.token,message:'Too many unfinished games in one week.'});return}
    const states=ScenarioCore.stateAssignments(games,config.n),total=states.length;
    const finalWeek=config.firstWeek===14;
    const finalStates=[];
    let at=0,nodes=0;
    function runBatch(){
      try{if(run!==serial)return;
      const end=Math.min(total,at+1);
      for(;at<end;at++){
        if(finalWeek){const fs=ScenarioFinal.evaluateFinalState(config,msg.pairs,states[at].forced,{cap:600000});
          if(!fs)throw Error('No feasible Week 14 scores for these outcomes.');
          finalStates.push({outcomes:states[at].outcomes,state:fs});nodes+=fs.nodes;
        }else nodes+=ScenarioCore.calculateState(config,states[at]);
      }
      if(at<total){
        if(at%3===0)postMessage({type:'progress',token:msg.token,done:at,total,nodes});
        setTimeout(runBatch,0);
      }else{
        const summary=finalWeek?buildFinalSummary(config,finalStates):ScenarioCore.summarize(config,states);
        postMessage({type:'complete',token:msg.token,finalWeek,...summary,nodes});
      }
      }catch(err){postMessage({type:'error',token:msg.token,message:String(err&&err.stack||err)})}
    }
    runBatch();
  }catch(e){postMessage({type:'error',token:msg.token,message:String(e&&e.stack||e)})}
};

function buildFinalSummary(config,results){
  const next=config.games.filter(g=>!g.played&&g.week===14);
  const levels=ScenarioCore.LEVELS,owners=config.owners,scenarios=[],marks=[];
  // Prime implicants over the four Week 14 matchups, grouped by identical
  // exact PF/PA score requirements. Unlike brute-force scores, all branches
  // are symbolic integer-cent intervals.
  function minimizeCover(good){
    const out=[];
    function rec(i,arr){
      if(i===next.length){
        if(!arr.some(v=>v!==-1))return;
        let atLeastOne=false;
        for(let k=0;k<results.length;k++)if(arr.every((v,j)=>v===-1||v===results[k].outcomes[j])){
          if(!good.has(k))return;atLeastOne=true;
        }
        if(atLeastOne)out.push(arr.slice());return;
      }
      for(const v of [-1,0,1,2]){arr.push(v);rec(i+1,arr);arr.pop()}
    }
    rec(0,[]);
    return out.filter(p=>!out.some(q=>q!==p&&q.every((v,i)=>v===-1||v===p[i])&&q.some((v,i)=>v===-1&&p[i]!==-1)));
  }
  for(let i=0;i<owners.length;i++){
    const isAlready=n=>results.every(r=>r.state.all[i*7+(n===0?6:n-1)]);
    const marker=isAlready(1)?'xyz':isAlready(2)?'xy':isAlready(6)?'x':isAlready(0)?'e':'';
    marks.push(marker);const milestone=[];
    for(let z=0;z<7;z++){
      const lev=levels[z];if(isAlready(lev.n))continue;
      const groups=new Map();
      for(let k=0;k<results.length;k++)for(const atoms of results[k].state.paths[i*7+z]){
        const key=atoms.map(a=>[a.metric,a.i,a.j,a.relation].join(':')).sort().join('|');
        if(!groups.has(key))groups.set(key,{atoms,good:new Set()});
        groups.get(key).good.add(k);
      }
      const patterns=[];
      for(const {atoms,good} of groups.values()){
        const conditions=atoms.map(a=>ScenarioFinal.formatCondition(results.values().next().value.state.data,a));
        for(const pattern of minimizeCover(good))patterns.push({pattern,conditions});
      }
      // A stronger milestone's identical condition renders a weaker duplicate
      // unnecessary, but alternative stronger requirements remain visible.
      const dedup=new Set(),minimal=patterns.filter(x=>{const key=x.pattern.join(',')+'|'+x.conditions.slice().sort().join(';');if(dedup.has(key))return false;dedup.add(key);return true});
      if(minimal.length)milestone.push({n:lev.n,label:lev.label,patterns:minimal});
    }
    const higher=new Set();
    for(const lev of milestone){lev.patterns=lev.patterns.filter(x=>!higher.has(x.pattern.join(',')+'|'+x.conditions.slice().sort().join(';')));
      for(const x of lev.patterns)higher.add(x.pattern.join(',')+'|'+x.conditions.slice().sort().join(';'));
    }
    scenarios.push({owner:owners[i],levels:milestone.filter(x=>x.patterns.length)});
  }
  return {owners,marks,week:14,games:next.map(g=>({a:owners[g.a],b:owners[g.b],key:g.key})),scenarios};
}
