(function(){
  const AI_DELAY = 3000;
  const suits = ["♠","♥","♦","♣"];
  const suitNames = ["spades","hearts","diamonds","clubs"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const rankVal = r => (r==="A"?1:r==="J"?11:r==="Q"?12:r==="K"?13:parseInt(r,10));
  const faceRanks = new Set(["J","Q","K"]);
  const isRed = s => (s==="♥" || s==="♦");
  const players = ["N","E","S","W"];
  const teamOf = p => (p==="N"||p==="S")?"NS":"EW";
  const areaId = {N:"handN",E:"handE",S:"handS",W:"handW"};
  const capId  = {N:"capN",E:"capE",S:"capS",W:"capW"};

  let G=null;
  const el=id=>document.getElementById(id);
  const tplCard=document.getElementById("tplCard");
  const tplBuild=document.getElementById("tplBuild");
  const $table=el("tableArea");
  const $log=el("log");

  // WebAudio sounds
  let ac=null; function ensureAudio(){ if(!el("soundOn").checked) return null; try{ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} return ac;}
  function beep(type="play"){ const ctx=ensureAudio(); if(!ctx) return;
    const o=ctx.createOscillator(), g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); const t=ctx.currentTime;
    if(type==="capture"){ o.type="triangle"; o.frequency.setValueAtTime(440,t); o.frequency.exponentialRampToValueAtTime(660,t+0.08); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18); }
    else if(type==="build"){ o.type="sine"; o.frequency.setValueAtTime(300,t); g.gain.setValueAtTime(0.08,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18); }
    else if(type==="lock"){ o.type="square"; o.frequency.setValueAtTime(220,t); g.gain.setValueAtTime(0.1,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22); }
    else if(type==="sweep"){ o.type="sawtooth"; o.frequency.setValueAtTime(420,t); o.frequency.exponentialRampToValueAtTime(1000,t+0.22); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.28); }
    else if(type==="trail"){ o.type="sine"; o.frequency.setValueAtTime(260,t); g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12); }
    else { o.type="sine"; o.frequency.setValueAtTime(520,t); g.gain.setValueAtTime(0.05,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.1); }
    o.start(t); o.stop(t+0.3);
  }

  function log(msg){ const d=document.createElement("div"); d.textContent=msg; $log.prepend(d); }

  function newDeck(){ const deck=[]; for(let s=0;s<4;s++){ for(let r=0;r<13;r++){ deck.push({s:suits[s],suitName:suitNames[s],r:ranks[r],v:rankVal(ranks[r])}); } } for(let i=deck.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; } return deck; }
  function flopHasSum10(cards){ const vals=cards.map(c=>(c.v<=10?c.v:0)).filter(v=>v>0); const n=vals.length; function dfs(i,sum,count){ if(sum===10&&count>=2) return true; if(i>=n||sum>10) return false; if(dfs(i+1,sum+vals[i],count+1)) return true; return dfs(i+1,sum,count);} return dfs(0,0,0); }

  function dealRound(){
    const deck=newDeck(); const table=[];
    while(table.length<4){ const c=deck.shift(); if(c.v===1||c.v===2||c.v===10){ deck.splice(Math.floor(Math.random()*(deck.length+1)),0,c); continue;} table.push(c); }
    while(flopHasSum10(table)){ const idx=table.findIndex(c=>c.v<=10&&c.v!==10&&c.v!==2&&c.v!==1); if(idx===-1) break; const removed=table.splice(idx,1)[0]; deck.splice(Math.floor(Math.random()*(deck.length+1)),0,removed); let c; do{ c=deck.shift(); if(c.v===1||c.v===2||c.v===10){ deck.splice(Math.floor(Math.random()*(deck.length+1)),0,c); c=null;} }while(!c); table.push(c); }
    const hands={N:[],E:[],S:[],W:[]}; for(let i=0;i<12;i++){ players.forEach(p=>hands[p].push(deck.shift())); } for(const p of players){ hands[p].sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s)); } return {deck,table,hands};
  }

  function initGame(){
    G={ round:1, scores:{NS:0,EW:0}, roundsHistory:[], skipTurns:{N:0,E:0,S:0,W:0}, mustAct:{N:null,E:null,S:null,W:null}, lastCapture:null, sweeps:{NS:0,EW:0}, captured:{N:[],E:[],S:[],W:[]}, builds:[], turn:"N"};
    startNewRound();
    el("sizeRange").addEventListener("input", e=>{ document.documentElement.style.setProperty("--scale", e.target.value); });
    el("themeSel").addEventListener("change", e=>{ document.body.classList.remove("theme-felt","theme-wood"); document.body.classList.add("theme-"+e.target.value); });
    document.body.addEventListener("pointerdown", ()=>ensureAudio(), {once:true});
  }

  function startNewRound(){
    const d=dealRound();
    G.table=d.table; G.hands=d.hands; G.deck=d.deck; G.captured={N:[],E:[],S:[],W:[]}; G.lastCapture=null; G.builds=[]; G.skipTurns={N:0,E:0,S:0,W:0}; G.mustAct={N:null,E:null,S:null,W:null}; G.sweeps={NS:0,EW:0};
    renderAll(); log(`— Round ${G.round} — Dealt. Table: ${G.table.map(cardTxt).join(" ")}.`); flashTable(); beep("play"); scheduleAITurn();
  }

  function cardTxt(c){ return `${c.r}${c.s}`; }
  function who(p){ return p==="N"?"North":p==="E"?"East":p==="S"?"South":"West"; }
  function nextPlayer(p){ const order=["N","E","S","W"]; return order[(order.indexOf(p)+1)%4]; }
  function anyCardsLeft(){ return players.some(p=>G.hands[p].length>0); }

  function renderAll(){ el("year").textContent=(new Date()).getFullYear(); renderHands(); renderTable(); renderCaptured(); renderScores(); updateSkips(); updateButtons(); updateThinking(); }
  function renderScores(){ el("scoreNS").textContent=G.scores.NS; el("scoreEW").textContent=G.scores.EW; }
  function updateSkips(){ for(const p of players){ const n=G.skipTurns[p]; el({N:"skipN",E:"skipE",S:"skipS",W:"skipW"}[p]).textContent = n>0?`(skip ${n})`:""; } }
  function updateButtons(){ el("newRoundBtn").disabled = true; }
  function updateThinking(){ for(const p of ["N","E","W"]){ const t=el({N:"thinkN",E:"thinkE",W:"thinkW"}[p]); t.textContent = G.turn===p ? "thinking…" : ""; } }

  function renderHands(){ const areas={N:"handN",E:"handE",S:"handS",W:"handW"}; for(const p of players){ const area=el(areas[p]); area.innerHTML=""; const show=(p==="S"); G.hands[p].forEach((c,idx)=>{ const node=tplCard.content.firstElementChild.cloneNode(true); if(show){ fillCard(node,c);} else { node.classList.add("back"); } if(p==="S"){ node.addEventListener("click", ()=>onSelectHandCard(idx)); } else node.classList.add("disabled"); area.appendChild(node); }); } }
  function renderCaptured(){ const areas={N:"capN",E:"capE",S:"capS",W:"capW"}; for(const p of players){ const area=el(areas[p]); area.innerHTML=""; G.captured[p].forEach((_c)=>{ const node=tplCard.content.firstElementChild.cloneNode(true); node.classList.add("back"); node.style.width="calc(var(--card-w) * 0.45)"; node.style.height="calc(var(--card-h) * 0.45)"; node.style.borderRadius="8px"; node.style.boxShadow="none"; node.style.border="1px solid #23314d"; area.appendChild(node); }); } }
  function fillCard(node,c){ const tl=node.querySelector(".corner.tl"), br=node.querySelector(".corner.br"), pip=node.querySelector(".pip"); tl.textContent=`${c.r}\n${c.s}`; br.textContent=`${c.r}\n${c.s}`; pip.textContent=c.s; if(isRed(c.s)) node.classList.add("red"); }
  function renderTable(){ $table.innerHTML=""; const buildsArea=document.createElement("div"); buildsArea.style.display="flex"; buildsArea.style.flexWrap="wrap"; buildsArea.style.gap="12px"; for(const b of G.builds){ const node=tplBuild.content.firstElementChild.cloneNode(true); node.dataset.bid=b.id; node.querySelector(".value").textContent=`Build = ${b.value}`; node.querySelector(".owner").textContent=`Owner: ${b.ownerTeam}`; node.querySelector(".locktag").textContent=b.locked?`Locked by ${who(b.lockedBy)} (value fixed)`: ""; const stack=node.querySelector(".stack"); for(const c of b.cards){ const cn=tplCard.content.firstElementChild.cloneNode(true); fillCard(cn,c); cn.classList.add("disabled"); stack.appendChild(cn); } buildsArea.appendChild(node); } $table.appendChild(buildsArea);
    const looseArea=document.createElement("div"); looseArea.style.display="flex"; looseArea.style.flexWrap="wrap"; looseArea.style.gap="10px"; for(const c of G.table){ const node=tplCard.content.firstElementChild.cloneNode(true); fillCard(node,c); node.classList.add("disabled"); looseArea.appendChild(node); } $table.appendChild(looseArea); el("lastCapture").textContent = G.lastCapture ? G.lastCapture : "–"; }

  function clearGlows(){ $table.querySelectorAll(".card.glow, .build.glow").forEach(n=>n.classList.remove("glow")); }
  function highlightForCombos(combos){ clearGlows(); for(const combo of combos){ for(const it of combo){ if(it.type==="card"){ const nodes=$table.querySelectorAll(".table-cards .card:not(.back)"); for(const node of nodes){ const tl=node.querySelector(".corner.tl").textContent; if(tl.replace("\\n","")===(it.ref.r+it.ref.s)){ node.classList.add("glow"); break; } } }else{ const bn=$table.querySelector(`[data-bid="${it.ref.id}"]`); if(bn) bn.classList.add("glow"); } } } }
  function highlightLockTargets(locks){ clearGlows(); for(const lk of locks){ const bn=$table.querySelector(`[data-bid="${lk.buildId}"]`); if(bn) bn.classList.add("glow"); } }
  function flashTable(){ const t=document.querySelector(".table"); if(!t) return; t.classList.add("flash"); setTimeout(()=>t.classList.remove("flash"),500); }

  function numericTableItems(){ const items=[]; G.builds.forEach(b=>items.push({type:"build", value:b.value, ref:b})); G.table.forEach((c,idx)=>{ if(c.v<=10) items.push({type:"card", value:c.v, ref:c, idx}); }); return items; }
  function captureCombosFor(player, handIdx){ const card=G.hands[player][handIdx]; if(faceRanks.has(card.r)){ const combos=[]; for(const c of G.table){ if(c.r===card.r){ combos.push([{type:"card", value:0, ref:c}]); } } return combos; } else { const target=card.v; const items=numericTableItems(); const res=[]; function dfs(i,sum,picked){ if(sum===target){ res.push(picked.slice()); } if(i>=items.length || sum>target) return; picked.push(items[i]); dfs(i+1,sum+items[i].value,picked); picked.pop(); dfs(i+1,sum,picked);} dfs(0,0,[]); return res; } }
  function countCapturedByCombo(combo){ let n=0; for(const it of combo){ if(it.type==="card") n+=1; else if(it.type==="build") n+=it.ref.cards.length; } return n; }

  function centerOf(elm){ const r=elm.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; }
  function flyCardFromTo(card, fromEl, toEl, dur=600){ if(!fromEl||!toEl) return; const s=centerOf(fromEl), d=centerOf(toEl); const node=tplCard.content.firstElementChild.cloneNode(true); fillCard(node,card); node.classList.add("fly"); node.style.left=s.x+"px"; node.style.top=s.y+"px"; document.body.appendChild(node); requestAnimationFrame(()=>{ node.style.transform=`translate(${d.x-s.x}px, ${d.y-s.y}px) scale(1)`; node.style.opacity="0.2";}); setTimeout(()=>{ node.remove(); }, dur); }

  function performCapture(player, handIdx, combo){
    const handArea=el(areaId[player]); const capArea=el(capId[player]); const card=G.hands[player][handIdx];
    flyCardFromTo(card, handArea, capArea, 650); beep("capture"); G.hands[player].splice(handIdx,1);
    const flyStagger=90; combo.forEach((it,idx)=>{ setTimeout(()=>{ let fromEl=null; if(it.type==="build"){ fromEl=$table.querySelector(`[data-bid="${it.ref.id}"]`);} else { const nodes=$table.querySelectorAll(".table-cards .card:not(.back)"); for(const node of nodes){ const tl=node.querySelector(".corner.tl").textContent; if(tl.replace("\\n","")===(it.ref.r+it.ref.s)){ fromEl=node; break; } } } if(fromEl) flyCardFromTo(it.type==="card"?it.ref:it.ref.cards[0], fromEl, capArea, 600); }, idx*flyStagger); });
    const taken=[]; for(const it of combo){ if(it.type==="card"){ const idx=G.table.indexOf(it.ref); if(idx>=0) taken.push(G.table.splice(idx,1)[0]); } else { const bi=G.builds.findIndex(b=>b===it.ref); if(bi>=0){ const b=G.builds.splice(bi,1)[0]; taken.push(...b.cards);} } }
    taken.push(card); G.captured[player].push(...taken); G.lastCapture=teamOf(player); log(`${who(player)} captures ${taken.map(cardTxt).join(" ")}.`);
    if(G.table.length===0 && G.builds.length===0){ const team=teamOf(player); G.sweeps[team]++; flashTable(); log(`Sweep! +1 to ${team}.`); beep("sweep"); }
    if(G.mustAct[player]){ G.mustAct[player]=null; }
  }
  function trailCard(player, handIdx){ const card=G.hands[player][handIdx]; flyCardFromTo(card, el(areaId[player]), el("tableArea"), 600); beep("trail"); G.hands[player].splice(handIdx,1); G.table.push(card); log(`${who(player)} trails ${cardTxt(card)} to the table.`); }

  function canCreateBuildFrom(player, handIdx){
    const card=G.hands[player][handIdx]; if(faceRanks.has(card.r)) return [];
    const items=[]; G.table.forEach(c=>{ if(c.v<=10) items.push({type:"card", value:c.v, ref:c}); }); G.builds.forEach(b=> items.push({type:"build", value:b.value, ref:b}));
    const opts=[]; const n=items.length;
    function validCandidate(picked, newV){ if(newV<1||newV>10) return false; const locked=picked.filter(it=>it.type==="build"&&it.ref.locked); if(locked.length>0 && locked.some(it=>it.ref.value!==newV)) return false; const builds=picked.filter(it=>it.type==="build"); const uniq=new Set(builds.map(it=>it.ref.value)); if(uniq.size>1) return false; return true; }
    function dfs(i,picked,sum){ if(i===n){ if(picked.length===0) return; const addV=card.v+sum, subV=Math.abs(card.v-sum); const cands=[]; if(validCandidate(picked,addV)) cands.push(addV); if(validCandidate(picked,subV)) cands.push(subV); for(const nv of cands){ const remaining=G.hands[player].filter((_,idx)=>idx!==handIdx); if(remaining.some(cc=>cc.v===nv)){ const pickedBuilds=picked.filter(x=>x.type==="build"); const targetBuildId=pickedBuilds.length===1?pickedBuilds[0].ref.id:null; opts.push({handIdx:handIdx, picked:picked.slice(), newValue:nv, targetBuildId:targetBuildId}); } } return; } picked.push(items[i]); dfs(i+1,picked,sum+items[i].value); picked.pop(); dfs(i+1,picked,sum); }
    dfs(0,[],0);
    const seen=new Set(), out=[]; for(const o of opts){ const key=o.newValue+"|"+(o.targetBuildId||"")+"|"+o.picked.map(x=>x.type==="card"?("C"+cardTxt(x.ref)):("B"+x.ref.id)).sort().join(","); if(!seen.has(key)){ seen.add(key); out.push(o);} } return out;
  }
  function performBuild(player, handIdx, option){
    const card=G.hands[player][handIdx]; const targetEl=option.targetBuildId ? $table.querySelector(`[data-bid="${option.targetBuildId}"]`) : el("tableArea"); flyCardFromTo(card, el(areaId[player]), targetEl, 600); beep("build");
    G.hands[player].splice(handIdx,1);
    const consumed=[]; const buildsPicked=[];
    for(const it of option.picked){ if(it.type==="card"){ const idx=G.table.indexOf(it.ref); if(idx>=0) consumed.push(G.table.splice(idx,1)[0]); } else { const bi=G.builds.findIndex(b=>b===it.ref); if(bi>=0){ const b=G.builds.splice(bi,1)[0]; consumed.push(...b.cards); buildsPicked.push(b);} } }
    let target=null; if(option.targetBuildId){ target=buildsPicked.find(b=>b.id===option.targetBuildId)||{id:option.targetBuildId}; } else { target={id:"B"+Math.random().toString(36).slice(2,8), value:option.newValue, ownerTeam:teamOf(player), cards:[], locked:false, lockedBy:null}; }
    if(buildsPicked.length>0){ const base=buildsPicked[0]; target.value=base.value; target.locked=base.locked; target.lockedBy=base.lockedBy; target.ownerTeam=base.ownerTeam; } else { target.value=option.newValue; target.ownerTeam=teamOf(player); }
    target.cards=[...(target.cards||[]), ...consumed, card]; G.builds.push(target);
    log(`${who(player)} builds to ${target.value}${target.locked? " (locked)":""} (owner ${target.ownerTeam}).`);
    if(G.mustAct[player]){ const req=G.mustAct[player]; if(req && option.targetBuildId===req.buildId && target.value===req.value){ G.mustAct[player]=null; } }
  }
  function lockOptions(player, handIdx){
    const card=G.hands[player][handIdx]; if(faceRanks.has(card.r)) return [];
    const opts=[]; for(const b of G.builds){ if(b.value===card.v && !b.locked){ const remaining=G.hands[player].filter((_,idx)=>idx!==handIdx); if(remaining.some(c=>c.v===card.v)){ opts.push({buildId:b.id, value:b.value}); } } } return opts;
  }
  function performLock(player, handIdx, buildId){
    const card=G.hands[player][handIdx]; const buildEl=document.querySelector(`[data-bid="${buildId}"]`)||el("tableArea"); flyCardFromTo(card, el(areaId[player]), buildEl, 600); beep("lock");
    G.hands[player].splice(handIdx,1); const bi=G.builds.findIndex(b=>b.id===buildId); if(bi<0) return; const b=G.builds[bi]; b.cards.push(card); b.locked=true; b.lockedBy=player; log(`${who(player)} locks build at ${b.value}.`); G.mustAct[player]={buildId:b.id, value:b.value};
  }

  function endTurn(){ G.turn=nextPlayer(G.turn); renderAll(); if(!anyCardsLeft()) endRound(); else scheduleAITurn(); }
  function scheduleAITurn(){ updateThinking(); if(G.turn==="S" || !anyCardsLeft()) return; setTimeout(()=>{ if(G.turn==="S" || !anyCardsLeft()) return; aiPlay(G.turn); renderAll(); if(!anyCardsLeft()) endRound(); else if(G.turn!=="S") scheduleAITurn(); }, AI_DELAY); }

  function aiPlay(p){
    if(G.hands[p].length===0){ G.turn=nextPlayer(p); return; }
    if(G.skipTurns[p]>0){ log(`${who(p)} skips a turn.`); G.skipTurns[p]--; G.turn=nextPlayer(p); return; }
    const must=G.mustAct[p];
    if(must){
      const idx=G.hands[p].findIndex(c=>!faceRanks.has(c.r) && c.v===must.value);
      if(idx>=0){ const combos=captureCombosFor(p,idx).filter(c=> c.some(it=>it.type==="build"&&it.ref.id===must.buildId)); if(combos.length>0){ performCapture(p,idx,combos[0]); G.turn=nextPlayer(p); return; } }
      for(let i=0;i<G.hands[p].length;i++){ const cc=captureCombosFor(p,i); if(cc.length>0){ performCapture(p,i,cc[0]); G.turn=nextPlayer(p); return; } }
      for(let i=0;i<G.hands[p].length;i++){ const opts=canCreateBuildFrom(p,i).filter(o=>o.targetBuildId===must.buildId && o.newValue===must.value); if(opts.length>0){ performBuild(p,i,opts[0]); G.turn=nextPlayer(p); return; } }
      trailCard(p,0); G.turn=nextPlayer(p); return;
    }
    let best=null; for(let i=0;i<G.hands[p].length;i++){ const combos=captureCombosFor(p,i); for(const combo of combos){ const size=countCapturedByCombo(combo)+1; if(!best||size>best.size){ best={handIdx:i,combo,size}; } } }
    if(best){ performCapture(p,best.handIdx,best.combo); G.turn=nextPlayer(p); return; }
    for(let i=0;i<G.hands[p].length;i++){ const locks=lockOptions(p,i); if(locks.length>0){ performLock(p,i,locks[0].buildId); G.turn=nextPlayer(p); return; } }
    let buildBest=null; for(let i=0;i<G.hands[p].length;i++){ const opts=canCreateBuildFrom(p,i); if(opts.length>0){ const cand=opts[0]; const remaining=G.hands[p].filter((_,idx)=>idx!==i); const mult=remaining.filter(cc=>cc.v===cand.newValue).length; const score=(mult>=1?2:1)+cand.picked.length*0.1; if(!buildBest||score>buildBest.score){ buildBest={handIdx:i,opt:cand,score}; } } }
    if(buildBest){ performBuild(p,buildBest.handIdx,buildBest.opt); G.turn=nextPlayer(p); return; }
    trailCard(p,0); G.turn=nextPlayer(p);
  }

  function endRound(){
    const leftovers=[...G.table]; G.builds.forEach(b=>leftovers.push(...b.cards));
    if(leftovers.length>0 && G.lastCapture){ const team=G.lastCapture; const side= team==="NS" ? (G.captured.N.length<=G.captured.S.length?"N":"S") : (G.captured.E.length<=G.captured.W.length?"E":"W"); G.captured[side].push(...leftovers); log(`Last capture (${team}) takes remaining ${leftovers.length} cards.`); }
    G.table=[]; G.builds=[];
    const roundScore=scoreRound(); G.scores.NS+=roundScore.NS; G.scores.EW+=roundScore.EW; showRoundSummary(roundScore);
  }
  function scoreRound(){
    const tCards={NS:[],EW:[]}; for(const p of players){ tCards[teamOf(p)].push(...G.captured[p]); }
    const pts={NS:0,EW:0}, detail={NS:[],EW:[]}; const add=(t,n,desc)=>{ pts[t]+=n; detail[t].push(`${n>0?"+":""}${n} ${desc}`); };
    for(const t of ["NS","EW"]){ const aces=tCards[t].filter(c=>c.v===1).length; add(t,aces,"Aces"); }
    for(const t of ["NS","EW"]){ if(tCards[t].some(c=>c.r==="10"&&c.s==="♦")) add(t,1,"10♦"); }
    for(const t of ["NS","EW"]){ if(tCards[t].some(c=>c.r==="2"&&c.s==="♠")) add(t,2,"2♠"); }
    const spNS=tCards.NS.filter(c=>c.s==="♠").length, spEW=tCards.EW.filter(c=>c.s==="♠").length;
    if(spNS>spEW) add("NS",1,"Most Spades"); else if(spEW>spNS) add("EW",1,"Most Spades");
    const cNS=tCards.NS.length, cEW=tCards.EW.length;
    if(!(cNS===26 && cEW===26)){ if(cNS>cEW) add("NS",3,"Most Cards"); else if(cEW>cNS) add("EW",3,"Most Cards"); }
    for(const t of ["NS","EW"]){ if(tCards[t].length>=35) add(t,1,"Card Bonus (35+)"); if(tCards[t].length>=40) add(t,1,"Double Card Bonus (40+)"); }
    const faces=new Set(["J","Q","K"]);
    for(const t of ["NS","EW"]){ if(tCards[t].filter(c=>faces.has(c.r)).length===12) add(t,1,"Face Card Bonus (all JQK)"); }
    for(const t of ["NS","EW"]){ if(G.sweeps[t]>0) add(t,G.sweeps[t],"Sweeps"); }
    return {NS:pts.NS, EW:pts.EW, _detail:{NS:detail.NS, EW:detail.EW}, _cards:{NS:tCards.NS, EW:tCards.EW}};
  }
  function showRoundSummary(s){
    const box=el("roundSummary"), content=el("summaryContent"); box.classList.remove("hidden"); content.innerHTML="";
    function col(team){
      const c=document.createElement("div");
      c.innerHTML=`<h3>${team==="NS"?"North + South":"East + West"}</h3>`;
      const sc=document.createElement("div"); sc.className="kv"; sc.innerHTML=`<div>Round Points</div><div><strong>${s[team]}</strong></div>`; c.appendChild(sc);
      const list=document.createElement("div"); list.style.fontSize="13px"; list.style.color="#b8c3d7";
      for(const ln of s._detail[team]){ const d=document.createElement("div"); d.textContent="• "+ln; list.appendChild(d); }
      const grid=document.createElement("div"); grid.style.display="flex"; grid.style.flexWrap="wrap"; grid.style.gap="4px"; grid.style.marginTop="6px";
      for(const card of s._cards[team]){ const n=tplCard.content.firstElementChild.cloneNode(true); fillCard(n,card); n.style.width="calc(var(--card-w)*0.5)"; n.style.height="calc(var(--card-h)*0.5)"; n.style.borderRadius="8px"; n.style.boxShadow="none"; grid.appendChild(n); }
      c.appendChild(grid); return c;
    }
    content.appendChild(col("NS")); content.appendChild(col("EW"));
    el("continueBtn").onclick=()=>{ box.classList.add("hidden"); el("newRoundBtn").disabled=false; };
  }

  // Human UI
  let selectedHandIdx=null;
  function onSelectHandCard(idx){ if(G.turn!=="S") return; if(G.skipTurns.S>0){ log(`You must skip ${G.skipTurns.S} turn(s).`); return; } selectedHandIdx=idx; renderSelectionOptions(); }
  function addBtn(area, cls, label, title, fn){ const b=document.createElement("button"); b.className="action "+(cls||""); b.textContent=label; if(title) b.title=title; b.onclick=fn; area.appendChild(b); }
  function renderSelectionOptions(){
    const area=el("actions"); area.innerHTML=""; if(selectedHandIdx==null) return;
    const must=G.mustAct.S; const combos=captureCombosFor("S",selectedHandIdx); const buildOpts=canCreateBuildFrom("S",selectedHandIdx); const locks=lockOptions("S",selectedHandIdx);
    if(must){ log(`You locked a build at ${must.value}. This turn you must: take the build, capture something from table, or add more of that value to the build.`); }
    if(combos.length>0) highlightForCombos(combos); else if(locks.length>0) highlightLockTargets(locks); else clearGlows();
    if(combos.length>0){ combos.slice(0,6).forEach((combo,i)=>{ const title=combo.map(it=>it.type==="card"?cardTxt(it.ref):`Build(${it.ref.value})`).join(" + "); addBtn(area,"primary",`Capture #${i+1}`,title,()=>{ clearGlows(); performCapture("S",selectedHandIdx,combo); selectedHandIdx=null; endTurn(); }); }); }
    const filteredBuilds = must ? buildOpts.filter(o=>o.targetBuildId===must.buildId && o.newValue===must.value) : buildOpts;
    if(filteredBuilds.length>0){ filteredBuilds.slice(0,6).forEach((opt,i)=>{ const title=opt.picked.map(it=>it.type==="card"?cardTxt(it.ref):`Build(${it.ref.value})`).join(" + "); addBtn(area,"",`Build → ${opt.newValue}`,title,()=>{ clearGlows(); performBuild("S",selectedHandIdx,opt); selectedHandIdx=null; endTurn(); }); }); }
    if(!must && locks.length>0){ locks.slice(0,4).forEach((lk,i)=>{ addBtn(area,"",`Lock build = ${lk.value}`,`Lock build ${lk.value}`,()=>{ clearGlows(); performLock("S",selectedHandIdx,lk.buildId); selectedHandIdx=null; endTurn(); }); }); }
    if(!must){ addBtn(area,"warn","Attempt 2‑card Sweep","",()=>{ clearGlows(); const res=tryTwoCardSweep("S",selectedHandIdx); if(res){ doTwoCardSweep("S",selectedHandIdx,res.secondIdx); } else { log("No legal 2‑card sweep found with this first card."); } selectedHandIdx=null; endTurn(); }); }
    if(!must){ addBtn(area,"","Trail","",()=>{ clearGlows(); trailCard("S",selectedHandIdx); selectedHandIdx=null; endTurn(); }); }
    if(el("autoHints").checked){ const hint=bestActionHint("S"); if(hint){ log("Hint: "+hint); } }
  }

  function tryTwoCardSweep(p, firstIdx){ if(G.hands[p].length<2) return null; const combos1=captureCombosFor(p,firstIdx); for(const combo of combos1){ return {secondIdx:(firstIdx===0?1:0)}; } return null; }
  function doTwoCardSweep(p,i1,i2){ const combos1=captureCombosFor(p,i1); if(combos1.length===0){ trailCard(p,i1); return; } combos1.sort((a,b)=>countCapturedByCombo(b)-countCapturedByCombo(a)); performCapture(p,i1,combos1[0]); const secondIdx=i2-(i2>i1?1:0); const combos2=captureCombosFor(p,secondIdx); combos2.sort((a,b)=>countCapturedByCombo(b)-countCapturedByCombo(a)); if(combos2.length>0){ performCapture(p,secondIdx,combos2[0]); G.skipTurns[p]+=1; log(`${who(p)} must skip ${1} next turn for multi‑card sweep.`); } }

  function bestActionHint(p){ if(G.mustAct[p]) return `You must resolve your locked build (${G.mustAct[p].value}).`; for(let i=0;i<G.hands[p].length;i++){ if(captureCombosFor(p,i).length>0) return "You can capture with "+cardTxt(G.hands[p][i]); } for(let i=0;i<G.hands[p].length;i++){ const opts=canCreateBuildFrom(p,i); if(opts.length>0) return `You can build to ${opts[0].newValue} using ${cardTxt(G.hands[p][i])}`; } return "No capture/build — consider trailing a low card."; }

  el("newRoundBtn").addEventListener("click", ()=>{ el("roundSummary").classList.add("hidden"); G.round+=1; startNewRound(); });
  el("rulesBtn").addEventListener("click", ()=>{ window.open("rules.html","_blank"); });

  initGame();
})();