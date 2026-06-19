import React, { useState, useEffect, useCallback, useRef } from "react";



// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#F7F5F0", surface:"#FFFFFF", border:"#E8E4DC",
  text:"#1A1A1A", muted:"#8A8580",
  done:"#3D9E6E", partial:"#E8A838", missed:"#E05C5C", empty:"#D9D5CD",
};
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function isFuture(ds){return ds>todayStr();}
function dim(y,m){return new Date(y,m+1,0).getDate();}
function fdm(y,m){return new Date(y,m,1).getDay();}
function getLogs(logs,mid,aid){return (logs[mid]&&logs[mid][aid])||{};}

function streakCount(al){
  let c=0,d=new Date(todayStr());
  while(true){const k=d.toISOString().slice(0,10);const l=al[k];if(!l||l.status==="skipped")break;c++;d.setDate(d.getDate()-1);}
  return c;
}
function consPct(al,y,m){
  const today=todayStr();let done=0,app=0;
  for(let d=1;d<=dim(y,m);d++){
    const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(k>today)continue;app++;const l=al[k];if(l&&l.status!=="skipped")done++;
  }
  return app===0?0:Math.round((done/app)*100);
}
function dayStatus(member,logs,ds){
  const acts=member.activities||[];if(!acts.length)return"empty";
  // Only consider activities that were actually logged (done or skipped)
  const loggedActs=acts.map(a=>{
    const l=getLogs(logs,member.id,a.id)[ds];
    return l?{status:l.status,value:l.value,target:a.target}:null;
  }).filter(Boolean);
  if(loggedActs.length===0)return"empty";
  // Only look at done entries (ignore skips entirely for colour)
  const doneActs=loggedActs.filter(l=>l.status!=="skipped");
  if(doneActs.length===0)return"skipped"; // everything logged was explicitly skipped
  // Green if all done entries are at/above target, amber if any are below
  const allAtTarget=doneActs.every(l=>l.value>=l.target);
  return allAtTarget?"full":"partial";
}

// ── Badge Engine ──────────────────────────────────────────────────────────────
const BADGES=[
  {id:"streak_3",  e:"🌱",label:"Seedling",        desc:"3-day streak",                    tier:"bronze",check:s=>s.streak>=3},
  {id:"streak_7",  e:"🔥",label:"On Fire",          desc:"7-day streak",                    tier:"silver",check:s=>s.streak>=7},
  {id:"streak_14", e:"⚡",label:"Electric",         desc:"14-day streak",                   tier:"silver",check:s=>s.streak>=14},
  {id:"streak_21", e:"🌊",label:"In the Flow",      desc:"21-day streak",                   tier:"gold",  check:s=>s.streak>=21},
  {id:"streak_30", e:"🏆",label:"Unstoppable",      desc:"30-day streak",                   tier:"gold",  check:s=>s.streak>=30},
  {id:"streak_60", e:"🦁",label:"Lion Heart",       desc:"60-day streak",                   tier:"gold",  check:s=>s.streak>=60},
  {id:"streak_90", e:"🌋",label:"Force of Nature",  desc:"90-day streak",                   tier:"gold",  check:s=>s.streak>=90},
  {id:"days_1",    e:"👣",label:"First Step",       desc:"Logged your first day",           tier:"bronze",check:s=>s.totalDone>=1},
  {id:"days_7",    e:"🎯",label:"Week One",         desc:"7 days logged",                   tier:"bronze",check:s=>s.totalDone>=7},
  {id:"days_14",   e:"💪",label:"Two Weeks In",     desc:"14 days logged",                  tier:"bronze",check:s=>s.totalDone>=14},
  {id:"days_30",   e:"🥉",label:"Month Strong",     desc:"30 days logged",                  tier:"silver",check:s=>s.totalDone>=30},
  {id:"days_60",   e:"🥈",label:"Two Months",       desc:"60 days logged",                  tier:"silver",check:s=>s.totalDone>=60},
  {id:"days_100",  e:"🥇",label:"Century",          desc:"100 days logged",                 tier:"gold",  check:s=>s.totalDone>=100},
  {id:"days_200",  e:"🚀",label:"Launch Pad",       desc:"200 days logged",                 tier:"gold",  check:s=>s.totalDone>=200},
  {id:"days_365",  e:"🌍",label:"Around the Sun",   desc:"365 days logged",                 tier:"gold",  check:s=>s.totalDone>=365},
  {id:"perf_3",    e:"✨",label:"Spark",            desc:"3 days at/above target in a row", tier:"bronze",check:s=>s.bestPerf>=3},
  {id:"perf_7",    e:"⭐",label:"Perfect Week",     desc:"7 days at/above target in a row", tier:"silver",check:s=>s.bestPerf>=7},
  {id:"perf_14",   e:"🌟",label:"Perfect Fortnight",desc:"14 days at/above target in a row",tier:"gold",  check:s=>s.bestPerf>=14},
  {id:"perf_30",   e:"💫",label:"Perfect Month",    desc:"30 days at/above target in a row",tier:"gold",  check:s=>s.bestPerf>=30},
  {id:"cons_50",   e:"🌤️",label:"Getting There",  desc:"50%+ consistency in a month",     tier:"bronze",check:s=>s.bestMonPct>=50},
  {id:"cons_80",   e:"📈",label:"On Track",         desc:"80%+ consistency in a month",     tier:"silver",check:s=>s.bestMonPct>=80},
  {id:"cons_100",  e:"💎",label:"Flawless Month",   desc:"100% consistency in a month",     tier:"gold",  check:s=>s.bestMonPct>=100},
  {id:"cons_3mo",  e:"🏅",label:"Hat Trick",        desc:"3 months with 80%+ consistency",  tier:"gold",  check:s=>s.highMons>=3},
  {id:"cons_6mo",  e:"🎖️",label:"Half Year Hero",  desc:"6 months with 80%+ consistency",  tier:"gold",  check:s=>s.highMons>=6},
  {id:"pb_first",  e:"🎉",label:"New Record",       desc:"Beat your initial target",        tier:"bronze",check:s=>s.hasPB},
  {id:"pb_110",    e:"📊",label:"110%",             desc:"Hit 110% of target",              tier:"silver",check:s=>s.bestPct>=110},
  {id:"pb_150",    e:"🚀",label:"150% Club",        desc:"Hit 150% of target",              tier:"gold",  check:s=>s.bestPct>=150},
  {id:"pb_200",    e:"🌠",label:"Double Down",      desc:"Hit 200% of target",              tier:"gold",  check:s=>s.bestPct>=200},
  {id:"week_5",    e:"🗓️",label:"5-Day Week",      desc:"5 days logged in a week",         tier:"bronze",check:s=>s.bestWeek>=5},
  {id:"week_7",    e:"🗃️",label:"Full Week",       desc:"All 7 days in a week",            tier:"silver",check:s=>s.bestWeek>=7},
  {id:"week_4x",   e:"📆",label:"4-Week Run",       desc:"5+ days for 4 weeks straight",    tier:"gold",  check:s=>s.consec5w>=4},
  {id:"comeback",  e:"🦅",label:"Comeback King",    desc:"3+ days after a 7+ day gap",      tier:"silver",check:s=>s.comeback},
  {id:"monday",    e:"☀️",label:"Monday Warrior",   desc:"Every Monday logged in a month",  tier:"silver",check:s=>s.perfMon},
  {id:"weekend",   e:"🏖️",label:"Weekend Warrior",  desc:"Both Sat & Sun for 4 weekends",   tier:"silver",check:s=>s.perfWknd>=4},
  {id:"no_excuses",e:"🌅",label:"No Excuses",       desc:"Every Sunday logged in a month",  tier:"silver",check:s=>s.perfSun},
  {id:"month_1",   e:"🎂",label:"One Month Club",   desc:"Tracking for 1 month",            tier:"bronze",check:s=>s.trackDays>=30},
  {id:"month_3",   e:"🏋️",label:"Quarter Strong",  desc:"Tracking for 3 months",           tier:"silver",check:s=>s.trackDays>=90},
  {id:"month_6",   e:"🌿",label:"Half Year",        desc:"Tracking for 6 months",           tier:"gold",  check:s=>s.trackDays>=180},
  {id:"month_12",  e:"🌳",label:"One Full Year",    desc:"Tracking for 12 months",          tier:"gold",  check:s=>s.trackDays>=365},
  {id:"over7",     e:"🦸",label:"Overachiever",     desc:"20%+ above target 7 days in a row",tier:"silver",check:s=>s.overStreak>=7},
  {id:"steady7",   e:"🎻",label:"Steady Eddie",     desc:"Within 10% of target 7 days",    tier:"silver",check:s=>s.steadyStreak>=7},
  {id:"steady14",  e:"🎯",label:"Dead Accurate",    desc:"Within 10% of target 14 days",   tier:"gold",  check:s=>s.steadyStreak>=14},
  {id:"fam_day",   e:"🤝",label:"Family Day",       desc:"All members logged same day",     tier:"bronze",check:s=>s.famDays>=1},
  {id:"fam_10",    e:"👨‍👩‍👦",label:"Family Strong", desc:"10 days all members logged",      tier:"silver",check:s=>s.famDays>=10},
  {id:"fam_week",  e:"🏡",label:"Family Week",      desc:"All members 5+ days in a week",   tier:"silver",check:s=>s.famWeeks>=1},
  {id:"fam_trio",  e:"🌈",label:"The Trio",         desc:"All members have 7+ days",        tier:"bronze",check:s=>s.famActive},
];
const FAM_IDS=new Set(["fam_day","fam_10","fam_week","fam_trio"]);
const TC={
  bronze:{bg:"#FDF0E0",bd:"#C97D3A",tx:"#7A4A1E",gl:"#C97D3A33"},
  silver:{bg:"#F0F4F8",bd:"#8A9BB0",tx:"#3A4A5E",gl:"#8A9BB033"},
  gold:  {bg:"#FFFAE0",bd:"#C9A800",tx:"#7A6200",gl:"#C9A80033"},
};

function computeStats(al,target){
  al=al||{};
  const today=todayStr();
  const entries=Object.entries(al).filter(([d])=>d<=today).sort(([a],[b])=>a.localeCompare(b));
  let totalDone=0,bestVal=0,vol=0;
  for(const[,l]of entries)if(l.status!=="skipped"&&l.value>0){totalDone++;vol+=l.value;if(l.value>bestVal)bestVal=l.value;}
  const bestPct=target>0?Math.round((bestVal/target)*100):0;
  let streak=0;const sd=new Date(today);
  while(true){const k=sd.toISOString().slice(0,10);const l=al[k];if(!l||l.status==="skipped")break;streak++;sd.setDate(sd.getDate()-1);}
  let bestPerf=0,cp=0;
  for(const[,l]of entries){if(l.status!=="skipped"&&l.value>=target){cp++;if(cp>bestPerf)bestPerf=cp;}else cp=0;}
  const mons=[...new Set(entries.map(([d])=>d.slice(0,7)))];
  let bestMonPct=0,highMons=0;
  for(const ym of mons){const[y,m]=ym.split("-").map(Number);const p=consPct(al,y,m-1);if(p>bestMonPct)bestMonPct=p;if(p>=80)highMons++;}
  let trackDays=0;
  if(entries.length>0)trackDays=Math.round((new Date(today)-new Date(entries[0][0]))/86400000)+1;
  const wm={};
  for(const[ds,l]of entries){if(l.status==="skipped"||!l.value)continue;const d=new Date(ds+"T00:00:00");const dow=(d.getDay()+6)%7;const mon=new Date(d);mon.setDate(d.getDate()-dow);const wk=mon.toISOString().slice(0,10);wm[wk]=(wm[wk]||0)+1;}
  const wvals=Object.values(wm);const bestWeek=wvals.length?Math.max(...wvals):0;
  const wkeys=Object.keys(wm).sort();let consec5w=0,c5=0;
  for(const wk of wkeys){if(wm[wk]>=5){c5++;if(c5>consec5w)consec5w=c5;}else c5=0;}
  let comeback=false,lastL=null,gap=0,pg=0;
  for(const[ds,l]of entries){if(l.status==="skipped"||!l.value){if(lastL){const g=Math.round((new Date(ds)-new Date(lastL))/86400000);if(g>=7){gap=g;pg=0;}}continue;}if(gap>=7){pg++;if(pg>=3){comeback=true;break;}}lastL=ds;}
  let perfMon=false,perfSun=false;
  for(const ym of mons){
    const[y,m]=ym.split("-").map(Number);const dm=new Date(y,m,0).getDate();
    let am=true,hm=false,as=true,hs=false;
    for(let day=1;day<=dm;day++){
      const dt=new Date(y,m-1,day);const dow=dt.getDay();
      const key=`${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      if(key>today)continue;
      if(dow===1){hm=true;const l=al[key];if(!l||l.status==="skipped")am=false;}
      if(dow===0){hs=true;const l=al[key];if(!l||l.status==="skipped")as=false;}
    }
    if(hm&&am)perfMon=true;if(hs&&as)perfSun=true;
  }
  const wem={};
  for(const[ds,l]of entries){if(l.status==="skipped"||!l.value)continue;const d=new Date(ds+"T00:00:00");const dow=d.getDay();if(dow!==0&&dow!==6)continue;const sat=new Date(d);sat.setDate(d.getDate()-(dow===0?1:0));const wk=sat.toISOString().slice(0,10);if(!wem[wk])wem[wk]=new Set();wem[wk].add(dow);}
  const perfWknd=Object.values(wem).filter(s=>s.size===2).length;
  let overStreak=0,co=0,steadyStreak=0,cs=0;
  for(const[,l]of entries){
    if(l.status!=="skipped"&&l.value>=target*1.2){co++;if(co>overStreak)overStreak=co;}else co=0;
    const ok=l.status!=="skipped"&&l.value>=target*0.9&&l.value<=target*1.1;
    if(ok){cs++;if(cs>steadyStreak)steadyStreak=cs;}else cs=0;
  }
  return{totalDone,bestVal,bestPct,streak,bestPerf,bestMonPct,highMons,hasPB:bestVal>target,
    bestWeek,consec5w,comeback,perfMon,perfSun,perfWknd,trackDays,vol,overStreak,steadyStreak,
    famDays:0,famWeeks:0,famActive:false};
}

function famStats(members,logs){
  if(!members||members.length<2)return{famDays:0,famWeeks:0,famActive:false};
  const today=todayStr();
  const sets=members.map(m=>{
    const s=new Set();
    for(const aid of Object.keys(logs[m.id]||{}))
      for(const[d,l]of Object.entries(logs[m.id][aid]||{}))
        if(d<=today&&l.status!=="skipped"&&l.value>0)s.add(d);
    return s;
  });
  const famDays=[...sets[0]].filter(d=>sets.every(s=>s.has(d))).length;
  const wm={};
  for(const m of members)
    for(const aid of Object.keys(logs[m.id]||{}))
      for(const[ds,l]of Object.entries(logs[m.id][aid]||{})){
        if(ds>today||l.status==="skipped"||!l.value)continue;
        const d=new Date(ds+"T00:00:00");const dow=(d.getDay()+6)%7;const mon=new Date(d);mon.setDate(d.getDate()-dow);
        const wk=mon.toISOString().slice(0,10);
        if(!wm[wk])wm[wk]={};if(!wm[wk][m.id])wm[wk][m.id]=new Set();wm[wk][m.id].add(ds);
      }
  let famWeeks=0;for(const w of Object.values(wm))if(members.every(m=>(w[m.id]?.size||0)>=5))famWeeks++;
  const famActive=members.every(m=>{
    let t=0;for(const aid of Object.keys(logs[m.id]||{}))
      t+=Object.entries(logs[m.id][aid]||{}).filter(([d,l])=>d<=today&&l.status!=="skipped"&&l.value>0).length;
    return t>=7;
  });
  return{famDays,famWeeks,famActive};
}

function earnedBadges(al,target,extra={}){
  const s={...computeStats(al,target),...extra};
  return BADGES.filter(b=>!FAM_IDS.has(b.id)&&b.check(s)).map(b=>b.id);
}
function earnedFamBadges(members,logs){
  const fs=famStats(members,logs);
  return BADGES.filter(b=>FAM_IDS.has(b.id)&&b.check({...fs}));
}

// ── Storage ───────────────────────────────────────────────────────────────────
let _st=null;
const JSONBIN_BIN_ID  = import.meta.env.VITE_JSONBIN_BIN_ID;
const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY;
const JSONBIN_URL     = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

async function loadData(){
  if(JSONBIN_BIN_ID && JSONBIN_API_KEY){
    try{
      const res=await fetch(`${JSONBIN_URL}/latest`,{headers:{'X-Master-Key':JSONBIN_API_KEY,'X-Bin-Meta':'false'}});
      if(res.ok){const d=await res.json();try{localStorage.setItem("ff3",JSON.stringify(d));}catch{}return d;}
    }catch{}
  }
  try{const r=localStorage.getItem("ff3");if(r)return JSON.parse(r);}catch{}
  return null;
}
async function saveData(p){
  const s=JSON.stringify(p);
  try{localStorage.setItem("ff3",s);}catch{}
  if(JSONBIN_BIN_ID && JSONBIN_API_KEY){
    try{await fetch(JSONBIN_URL,{method:'PUT',headers:{'Content-Type':'application/json','X-Master-Key':JSONBIN_API_KEY},body:s});}catch{}
  }
}
function scheduleSave(p){clearTimeout(_st);_st=setTimeout(()=>saveData(p),600);}

// ── Default data ──────────────────────────────────────────────────────────────
const DEF_MEMBERS=[
  {id:"son", name:"Son", emoji:"🧗",color:"#5B8FD4",activities:[{id:"dh",name:"Dead Hang",unit:"sec",target:75}]},
  {id:"wife",name:"Wife",emoji:"🚶‍♀️",color:"#D47B9E",activities:[{id:"walk",name:"Walking",unit:"km",target:3}]},
];

// ── UI Components ─────────────────────────────────────────────────────────────
function Bar({pct}){
  return <div style={{width:"100%",background:C.border,borderRadius:99,height:7,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${pct}%`,background:pct>=80?C.done:pct>=50?C.partial:C.missed,borderRadius:99,transition:"width 0.5s"}}/>
  </div>;
}

function Toast({badge,onDismiss}){
  const tc=TC[badge.tier];
  useEffect(()=>{const t=setTimeout(onDismiss,4000);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:300,
    background:tc.bg,border:`2px solid ${tc.bd}`,borderRadius:16,padding:"14px 22px",
    boxShadow:`0 8px 40px ${tc.gl}`,display:"flex",alignItems:"center",gap:14,minWidth:280,maxWidth:400,
    animation:"slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)"}}>
    <span style={{fontSize:36}}>{badge.e}</span>
    <div style={{flex:1}}>
      <div style={{fontSize:11,fontWeight:700,color:tc.tx,letterSpacing:1,textTransform:"uppercase",opacity:0.7}}>{badge.tier} badge!</div>
      <div style={{fontSize:16,fontWeight:800,color:tc.tx}}>{badge.label}</div>
      <div style={{fontSize:12,color:tc.tx,opacity:0.7}}>{badge.desc}</div>
    </div>
    <button onClick={onDismiss} style={{background:"none",border:"none",fontSize:18,color:tc.tx,opacity:0.5}}>×</button>
  </div>;
}

// ── Multi-activity Log Modal (Option A) ───────────────────────────────────────
function LogModal({dateStr,member,logs,onSaveAll,onClose}){
  const displayDate=new Date(dateStr+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
  const init=member.activities.map(a=>{
    const ex=getLogs(logs,member.id,a.id)[dateStr];
    return{actId:a.id,status:ex?.status??"done",value:ex?.value??a.target};
  });
  const[entries,setEntries]=useState(init);
  const upd=(id,f,v)=>setEntries(p=>p.map(e=>e.actId===id?{...e,[f]:v}:e));

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:18,padding:24,width:"100%",maxWidth:360,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:26}}>{member.emoji}</span>
        <div><div style={{fontWeight:700,fontSize:16}}>{member.name}</div><div style={{fontSize:12,color:C.muted}}>{displayDate}</div></div>
      </div>
      {member.activities.map((act,i)=>{
        const en=entries.find(e=>e.actId===act.id);
        if(!en)return null;
        return <div key={act.id}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{act.name}</div>
              <div style={{fontSize:11,color:C.muted}}>Target: {act.target} {act.unit}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>upd(act.id,"status","done")} style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${en.status==="done"?member.color:C.border}`,background:en.status==="done"?member.color:"transparent",color:en.status==="done"?"#fff":C.muted,fontWeight:600,fontSize:12}}>✓ Done</button>
              <button onClick={()=>upd(act.id,"status","skipped")} style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${en.status==="skipped"?C.missed:C.border}`,background:en.status==="skipped"?C.missed:"transparent",color:en.status==="skipped"?"#fff":C.muted,fontWeight:600,fontSize:12}}>✗ Skip</button>
            </div>
          </div>
          {en.status==="done"&&<div style={{display:"flex",alignItems:"center",gap:10,background:member.color+"0D",borderRadius:10,padding:"10px 12px",marginBottom:4}}>
            <input type="number" min={0} step={act.unit==="sec"||act.unit==="reps"?1:0.1}
              value={en.value} onChange={e=>upd(act.id,"value",parseFloat(e.target.value)||0)}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:20,fontWeight:700,outline:"none",background:"#fff"}}/>
            <span style={{fontSize:13,color:C.muted,fontWeight:600}}>{act.unit}</span>
          </div>}
          {i<member.activities.length-1&&<div style={{height:1,background:C.border,margin:"12px 0"}}/>}
        </div>;
      })}
      <div style={{display:"flex",gap:8,marginTop:20}}>
        <button onClick={()=>setEntries(p=>p.map(e=>({...e,status:"skipped"})))} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",fontWeight:600,color:C.muted,fontSize:13}}>Skip all</button>
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",fontWeight:600,color:C.muted}}>Cancel</button>
        <button onClick={()=>onSaveAll(entries)} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",background:member.color,color:"#fff",fontWeight:700,fontSize:14}}>Save all</button>
      </div>
    </div>
  </div>;
}

// ── Calendar cell with dots (Option D) ────────────────────────────────────────
function CalCell({dateStr,member,logs,isToday,onClick}){
  const future=isFuture(dateStr);
  const acts=member.activities||[];
  const status=future?"future":dayStatus(member,logs,dateStr);
  const bgMap={future:"transparent",empty:C.empty,skipped:C.missed,partial:C.partial,full:C.done};
  const bg=bgMap[status]||C.empty;
  return <div onClick={()=>!future&&onClick(dateStr)} style={{
    background:bg,border:isToday?`2px solid ${member.color}`:`1px solid ${C.border}`,
    borderRadius:7,minHeight:46,padding:"3px 2px",cursor:future?"default":"pointer",
    opacity:future?0.3:1,display:"flex",alignItems:"center",justifyContent:"center",
    transition:"transform 0.1s",
  }}
  onMouseEnter={e=>{if(!future)e.currentTarget.style.transform="scale(1.07)";}}
  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
    <span style={{fontSize:10,color:status==="empty"||future?C.muted:"#fff",fontWeight:600}}>
      {new Date(dateStr+"T00:00:00").getDate()}
    </span>
  </div>;
}

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({member,logs,allMembers,onLogAll,onEdit,onNewBadge,year,month}){
  const today=todayStr();
  const[showCal,setShowCal]=useState(true);
  const[showBadges,setShowBadges]=useState(false);
  const[modal,setModal]=useState(null);

  const acts=member.activities||[];
  const pcts=acts.map(a=>consPct(getLogs(logs,member.id,a.id),year,month));
  const avgPct=pcts.length?Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length):0;
  const streaks=acts.map(a=>streakCount(getLogs(logs,member.id,a.id)));
  const bestStreak=streaks.length?Math.max(...streaks):0;

  const todayStats=acts.map(a=>{const l=getLogs(logs,member.id,a.id)[today];return{act:a,log:l};});
  const loggedCount=todayStats.filter(x=>x.log&&x.log.status!=="skipped").length;
  const doneToday=todayStats.filter(x=>x.log&&x.log.status!=="skipped");

  const fs=famStats(allMembers,logs);
  const allEarned=new Set(acts.flatMap(a=>earnedBadges(getLogs(logs,member.id,a.id),a.target,fs)));
  const personalBadges=BADGES.filter(b=>!FAM_IDS.has(b.id));

  const dCount=dim(year,month);const firstDay=fdm(year,month);
  const calDays=[];
  for(let i=0;i<firstDay;i++)calDays.push(null);
  for(let d=1;d<=dCount;d++)calDays.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  return <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",animation:"fadeIn 0.3s ease"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:28}}>{member.emoji}</span>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>{member.name}</div>
          <div style={{fontSize:11,color:C.muted}}>{acts.map(a=>a.name).join(" · ")}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {bestStreak>0&&<div style={{display:"flex",alignItems:"center",gap:4,background:member.color+"18",border:`1px solid ${member.color}44`,borderRadius:99,padding:"3px 10px"}}>
          <span>🔥</span><span style={{fontSize:12,fontWeight:700,color:member.color}}>{bestStreak}d</span>
        </div>}
        <button onClick={()=>onEdit(member)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.muted}}>✏️ Edit</button>
      </div>
    </div>

    {/* Consistency */}
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:C.muted}}>Month consistency</span>
        <span style={{fontSize:11,fontWeight:700,color:avgPct>=80?C.done:avgPct>=50?C.partial:C.missed}}>{avgPct}%</span>
      </div>
      <Bar pct={avgPct}/>
    </div>

    {/* Today panel */}
    <div style={{background:member.color+"0E",border:`1px solid ${member.color}28`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,color:C.muted,marginBottom:3}}>Today</div>
        {loggedCount===0
          ?<span style={{fontSize:13,color:C.muted}}>Not logged yet</span>
          :<div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px"}}>
            {todayStats.filter(({log})=>log&&log.status!=="skipped").map(({act,log})=><span key={act.id} style={{fontSize:12,fontWeight:700,
              color:log.value>=act.target?C.done:C.partial}}>
              {act.name}: {log.value}{act.unit}
            </span>)}
          </div>}
      </div>
      <button onClick={()=>setModal(today)} style={{background:member.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>
        {loggedCount>0?"Edit":"Log today"}
      </button>
    </div>

    {/* Calendar toggle */}
    <button onClick={()=>setShowCal(s=>!s)} style={{background:"none",border:"none",fontSize:11,color:member.color,fontWeight:600,padding:0,marginBottom:8}}>
      {showCal?"▾ Hide calendar":"▸ Show calendar"}
    </button>
    {showCal&&<div style={{marginBottom:8}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:C.muted,fontWeight:600}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {calDays.map((ds,i)=>ds===null?<div key={`e${i}`}/>:
          <CalCell key={ds} dateStr={ds} member={member} logs={logs} isToday={ds===today} onClick={d=>setModal(d)}/>)}
      </div>

    </div>}

    {/* Badges */}
    <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:12}}>
      <button onClick={()=>setShowBadges(s=>!s)} style={{background:"none",border:"none",fontSize:11,color:member.color,fontWeight:600,padding:0}}>
        {showBadges?`▾ Hide badges`:`▸ Badges (${allEarned.size}/${personalBadges.length})`}
      </button>
      {showBadges&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
        {personalBadges.map(b=>{
          const earned=allEarned.has(b.id);const tc=TC[b.tier];
          return <div key={b.id} title={b.desc} style={{display:"flex",alignItems:"center",gap:5,
            background:earned?tc.bg:C.bg,border:`1.5px solid ${earned?tc.bd:C.border}`,
            borderRadius:9,padding:"5px 9px",opacity:earned?1:0.35,filter:earned?"none":"grayscale(1)",transition:"all 0.2s"}}
            onMouseEnter={e=>{if(earned)e.currentTarget.style.transform="scale(1.05)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
            <span style={{fontSize:16}}>{b.e}</span>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:earned?tc.tx:C.muted}}>{b.label}</div>
              <div style={{fontSize:9,color:C.muted}}>{b.desc}</div>
            </div>
          </div>;
        })}
      </div>}
    </div>

    {modal&&<LogModal dateStr={modal} member={member} logs={logs}
      onSaveAll={entries=>{
        const prev=new Set(acts.flatMap(a=>earnedBadges(getLogs(logs,member.id,a.id),a.target)));
        onLogAll(member.id,modal,entries);
        setTimeout(()=>{
          const next=acts.flatMap(a=>{
            const en=entries.find(e=>e.actId===a.id);if(!en)return[];
            const nl={...getLogs(logs,member.id,a.id),[modal]:{value:en.value,status:en.status}};
            return earnedBadges(nl,a.target);
          });
          next.filter(id=>!prev.has(id)).forEach(id=>{const b=BADGES.find(x=>x.id===id);if(b)onNewBadge(b);});
        },50);
        setModal(null);
      }}
      onClose={()=>setModal(null)}/>}
  </div>;
}

// ── Edit Member Modal ─────────────────────────────────────────────────────────
function EditModal({member,isNew,onSave,onDelete,onClose}){
  const[name,setName]=useState(member?.name??"");
  const[emoji,setEmoji]=useState(member?.emoji??"🏃");
  const[color,setColor]=useState(member?.color??"#5B8FD4");
  const[acts,setActs]=useState(member?.activities??[{id:Date.now().toString(),name:"",unit:"min",target:30}]);
  const eOpts=["🧗","🚶","🏃","🚴","🏋️","🤸","🧘","🏊","⚽","🏓","🎯","💪","🧒","👩","👨"];
  const cOpts=["#5B8FD4","#D47B9E","#3D9E6E","#E8A838","#9B6FD4","#E05C5C","#5BC4C4","#E8873A"];
  const uOpts=["sec","min","km","reps","sets","cal"];
  const addAct=()=>setActs(a=>[...a,{id:Date.now().toString(),name:"",unit:"min",target:30}]);
  const remAct=id=>setActs(a=>a.filter(x=>x.id!==id));
  const updAct=(id,f,v)=>setActs(a=>a.map(x=>x.id===id?{...x,[f]:v}:x));
  const is={width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,color:C.text,boxSizing:"border-box",outline:"none",background:C.bg};
  const ls={fontSize:11,color:C.muted,display:"block",marginBottom:4,fontWeight:600};
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:16,padding:28,width:380,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontWeight:700,fontSize:17,marginBottom:20}}>{isNew?"Add member":`Edit ${member?.name}`}</div>
      <div style={{marginBottom:14}}><label style={ls}>Name</label><input value={name} onChange={e=>setName(e.target.value)} style={is} placeholder="e.g. Abilash"/></div>
      <div style={{marginBottom:14}}>
        <label style={ls}>Icon</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {eOpts.map(e=><button key={e} onClick={()=>setEmoji(e)} style={{fontSize:18,padding:"3px 7px",borderRadius:7,border:`2px solid ${emoji===e?color:C.border}`,background:emoji===e?color+"18":"none"}}>{e}</button>)}
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <label style={ls}>Colour</label>
        <div style={{display:"flex",gap:7}}>
          {cOpts.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?`3px solid ${C.text}`:"3px solid transparent",boxSizing:"border-box"}}/>)}
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <label style={{...ls,marginBottom:0}}>Activities</label>
          <button onClick={addAct} style={{background:color,color:"#fff",border:"none",borderRadius:7,padding:"4px 10px",fontSize:12,fontWeight:700}}>+ Add</button>
        </div>
        {acts.map((a,i)=><div key={a.id} style={{background:C.bg,borderRadius:10,padding:12,marginBottom:8,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Activity {i+1}</span>
            {acts.length>1&&<button onClick={()=>remAct(a.id)} style={{background:"none",border:"none",fontSize:12,color:C.missed,padding:0}}>✕ Remove</button>}
          </div>
          <div style={{marginBottom:8}}><label style={ls}>Name</label><input value={a.name} onChange={e=>updAct(a.id,"name",e.target.value)} style={is} placeholder="e.g. Push-ups"/></div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={ls}>Target</label><input type="number" value={a.target} onChange={e=>updAct(a.id,"target",parseFloat(e.target.value)||0)} style={is}/></div>
            <div style={{flex:1}}><label style={ls}>Unit</label><select value={a.unit} onChange={e=>updAct(a.id,"unit",e.target.value)} style={is}>{uOpts.map(u=><option key={u}>{u}</option>)}</select></div>
          </div>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        {!isNew&&<button onClick={()=>{if(window.confirm("Remove?"))onDelete(member.id);}} style={{padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.missed}`,background:"none",color:C.missed,fontWeight:600}}>Delete</button>}
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",fontWeight:600,color:C.muted}}>Cancel</button>
        <button onClick={()=>onSave({id:member?.id??Date.now().toString(),name,emoji,color,activities:acts})} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",background:color,color:"#fff",fontWeight:700,fontSize:14}}>Save</button>
      </div>
    </div>
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App(){
  const[members,setMembers]=useState(DEF_MEMBERS);
  const[logs,setLogs]=useState({});
  const[loaded,setLoaded]=useState(false);
  const[editM,setEditM]=useState(null);
  const[toasts,setToasts]=useState([]);
  const mRef=useRef(members);const lRef=useRef(logs);
  mRef.current=members;lRef.current=logs;
  const mInit=useRef(false);const lInit=useRef(false);
  const now=new Date();
  const[yr,setYr]=useState(now.getFullYear());
  const[mo,setMo]=useState(now.getMonth());

  useEffect(()=>{
    (async()=>{
      const d=await loadData();
      if(d){
        if(d.members&&d.members.length>0)setMembers(d.members);
        if(d.logs)setLogs(d.logs);
      }
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{if(!loaded)return;if(!mInit.current){mInit.current=true;return;}scheduleSave({members:mRef.current,logs:lRef.current});},[members,loaded]);
  useEffect(()=>{if(!loaded)return;if(!lInit.current){lInit.current=true;return;}scheduleSave({members:mRef.current,logs:lRef.current});},[logs,loaded]);

  const handleLogAll=useCallback((mid,dateStr,entries)=>{
    setLogs(prev=>{
      const next={...prev,[mid]:{...prev[mid]}};
      for(const{actId,value,status}of entries)
        next[mid][actId]={...next[mid]?.[actId],[dateStr]:{value,status}};
      return next;
    });
  },[]);

  const handleSave=useCallback((m)=>{
    setMembers(p=>{const ex=p.find(x=>x.id===m.id);return ex?p.map(x=>x.id===m.id?m:x):[...p,m];});
    setEditM(null);
  },[]);
  const handleDel=useCallback((id)=>{setMembers(p=>p.filter(m=>m.id!==id));setEditM(null);},[]);
  const handleBadge=useCallback((b)=>{setToasts(q=>[...q,{...b,key:Date.now()+Math.random()}]);},[]);

  const prevMo=()=>{if(mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1);};
  const nextMo=()=>{if(mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1);};
  const isCurrent=yr===now.getFullYear()&&mo===now.getMonth();

  if(!loaded)return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.muted,fontSize:16}}>Loading…</div></div>;

  const fb=earnedFamBadges(members,logs);
  const famBadges=BADGES.filter(b=>FAM_IDS.has(b.id));
  const fbIds=new Set(fb.map(b=>b.id));
  const nb={background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",fontSize:16,color:C.text};

  return <div style={{background:C.bg,minHeight:"100vh"}}>
    {/* Header */}
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
      <div>
        <div style={{fontWeight:800,fontSize:20,letterSpacing:-0.5}}>🌿 Family Fitness</div>
        <div style={{fontSize:12,color:C.muted}}>Keep showing up, together.</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={prevMo} style={nb}>‹</button>
        <span style={{fontWeight:700,fontSize:14,minWidth:100,textAlign:"center"}}>{MONTHS[mo]} {yr}</span>
        <button onClick={nextMo} disabled={isCurrent} style={{...nb,opacity:isCurrent?0.3:1}}>›</button>
        <button onClick={()=>setEditM("new")} style={{background:C.done,color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",fontWeight:700,fontSize:13}}>+ Add member</button>
      </div>
    </div>

    {/* Content */}
    <div style={{maxWidth:860,margin:"0 auto",padding:"24px 16px",display:"flex",flexDirection:"column",gap:20}}>
      {members.map(m=><MemberCard key={m.id} member={m} logs={logs} allMembers={members}
        onLogAll={handleLogAll} onEdit={m=>setEditM(m)} onNewBadge={handleBadge} year={yr} month={mo}/>)}

      {members.length===0&&<div style={{textAlign:"center",padding:60,color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🌱</div>
        <div style={{fontSize:16,fontWeight:600}}>No members yet.</div>
      </div>}

      {/* Family summary */}
      {members.length>0&&<div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:20}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:C.muted}}>FAMILY SUMMARY · {MONTHS[mo].toUpperCase()}</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          {members.map(m=>{
            const acts=m.activities||[];
            const pcts=acts.map(a=>consPct(getLogs(logs,m.id,a.id),yr,mo));
            const avgP=pcts.length?Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length):0;
            const stks=acts.map(a=>streakCount(getLogs(logs,m.id,a.id)));
            const bs=stks.length?Math.max(...stks):0;
            return <div key={m.id} style={{flex:1,minWidth:140,background:m.color+"10",border:`1px solid ${m.color}30`,borderRadius:12,padding:14}}>
              <div style={{fontSize:18,marginBottom:4}}>{m.emoji}</div>
              <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{acts.map(a=>a.name).join(" · ")}</div>
              <Bar pct={avgP}/>
              <div style={{fontSize:12,fontWeight:700,color:avgP>=80?C.done:avgP>=50?C.partial:C.missed,marginTop:5}}>{avgP}%</div>
              {bs>0&&<div style={{fontSize:11,color:C.muted}}>🔥 {bs}d streak</div>}
            </div>;
          })}
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:10}}>👨‍👩‍👦 FAMILY BADGES · {fb.length}/{famBadges.length} earned</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {famBadges.map(b=>{const earned=fbIds.has(b.id);const tc=TC[b.tier];return <div key={b.id} title={b.desc} style={{display:"flex",alignItems:"center",gap:6,background:earned?tc.bg:C.bg,border:`1.5px solid ${earned?tc.bd:C.border}`,borderRadius:10,padding:"6px 10px",opacity:earned?1:0.4,filter:earned?"none":"grayscale(1)"}}>
              <span style={{fontSize:18}}>{b.e}</span>
              <div><div style={{fontSize:11,fontWeight:700,color:earned?tc.tx:C.muted}}>{b.label}</div><div style={{fontSize:10,color:C.muted}}>{b.desc}</div></div>
            </div>;})}
          </div>
        </div>
      </div>}
    </div>

    {toasts.length>0&&<Toast badge={toasts[0]} onDismiss={()=>setToasts(q=>q.slice(1))}/>}
    {editM&&<EditModal member={editM==="new"?null:editM} isNew={editM==="new"} onSave={handleSave} onDelete={handleDel} onClose={()=>setEditM(null)}/>}
  </div>;
}

export default App;
