import { useState, useEffect, useCallback, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#F7F5F0", surface:"#FFFFFF", border:"#E8E4DC",
  text:"#1A1A1A", muted:"#8A8580",
  done:"#3D9E6E", partial:"#E8A838", missed:"#E05C5C", empty:"#D9D5CD",
};
// ── Theme accents — only affects neutral chrome (header, +Add button, Family tab, background tint) ──
// Never touches semantic colors (done/missed/shielded) or member-specific colors
const THEMES = [
  {id:"forest",   name:"Forest",   accent:"#3D9E6E", light:"#D7ECDF"},
  {id:"ocean",    name:"Ocean",    accent:"#2C7BB6", light:"#D6E8F5"},
  {id:"sunset",   name:"Sunset",   accent:"#E07A3F", light:"#F8DFCC"},
  {id:"lavender", name:"Lavender", accent:"#8B6FC9", light:"#E5DEF5"},
  {id:"rose",     name:"Rose",     accent:"#D4527A", light:"#F5D9E2"},
  {id:"slate",    name:"Slate",    accent:"#546A80", light:"#DCE3E9"},
  {id:"amber",    name:"Amber",    accent:"#C99A2E", light:"#F3E7C9"},
  {id:"teal",     name:"Teal",     accent:"#1F9C8F", light:"#CFEBE7"},
  {id:"midnight", name:"Midnight", accent:"#3B4A6B", light:"#D8DCE8"},
  {id:"cherry",   name:"Cherry",   accent:"#C0392B", light:"#F5D0CC"},
  {id:"mint",     name:"Mint",     accent:"#27AE7A", light:"#C8EDE0"},
  {id:"peach",    name:"Peach",    accent:"#E8855A", light:"#FAE0D4"},
  {id:"storm",    name:"Storm",    accent:"#4A6FA5", light:"#D4DCE8"},
];

// ── Background Patterns ───────────────────────────────────────────────────────
function getPatternSvg(patternId, accent){
  const a = accent;
  const patterns = {
    topo: `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><g fill='none' stroke='${a}' stroke-width='1' opacity='0.4'><path d='M-20,60 C60,20 140,100 220,50 C300,0 380,80 440,40'/><path d='M-20,110 C60,70 140,150 220,100 C300,50 380,130 440,90'/><path d='M-20,160 C60,120 140,200 220,150 C300,100 380,180 440,140'/><path d='M-20,210 C60,170 140,250 220,200 C300,150 380,230 440,190'/><path d='M-20,260 C60,220 140,300 220,250 C300,200 380,280 440,240'/><path d='M-20,310 C60,270 140,350 220,300 C300,250 380,330 440,290'/><path d='M-20,360 C60,320 140,400 220,350 C300,300 380,380 440,340'/></g></svg>`,

    hex: `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'><g fill='none' stroke='${a}' stroke-width='1' opacity='0.35'><polygon points='30,2 58,17 58,35 30,50 2,35 2,17'/><polygon points='30,28 58,43 58,61 30,76 2,61 2,43' transform='translate(30,0)'/><polygon points='30,28 58,43 58,61 30,76 2,61 2,43' transform='translate(-30,0)'/></g></svg>`,

    dots: `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><circle cx='15' cy='15' r='2' fill='${a}' opacity='0.35'/></svg>`,

    constellation: `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><g stroke='${a}' opacity='0.3'><line x1='40' y1='30' x2='100' y2='80' stroke-width='0.5'/><line x1='100' y1='80' x2='160' y2='50' stroke-width='0.5'/><line x1='160' y1='50' x2='180' y2='140' stroke-width='0.5'/><line x1='180' y1='140' x2='100' y2='160' stroke-width='0.5'/><line x1='100' y1='160' x2='20' y2='120' stroke-width='0.5'/><line x1='20' y1='120' x2='40' y2='30' stroke-width='0.5'/><line x1='100' y1='80' x2='100' y2='160' stroke-width='0.5'/></g><g fill='${a}' opacity='0.5'><circle cx='40' cy='30' r='2.5'/><circle cx='100' cy='80' r='3'/><circle cx='160' cy='50' r='2'/><circle cx='180' cy='140' r='2.5'/><circle cx='100' cy='160' r='3'/><circle cx='20' cy='120' r='2'/></g></svg>`,

    waves: `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'><g fill='none' stroke='${a}' stroke-width='1.2' opacity='0.35'><path d='M0,20 C25,10 50,30 75,20 C100,10 125,30 150,20 C175,10 200,30 225,20'/><path d='M0,40 C25,30 50,50 75,40 C100,30 125,50 150,40 C175,30 200,50 225,40'/><path d='M0,60 C25,50 50,70 75,60 C100,50 125,70 150,60 C175,50 200,70 225,60'/></g></svg>`,

    crosshatch: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g stroke='${a}' stroke-width='0.8' opacity='0.25'><line x1='0' y1='0' x2='40' y2='40'/><line x1='40' y1='0' x2='0' y2='40'/><line x1='20' y1='0' x2='60' y2='40'/><line x1='-20' y1='0' x2='20' y2='40'/></g></svg>`,

    zigzag: `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'><g fill='none' stroke='${a}' stroke-width='1.5' opacity='0.35' stroke-linejoin='round'><polyline points='0,20 10,5 20,20 30,5 40,20 50,5 60,20 70,5 80,20'/><polyline points='0,40 10,25 20,40 30,25 40,40 50,25 60,40 70,25 80,40'/></g></svg>`,

    bubbles: `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='${a}' opacity='0.3'><circle cx='20' cy='20' r='14' stroke-width='1.5'/><circle cx='70' cy='15' r='8' stroke-width='1'/><circle cx='100' cy='40' r='18' stroke-width='1.5'/><circle cx='40' cy='70' r='22' stroke-width='1.5'/><circle cx='95' cy='90' r='12' stroke-width='1'/><circle cx='15' cy='95' r='9' stroke-width='1'/><circle cx='60' cy='55' r='6' stroke-width='1'/></g></svg>`,

    none: `<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1' viewBox='0 0 1 1'></svg>`,
  };
  return patterns[patternId] || patterns.topo;
}

const PATTERN_OPTIONS = [
  {id:"topo",          name:"Topo",          emoji:"🗺️"},
  {id:"hex",           name:"Hex",           emoji:"⬡"},
  {id:"dots",          name:"Dots",          emoji:"⚬"},
  {id:"constellation", name:"Stars",         emoji:"✦"},
  {id:"waves",         name:"Waves",         emoji:"〜"},
  {id:"crosshatch",    name:"Cross",         emoji:"✕"},
  {id:"zigzag",        name:"Zigzag",        emoji:"⚡"},
  {id:"bubbles",       name:"Bubbles",       emoji:"○"},
  {id:"none",          name:"None",          emoji:"□"},
];

const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const UNIT_OPTIONS=[
  {value:"sec",  label:"Seconds (sec)"},
  {value:"min",  label:"Minutes (min)"},
  {value:"hrs",  label:"Hours (hrs)"},
  {value:"km",   label:"Kilometres (km)"},
  {value:"miles",label:"Miles"},
  {value:"steps",label:"Steps"},
  {value:"reps", label:"Reps"},
  {value:"sets", label:"Sets"},
  {value:"kg",   label:"Kilograms (kg)"},
  {value:"cal",  label:"Calories (cal)"},
];

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isFuture(ds){return ds>todayStr();}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function firstDayOfMonth(y,m){return new Date(y,m,1).getDay();}

// Get activity logs — handles both old and new format
// Old: logs[memberId][dateStr]
// New: logs[memberId][activityId][dateStr]
function getActivityLogs(logs, memberId, activityId){
  const mLogs = logs[memberId];
  if(!mLogs) return {};
  // Check if first value is a log entry (old format) or nested object (new format)
  const firstKey = Object.keys(mLogs)[0];
  if(!firstKey) return {};
  const firstVal = mLogs[firstKey];
  // Old format: values have {value, status}
  if(firstVal && typeof firstVal === "object" && "status" in firstVal){
    return mLogs; // old flat format — return as-is
  }
  // New format: nested under activityId
  return mLogs[activityId] || {};
}

// ── Egg-O-Meter helpers (isolated from activity/badge/streak system) ─────────
function getEggLogs(logs, memberId){
  return (logs[memberId] && logs[memberId].eggs) || {};
}
function totalEggCount(logs, memberId){
  const eggs = getEggLogs(logs, memberId);
  return Object.values(eggs).reduce((sum,c)=>sum+(c||0), 0);
}

// ── General Knowledge (GK) — verbal quiz tracker, isolated, feeds into same PP pool ──
// Parent asks questions verbally; tap the button once all answered correctly.
function getGkData(logs, memberId){
  return (logs[memberId] && logs[memberId].gk) || {dailyResults:{}, weekendResults:{}};
}
function getWeekKey(dateStr){
  // Anchor to the Monday of the work-week this weekend follows, so Saturday
  // and the very next Sunday both map to the SAME key (avoids double-awarding).
  const d = new Date(dateStr+"T00:00:00");
  const dow = d.getDay(); // 0=Sun,6=Sat
  const daysSinceMonday = dow===0 ? 6 : dow-1;
  const monday = new Date(d);
  monday.setDate(d.getDate()-daysSinceMonday);
  return monday.toISOString().slice(0,10); // e.g. "2026-07-13" — Monday's date as the unique key
}
function computeGkBonus(logs, memberId){
  const gk = getGkData(logs, memberId);
  const dailyEntries = Object.values(gk.dailyResults||{}).filter(v=>v?.points>0);
  const weekendEntries = Object.values(gk.weekendResults||{}).filter(w=>w?.points>0);
  const dailyBonus = dailyEntries.reduce((s,v)=>s+v.points,0);
  const weekendBonus = weekendEntries.reduce((s,w)=>s+w.points,0);
  return {total:dailyBonus+weekendBonus, dailyBonus, weekendBonus, dailyCount:dailyEntries.length, weekendCount:weekendEntries.length};
}

// ── Bravery Points — parent-awarded, free-form reason + points, feeds same PP pool ──
function getBraveryLog(logs, memberId){
  return (logs[memberId] && logs[memberId].bravery) || [];
}
function computeBraveryBonus(logs, memberId){
  const entries = getBraveryLog(logs, memberId);
  const total = entries.reduce((s,e)=>s+(e.points||0),0);
  return {total, count:entries.length};
}

// ── Streak ────────────────────────────────────────────────────────────────────
function streakCount(al){
  let count=0;
  const today=todayStr();
  const d=new Date(today);
  // If today isn't logged yet, start counting from yesterday
  const todayLog=al[today];
  if(!todayLog||todayLog.status==="skipped") d.setDate(d.getDate()-1);
  while(true){
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const log=al[key];
    if(!log||log.status==="skipped") break;
    count++;
    d.setDate(d.getDate()-1);
  }
  return count;
}

// Count shields used this month across all activities for a member
function shieldsUsed(logs, memberId, activities){
  const today=todayStr();
  const ym=today.slice(0,7); // YYYY-MM
  let used=0;
  const counted=new Set(); // count per date not per activity
  for(const a of(activities||[])){
    const al=getActivityLogs(logs,memberId,a.id);
    for(const[d,l]of Object.entries(al)){
      if(d.startsWith(ym)&&l.status==="shielded"&&!counted.has(d)){
        counted.add(d);used++;
      }
    }
  }
  return used;
}

// ── All-time best value for an activity ──────────────────────────────────────
function allTimeBest(al){
  let best=0;
  const today=todayStr();
  for(const[d,l]of Object.entries(al)){
    if(d<=today&&l.status!=="skipped"){
      const sessionVals = l.sessions&&l.sessions.length>0 ? l.sessions : [l.value];
      for(const v of sessionVals) if(v>best) best=v;
    }
  }
  return best;
}

// ── Consistency ───────────────────────────────────────────────────────────────
function consPct(al,y,m,startDate){
  const today=todayStr();
  let done=0,app=0;
  for(let d=1;d<=daysInMonth(y,m);d++){
    const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(k>today) continue;
    if(startDate&&k<startDate) continue; // before tracking start
    app++;
    const l=al[k];
    if(l&&(l.status!=="skipped")) done++;
  }
  return app===0?0:Math.round((done/app)*100);
}

// ── Month summary stats ──────────────────────────────────────────────────────
function monthSummary(al,y,m,startDate){
  const today=todayStr();
  let done=0,missed=0,remaining=0;
  for(let d=1;d<=daysInMonth(y,m);d++){
    const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(startDate&&k<startDate) continue; // before tracking start
    if(k>today){remaining++;continue;}
    const l=al[k];
    if(!l){if(k===today){remaining++;}else{missed++;}continue;}
    if(l.status==="shielded") continue;
    if(l.status!=="skipped") done++;
    else missed++;
  }
  return{done,missed,remaining};
}

// ── Infer the earliest date an activity actually has logs (for newly added activities) ──
function getActivityEffectiveStart(logs, memberId, activityId, memberStartDate){
  const al = getActivityLogs(logs, memberId, activityId);
  const dates = Object.keys(al);
  if(dates.length===0) return memberStartDate||null; // no logs yet — nothing to exclude anyway
  const firstLog = dates.reduce((min,d)=>d<min?d:min, dates[0]);
  if(memberStartDate && memberStartDate > firstLog) return memberStartDate;
  return firstLog;
}

// ── Member-level consistency (handles alternating) ───────────────────────────
function memberConsPct(member, logs, y, m){
  const sd=member.startDate||null;
  if(!member.alternating) {
    const acts=member.activities||[];
    const pcts=acts.map(a=>{
      const effectiveStart = getActivityEffectiveStart(logs, member.id, a.id, sd);
      return consPct(getActivityLogs(logs,member.id,a.id),y,m,effectiveStart);
    });
    return pcts.length?Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length):0;
  }
  // Alternating: day is done if ANY activity was done
  const today=todayStr();
  const acts=member.activities||[];
  let done=0,app=0;
  const dim_=daysInMonth(y,m);
  for(let d=1;d<=dim_;d++){
    const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(sd&&k<sd) continue; // before start date
    if(k>today) continue;
    app++;
    const anyDone=acts.some(a=>{
      const l=getActivityLogs(logs,member.id,a.id)[k];
      return l&&l.status!=="skipped"&&l.status!=="shielded"&&l.value>0;
    });
    const anyShielded=acts.some(a=>{
      const l=getActivityLogs(logs,member.id,a.id)[k];
      return l&&l.status==="shielded";
    });
    if(anyShielded){done++;continue;} // shield counts
    if(anyDone) done++;
  }
  return app===0?0:Math.round((done/app)*100);
}

// ── Member-level month summary (handles alternating) ──────────────────────────
function memberMonthSummary(member, logs, y, m){
  const sd = member.startDate || null;
  const acts = member.activities || [];
  const today = todayStr();

  if(!member.alternating || acts.length <= 1){
    const summaries = acts.map(a=>{
      const effectiveStart = getActivityEffectiveStart(logs, member.id, a.id, sd);
      return monthSummary(getActivityLogs(logs,member.id,a.id),y,m,effectiveStart);
    });
    const done = summaries.length?Math.max(...summaries.map(s=>s.done)):0;
    const missed = summaries.length?Math.max(...summaries.map(s=>s.missed)):0;
    const remaining = summaries[0]?.remaining||0;
    return{done,missed,remaining};
  }

  // Alternating: day is done if ANY activity was logged, missed only if NONE were
  let done=0,missed=0,remaining=0;
  const dim_ = daysInMonth(y,m);
  for(let d=1;d<=dim_;d++){
    const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(sd&&k<sd) continue;
    if(k>today){remaining++;continue;}
    const anyDone=acts.some(a=>{
      const l=getActivityLogs(logs,member.id,a.id)[k];
      return l&&l.status!=="skipped"&&l.status!=="shielded"&&l.value>0;
    });
    const anyShielded=acts.some(a=>{
      const l=getActivityLogs(logs,member.id,a.id)[k];
      return l&&l.status==="shielded";
    });
    const anyLogged=acts.some(a=>getActivityLogs(logs,member.id,a.id)[k]);
    if(anyShielded){done++;continue;}
    if(anyDone){done++;continue;}
    if(k===today&&!anyLogged){remaining++;continue;}
    missed++;
  }
  return{done,missed,remaining};
}

// ── Member-level streak (handles alternating — any activity keeps streak alive) ──
function memberStreakCount(member, logs){
  const acts = member.activities || [];
  if(!acts.length) return 0;
  if(acts.length === 1) return streakCount(getActivityLogs(logs,member.id,acts[0].id));

  // For any member with multiple activities: streak continues if ANY activity was logged that day
  // This correctly handles both alternating and non-alternating multi-activity members
  const today = todayStr();
  const anyToday = acts.some(a=>{
    const l = getActivityLogs(logs,member.id,a.id)[today];
    return l && l.status!=="skipped";
  });
  let d = new Date(today+"T00:00:00");
  if(!anyToday) d.setDate(d.getDate()-1);

  let count = 0;
  while(true){
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const anyLogged = acts.some(a=>{
      const l = getActivityLogs(logs,member.id,a.id)[key];
      return l && l.status!=="skipped";
    });
    if(!anyLogged) break;
    count++;
    d.setDate(d.getDate()-1);
    if(count>2000) break;
  }
  return count;
}

// ── Day status for calendar cell ──────────────────────────────────────────────
function dayStatus(member,logs,ds){
  const acts=member.activities||[];
  if(!acts.length) return "empty";
  const loggedActs=acts.map(a=>{
    const l=getActivityLogs(logs,member.id,a.id)[ds];
    return l?{status:l.status,value:l.value,target:l.target||a.target}:null;
  }).filter(Boolean);
  if(loggedActs.length===0) return "empty";
  if(loggedActs.every(l=>l.status==="shielded")) return "shielded";
  const doneActs=loggedActs.filter(l=>l.status!=="skipped"&&l.status!=="shielded");
  if(doneActs.length===0) return "skipped";
  // For alternating members: any done = full green
  // For regular members: all must be done for full green
  if(member.alternating) return "done";
  return "done";
}

// ── Migration: old format → new format ───────────────────────────────────────
function migrateData(raw){
  // Already new format
  if(raw.members && raw.logs) return raw;

  // Old format: ft_members + ft_logs
  const oldMembers = raw.ft_members || [];
  const oldLogs    = raw.ft_logs    || {};

  const members = oldMembers.map(m => ({
    id:    m.id,
    name:  m.name,
    emoji: m.emoji,
    color: m.color,
    activities: [{
      id:     m.id + "_act",
      name:   m.activity || "Activity",
      unit:   m.unit     || "min",
      target: m.target   || 30,
    }]
  }));

  const logs = {};
  for(const [mid, mLogs] of Object.entries(oldLogs)){
    const member = members.find(m => m.id === mid);
    if(!member) continue; // skip ghost members like the test one
    const actId = member.activities[0].id;
    // Check if already nested (new format)
    const firstVal = Object.values(mLogs||{})[0];
    const alreadyNested = firstVal && typeof firstVal==="object" && !("status" in firstVal);
    logs[mid] = alreadyNested ? mLogs : { [actId]: mLogs };
  }

  return { members, logs };
}

// ── Volume formatter ─────────────────────────────────────────────────────────
function formatVol(val, unit){
  if(unit==="sec"){
    const h=Math.floor(val/3600);
    const m=Math.floor((val%3600)/60);
    const s=val%60;
    if(h>0) return `${h}h ${m}m ${s}s`;
    if(m>0) return `${m}m ${s}s`;
    return `${s}s`;
  }
  if(unit==="min"){
    const h=Math.floor(val/60);
    const m=val%60;
    return h>0?`${h}h ${m}m`:`${m}m`;
  }
  if(unit==="km") return `${val.toFixed(1)} km`;
  if(unit==="miles") return `${val.toFixed(1)} mi`;
  if(unit==="steps") return `${val.toLocaleString()} steps`;
  if(unit==="cal") return `${val} cal`;
  return `${val} ${unit}`;
}

// ── Power Points System ──────────────────────────────────────────────────────
const PP_LEVELS = [
  {level:1,  pp:0,      title:"Rookie",       icon:"🌱"},
  {level:2,  pp:200,    title:"Trainee",      icon:"🔰"},
  {level:3,  pp:500,    title:"Cadet",        icon:"🥉"},
  {level:4,  pp:900,    title:"Scout",        icon:"🎯"},
  {level:5,  pp:1500,   title:"Fighter",      icon:"⚔️"},
  {level:6,  pp:2500,   title:"Brawler",      icon:"🥊"},
  {level:7,  pp:4000,   title:"Warrior",      icon:"🛡️"},
  {level:8,  pp:6000,   title:"Gladiator",    icon:"🏟️"},
  {level:9,  pp:7200,   title:"Spartan",      icon:"⚡"},
  {level:10, pp:8600,   title:"Centurion",    icon:"🎖️"},
  {level:11, pp:10300,  title:"Champion",     icon:"🏆"},
  {level:12, pp:12300,  title:"Conqueror",    icon:"🗡️"},
  {level:13, pp:14700,  title:"Vanguard",     icon:"🚩"},
  {level:14, pp:17600,  title:"Hero",         icon:"🦸"},
  {level:15, pp:21000,  title:"Guardian",     icon:"🏰"},
  {level:16, pp:25100,  title:"Sentinel",     icon:"🗿"},
  {level:17, pp:30000,  title:"Legend",       icon:"🌟"},
  {level:18, pp:36000,  title:"Mythic",       icon:"🔱"},
  {level:19, pp:43000,  title:"Paragon",      icon:"💠"},
  {level:20, pp:51500,  title:"Master",       icon:"💎"},
  {level:21, pp:61500,  title:"Elite",        icon:"👑"},
  {level:22, pp:73500,  title:"Ascendant",    icon:"✨"},
  {level:23, pp:88000,  title:"Titan",        icon:"🌋"},
  {level:24, pp:105000, title:"Warlord",      icon:"🔥"},
  {level:25, pp:125000, title:"Legendary",    icon:"🌠"},
  {level:26, pp:150000, title:"Demigod",      icon:"⚡👑"},
  {level:27, pp:180000, title:"Overlord",     icon:"🔱👑"},
  {level:28, pp:215000, title:"Eternal",      icon:"💫"},
  {level:29, pp:255000, title:"Transcendent", icon:"🌌✨"},
  {level:30, pp:300000, title:"Celestial",    icon:"🌙"},
  {level:31, pp:350000, title:"Astral",       icon:"⭐"},
  {level:32, pp:410000, title:"Cosmic",       icon:"🌌"},
  {level:33, pp:480000, title:"Nebula",       icon:"🌠"},
  {level:34, pp:560000, title:"Galactic",     icon:"🪐"},
  {level:35, pp:650000, title:"Universal",    icon:"🌐"},
  {level:36, pp:750000, title:"Omnipotent",   icon:"🔮"},
  {level:37, pp:860000, title:"Absolute",     icon:"💥"},
  {level:38, pp:980000, title:"Supreme",      icon:"🏵️"},
  {level:39, pp:1120000,title:"Infinite",     icon:"♾️"},
  {level:40, pp:1300000,title:"Immortal",     icon:"🌌👑"},
];

function getLevel(pp){
  let current = PP_LEVELS[0];
  for(const l of PP_LEVELS){ if(pp >= l.pp) current = l; else break; }
  return current;
}
function getNextLevel(pp){
  for(const l of PP_LEVELS){ if(pp < l.pp) return l; }
  return null; // already at max
}
function getStreakMultiplier(streak){
  if(streak >= 30) return 5;
  if(streak >= 14) return 3;
  if(streak >= 7)  return 2;
  if(streak >= 3)  return 1.5;
  return 1;
}

function getWeekNumber(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
}

function simpleStringHash(str){
  let hash = 5381;
  for(let i=0;i<str.length;i++){
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isMysteryBonusDay(memberId, dateStr){
  // Properly mixed hash so different members never collide on the same bonus day
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const week = getWeekNumber(dateStr);
  const memberHash = simpleStringHash(memberId);
  const weekKey = year*100 + week;
  let mixed = (memberHash ^ Math.imul(weekKey, 2654435761)) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 2246822507) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 13), 3266489909) >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;
  const bonusDow = mixed % 7;
  return d.getDay() === bonusDow;
}

function computePowerPoints(member, logs){
  const today = todayStr();
  const acts = member.activities || [];
  const sd = member.startDate || null;

  // Collect all days across all activities AND egg logs
  const allDates = new Set();
  for(const a of acts){
    const al = getActivityLogs(logs, member.id, a.id);
    for(const d of Object.keys(al)) if(d <= today && (!sd || d >= sd)) allDates.add(d);
  }
  // Also include egg log dates so level crossings driven by eggs are correctly dated
  const eggLogDates = getEggLogs(logs, member.id);
  for(const d of Object.keys(eggLogDates)) if(d <= today && (!sd || d >= sd)) allDates.add(d);
  // Also include GK (verbal quiz) dates for the same reason
  const gkData = getGkData(logs, member.id);
  const gkDailyByDate = gkData.dailyResults || {};
  for(const d of Object.keys(gkDailyByDate)) if(gkDailyByDate[d]?.points>0 && d <= today && (!sd || d >= sd)) allDates.add(d);
  // GK weekend review completions carry a completion date
  const gkWeekendByDate = {}; // dateStr -> points earned that weekend review
  for(const w of Object.values(gkData.weekendResults||{})){
    if(w.date && w.date <= today && (!sd || w.date >= sd)){
      allDates.add(w.date);
      gkWeekendByDate[w.date] = w.points||0;
    }
  }
  // Bravery Points — multiple awards can land on the same date, so aggregate per date first
  const braveryByDate = {}; // dateStr -> total bravery points that date
  for(const entry of getBraveryLog(logs, member.id)){
    if(entry.date && entry.date <= today && (!sd || entry.date >= sd) && entry.points>0){
      allDates.add(entry.date);
      braveryByDate[entry.date] = (braveryByDate[entry.date]||0) + entry.points;
    }
  }
  const sortedDates = [...allDates].sort();

  let totalPP = 100; // base starting points
  let breakdown = {atTarget:0, aboveTarget:0, belowTarget:0, pb:0, shielded:0, skipped:0, streakBonus:0, streakBreak:0, mysteryDays:0, eggBonus:0, gkBonus:0, braveryBonus:0, extraSessionBonus:0};
  let prevStreak = 0;
  let levelHistory = []; // [{level, title, icon, date}]
  let lastLevelSeen = 1;
  let dailyEarned = {}; // dateStr -> net PP change that day (for accurate weekPP/pace)
  let dailyTags = {}; // dateStr -> array of tag strings (pb/above/at/below/shielded/skipped/mystery)

  // Track all-time best per activity for PB detection
  const actBests = {};
  for(const a of acts) actBests[a.id] = 0;

  for(const dateStr of sortedDates){
    const ppBeforeDay = totalPP;
    // Compute streak up to this day
    let streakOnDay = 0;
    const d = new Date(dateStr + "T00:00:00");
    const checkD = new Date(d);
    while(true){
      const k = checkD.toISOString().slice(0,10);
      if(k > dateStr) { checkD.setDate(checkD.getDate()-1); continue; }
      let anyLogged = false;
      if(member.alternating && acts.length > 1){
        anyLogged = acts.some(a => {
          const l = getActivityLogs(logs, member.id, a.id)[k];
          return l && l.status !== "skipped" && l.value > 0;
        });
      } else {
        anyLogged = acts.some(a => {
          const l = getActivityLogs(logs, member.id, a.id)[k];
          return l && l.status !== "skipped" && l.value > 0;
        });
      }
      if(!anyLogged) break;
      streakOnDay++;
      checkD.setDate(checkD.getDate()-1);
      if(streakOnDay > 200) break; // safety
    }

    const multiplier = getStreakMultiplier(streakOnDay);

    // Streak break penalty
    if(prevStreak >= 7){
      const allSkipped = acts.every(a => {
        const l = getActivityLogs(logs, member.id, a.id)[dateStr];
        return !l || l.status === "skipped";
      });
      if(allSkipped && streakOnDay === 0){
        totalPP = Math.max(0, totalPP - 100);
        breakdown.streakBreak -= 100;
      }
    }
    prevStreak = streakOnDay;

    // For alternating members — day is one unit
    if(member.alternating && acts.length > 1){
      const anyShielded = acts.some(a => {
        const l = getActivityLogs(logs, member.id, a.id)[dateStr];
        return l && l.status === "shielded";
      });
      const anySkipped = acts.every(a => {
        const l = getActivityLogs(logs, member.id, a.id)[dateStr];
        return !l || l.status === "skipped";
      });
      const doneActs = acts.filter(a => {
        const l = getActivityLogs(logs, member.id, a.id)[dateStr];
        return l && l.status !== "skipped" && l.status !== "shielded" && l.value > 0;
      });

      if(anyShielded){ totalPP += 25; breakdown.shielded += 25; dailyTags[dateStr]=["shielded"]; }
      else if(anySkipped){ totalPP = Math.max(0, totalPP - 25); breakdown.skipped -= 25; dailyTags[dateStr]=["skipped"]; }
      else if(doneActs.length > 0){
        // Use best activity for scoring
        let bestPts = 0;
        let bestSessionCount = 1;
        for(const a of doneActs){
          const l = getActivityLogs(logs, member.id, a.id)[dateStr];
          const effectiveTarget = l.target || a.target;
          const sessionVals = l.sessions&&l.sessions.length>0 ? l.sessions : [l.value];
          const maxSession = Math.max(...sessionVals);
          const isPB = maxSession > actBests[a.id] && maxSession > effectiveTarget;
          if(isPB) actBests[a.id] = maxSession;
          const basePts = isPB ? 250 : l.value > effectiveTarget ? 200 : l.value >= effectiveTarget ? 100 : 50;
          if(basePts > bestPts){ bestPts = basePts; bestSessionCount = sessionVals.length; }
        }
        const extraPts = bestSessionCount>1 ? 100*(bestSessionCount-1) : 0;
        const mysteryMult = isMysteryBonusDay(member.id, dateStr) ? 2 : 1;
        const tierEarned = Math.round(bestPts * multiplier * mysteryMult);
        const extraEarned = Math.round(extraPts * multiplier * mysteryMult);
        const earned = tierEarned + extraEarned;
        const bonus = (tierEarned-bestPts) + (extraEarned-extraPts);
        totalPP += earned;
        if(bestPts === 250) breakdown.pb += tierEarned;
        else if(bestPts === 200) breakdown.aboveTarget += tierEarned;
        else if(bestPts === 100) breakdown.atTarget += tierEarned;
        else breakdown.belowTarget += tierEarned;
        if(extraEarned>0) breakdown.extraSessionBonus += extraEarned;
        breakdown.streakBonus += bonus;
        const tags=[];
        if(bestPts===250) tags.push("pb");
        else if(bestPts===200) tags.push("above");
        else if(bestPts===100) tags.push("at");
        else tags.push("below");
        if(extraEarned>0) tags.push("extraSession");
        if(mysteryMult===2) tags.push("mystery");
        dailyTags[dateStr]=tags;
      }
    } else {
      // Non-alternating: score each activity
      for(const a of acts){
        const al = getActivityLogs(logs, member.id, a.id);
        const l = al[dateStr];
        if(!l) continue;
        const effectiveTarget = l.target || a.target;
        if(l.status === "shielded"){ totalPP += 25; breakdown.shielded += 25; dailyTags[dateStr]=["shielded"]; }
        else if(l.status === "skipped"){ totalPP = Math.max(0, totalPP - 25); breakdown.skipped -= 25; dailyTags[dateStr]=["skipped"]; }
        else if(l.value > 0){
          const sessionVals = l.sessions&&l.sessions.length>0 ? l.sessions : [l.value];
          const maxSession = Math.max(...sessionVals);
          const isPB = maxSession > actBests[a.id] && maxSession > effectiveTarget;
          if(isPB) actBests[a.id] = maxSession;
          const basePts = isPB ? 250 : l.value > effectiveTarget ? 200 : l.value >= effectiveTarget ? 100 : 50;
          const extraPts = sessionVals.length>1 ? 100*(sessionVals.length-1) : 0; // credit for extra sessions beyond the first, even if not a new PB
          const mysteryMult = isMysteryBonusDay(member.id, dateStr) ? 2 : 1;
          const tierEarned = Math.round(basePts * multiplier * mysteryMult);
          const extraEarned = Math.round(extraPts * multiplier * mysteryMult);
          const earned = tierEarned + extraEarned;
          const bonus = (tierEarned-basePts) + (extraEarned-extraPts);
          totalPP += earned;
          if(basePts === 250) breakdown.pb += tierEarned;
          else if(basePts === 200) breakdown.aboveTarget += tierEarned;
          else if(basePts === 100) breakdown.atTarget += tierEarned;
          else breakdown.belowTarget += tierEarned;
          if(extraEarned>0) breakdown.extraSessionBonus += extraEarned;
          breakdown.streakBonus += bonus;
          const tags=[];
          if(basePts===250) tags.push("pb");
          else if(basePts===200) tags.push("above");
          else if(basePts===100) tags.push("at");
          else tags.push("below");
          if(extraEarned>0) tags.push("extraSession");
          if(mysteryMult===2) tags.push("mystery");
          dailyTags[dateStr]=tags;
        }
      }
    }
    totalPP = Math.max(0, totalPP);

    // Add egg PP for this date inside the loop so levelHistory sees it correctly
    const eggsThisDay = eggLogDates[dateStr] || 0;
    if(eggsThisDay > 0){
      const eggPP = eggsThisDay * 1000;
      totalPP += eggPP;
      breakdown.eggBonus += eggPP;
      if(!dailyTags[dateStr]) dailyTags[dateStr]=[];
      dailyTags[dateStr].push("egg");
    }

    // Add GK (verbal quiz) PP for this date inside the loop, same pattern as eggs
    const gkDailyPts = gkDailyByDate[dateStr]?.points||0;
    if(gkDailyPts>0){
      totalPP += gkDailyPts;
      breakdown.gkBonus += gkDailyPts;
      if(!dailyTags[dateStr]) dailyTags[dateStr]=[];
      dailyTags[dateStr].push("gk");
    }
    const gkWeekendPts = gkWeekendByDate[dateStr]||0;
    if(gkWeekendPts>0){
      totalPP += gkWeekendPts;
      breakdown.gkBonus += gkWeekendPts;
      if(!dailyTags[dateStr]) dailyTags[dateStr]=[];
      dailyTags[dateStr].push("gkWeekend");
    }

    // Add Bravery Points for this date inside the loop, same pattern as eggs/GK
    const braveryPts = braveryByDate[dateStr]||0;
    if(braveryPts>0){
      totalPP += braveryPts;
      breakdown.braveryBonus += braveryPts;
      if(!dailyTags[dateStr]) dailyTags[dateStr]=[];
      dailyTags[dateStr].push("bravery");
    }

    dailyEarned[dateStr] = totalPP - ppBeforeDay; // net change this day, multiplier + eggs + GK + Bravery included

    // Track level-up moments
    const dayLevel = getLevel(totalPP);
    if(dayLevel.level > lastLevelSeen){
      levelHistory.push({level:dayLevel.level, title:dayLevel.title, icon:dayLevel.icon, date:dateStr});
      lastLevelSeen = dayLevel.level;
    }
  }

  // Egg-O-Meter bonus — already processed inside loop above, no double counting needed

  // This week's PP — sum of actual net daily earnings (multiplier + mystery bonus + eggs already applied)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0,10);
  let weekPP = 0;
  for(const dateStr of sortedDates){
    if(dateStr < weekStartStr) continue;
    weekPP += Math.max(0, dailyEarned[dateStr] || 0);
  }

  return { total: Math.round(totalPP), breakdown, weekPP, levelHistory, dailyEarned, dailyTags };
}

// ── PP Pace Projection ────────────────────────────────────────────────────────
function projectNextLevel(member, logs){
  const {total, weekPP} = computePowerPoints(member, logs);
  const nextLevel = getNextLevel(total);
  if(!nextLevel) return null; // maxed out
  if(weekPP <= 0) return { nextLevel, daysAway: null, weeksAway: null };

  const ppNeeded = nextLevel.pp - total;
  const dailyRate = weekPP / 7;
  const daysAway = Math.max(1, Math.ceil(ppNeeded / dailyRate));
  const weeksAway = Math.ceil(daysAway / 7);
  return { nextLevel, daysAway, weeksAway, ppNeeded, weekPP };
}

// ── Badge Engine ──────────────────────────────────────────────────────────────
const BADGES=[
  {id:"streak_3",  e:"🌱",label:"Seedling",         desc:"3-day streak",                    tier:"bronze",check:s=>s.bestStreak>=3},
  {id:"streak_7",  e:"🔥",label:"On Fire",           desc:"7-day streak",                    tier:"silver",check:s=>s.bestStreak>=7},
  {id:"streak_14", e:"⚡",label:"Electric",          desc:"14-day streak",                   tier:"silver",check:s=>s.bestStreak>=14},
  {id:"streak_21", e:"🌊",label:"In the Flow",       desc:"21-day streak",                   tier:"gold",  check:s=>s.bestStreak>=21},
  {id:"streak_30", e:"🏆",label:"Unstoppable",       desc:"30-day streak",                   tier:"gold",  check:s=>s.bestStreak>=30},
  {id:"streak_60", e:"🦁",label:"Lion Heart",        desc:"60-day streak",                   tier:"gold",  check:s=>s.bestStreak>=60},
  {id:"streak_90", e:"🌋",label:"Force of Nature",   desc:"90-day streak",                   tier:"gold",  check:s=>s.bestStreak>=90},
  {id:"days_1",    e:"👣",label:"First Step",        desc:"Logged your first day",           tier:"bronze",check:s=>s.totalDone>=1},
  {id:"days_7",    e:"🎯",label:"Week One",          desc:"7 days logged",                   tier:"bronze",check:s=>s.totalDone>=7},
  {id:"days_14",   e:"💪",label:"Two Weeks In",      desc:"14 days logged",                  tier:"bronze",check:s=>s.totalDone>=14},
  {id:"days_30",   e:"🥉",label:"Month Strong",      desc:"30 days logged",                  tier:"silver",check:s=>s.totalDone>=30},
  {id:"days_60",   e:"🥈",label:"Two Months",        desc:"60 days logged",                  tier:"silver",check:s=>s.totalDone>=60},
  {id:"days_100",  e:"🥇",label:"Century",           desc:"100 days logged",                 tier:"gold",  check:s=>s.totalDone>=100},
  {id:"days_200",  e:"🚀",label:"Launch Pad",        desc:"200 days logged",                 tier:"gold",  check:s=>s.totalDone>=200},
  {id:"days_365",  e:"🌍",label:"Around the Sun",    desc:"365 days logged",                 tier:"gold",  check:s=>s.totalDone>=365},
  {id:"perf_3",    e:"✨",label:"Spark",             desc:"3 days at/above target in a row", tier:"bronze",check:s=>s.bestPerf>=3},
  {id:"perf_7",    e:"⭐",label:"Perfect Week",      desc:"7 days at/above target in a row", tier:"silver",check:s=>s.bestPerf>=7},
  {id:"perf_14",   e:"🌟",label:"Perfect Fortnight", desc:"14 days at/above target in a row",tier:"gold",  check:s=>s.bestPerf>=14},
  {id:"perf_30",   e:"💫",label:"Perfect Month",     desc:"30 days at/above target in a row",tier:"gold",  check:s=>s.bestPerf>=30},
  {id:"cons_50",   e:"🌤️",label:"Getting There",    desc:"50%+ consistency in a month",     tier:"bronze",check:s=>s.bestMonPct>=50},
  {id:"cons_80",   e:"📈",label:"On Track",          desc:"80%+ consistency in a month",     tier:"silver",check:s=>s.bestMonPct>=80},
  {id:"cons_100",  e:"💎",label:"Flawless Month",    desc:"100% consistency in a month",     tier:"gold",  check:s=>s.bestMonPct>=100},
  {id:"cons_3mo",  e:"🏅",label:"Hat Trick",         desc:"3 months with 80%+ consistency",  tier:"gold",  check:s=>s.highMons>=3},
  {id:"cons_6mo",  e:"🎖️",label:"Half Year Hero",   desc:"6 months with 80%+ consistency",  tier:"gold",  check:s=>s.highMons>=6},
  {id:"pb_first",  e:"🎉",label:"New Record",        desc:"Beat your initial target",        tier:"bronze",check:s=>s.hasPB},
  {id:"pb_110",    e:"📊",label:"110%",              desc:"Hit 110% of target",              tier:"silver",check:s=>s.bestPct>=110},
  {id:"pb_150",    e:"🚀",label:"150% Club",         desc:"Hit 150% of target",              tier:"gold",  check:s=>s.bestPct>=150},
  {id:"pb_200",    e:"🌠",label:"Double Down",       desc:"Hit 200% of target",              tier:"gold",  check:s=>s.bestPct>=200},
  {id:"week_5",    e:"🗓️",label:"5-Day Week",       desc:"5 days logged in a week",         tier:"bronze",check:s=>s.bestWeek>=5},
  {id:"week_7",    e:"🗃️",label:"Full Week",        desc:"All 7 days in a week",            tier:"silver",check:s=>s.bestWeek>=7},
  {id:"week_4x",   e:"📆",label:"4-Week Run",        desc:"5+ days for 4 weeks straight",    tier:"gold",  check:s=>s.consec5w>=4},
  {id:"comeback",  e:"🦅",label:"Comeback King",     desc:"3+ days after a 7+ day gap",      tier:"silver",check:s=>s.comeback},
  {id:"monday",    e:"☀️",label:"Monday Warrior",    desc:"Every Monday logged in a month",  tier:"silver",check:s=>s.perfMon},
  {id:"weekend",   e:"🏖️",label:"Weekend Warrior",  desc:"Both Sat & Sun for 4 weekends",   tier:"silver",check:s=>s.perfWknd>=4},
  {id:"no_excuses",e:"🌅",label:"No Excuses",        desc:"Every Sunday logged in a month",  tier:"silver",check:s=>s.perfSun},
  {id:"month_1",   e:"🎂",label:"One Month Club",    desc:"Tracking for 1 month",            tier:"bronze",check:s=>s.trackDays>=30},
  {id:"month_3",   e:"🏋️",label:"Quarter Strong",   desc:"Tracking for 3 months",           tier:"silver",check:s=>s.trackDays>=90},
  {id:"month_6",   e:"🌿",label:"Half Year",         desc:"Tracking for 6 months",           tier:"gold",  check:s=>s.trackDays>=180},
  {id:"month_12",  e:"🌳",label:"One Full Year",     desc:"Tracking for 12 months",          tier:"gold",  check:s=>s.trackDays>=365},
  {id:"over7",     e:"🦸",label:"Overachiever",      desc:"20%+ above target 7 days in a row",tier:"silver",check:s=>s.overStreak>=7},
  {id:"steady7",   e:"🎻",label:"Steady Eddie",      desc:"Within 10% of target 7 days",    tier:"silver",check:s=>s.steadyStreak>=7},
  {id:"steady14",  e:"🎯",label:"Dead Accurate",     desc:"Within 10% of target 14 days",   tier:"gold",  check:s=>s.steadyStreak>=14},
  // ── 📅 Monthly days logged (within a single calendar month)
  {id:"mon_10",  e:"🗓️",label:"10-Day Month",     desc:"10+ days logged in a month",      tier:"bronze",check:s=>s.bestMonthDays>=10},
  {id:"mon_15",  e:"📅",label:"15-Day Month",     desc:"15+ days logged in a month",      tier:"bronze",check:s=>s.bestMonthDays>=15},
  {id:"mon_20",  e:"🌟",label:"20-Day Month",     desc:"20+ days logged in a month",      tier:"silver",check:s=>s.bestMonthDays>=20},
  {id:"mon_25",  e:"💎",label:"25-Day Month",     desc:"25+ days logged in a month",      tier:"silver",check:s=>s.bestMonthDays>=25},
  {id:"mon_28",  e:"🏆",label:"Near Perfect",     desc:"28+ days logged in a month",      tier:"gold",  check:s=>s.bestMonthDays>=28},
  {id:"mon_30",  e:"🌌",label:"Perfect Month",    desc:"Every single day in a month",     tier:"gold",  check:s=>s.bestMonthDays>=30},
  {id:"fam_day",   e:"🤝",label:"Family Day",        desc:"All members logged same day",     tier:"bronze",check:s=>s.famDays>=1},
  {id:"fam_10",    e:"👨‍👩‍👦",label:"Family Strong",  desc:"10 days all members logged",      tier:"silver",check:s=>s.famDays>=10},
  {id:"fam_week",  e:"🏡",label:"Family Week",       desc:"All members 5+ days in a week",   tier:"silver",check:s=>s.famWeeks>=1},
  {id:"fam_trio",  e:"🌈",label:"The Trio",          desc:"All members have 7+ days",        tier:"bronze",check:s=>s.famActive},
  // ── 🧗 Cumulative hang time (sec unit) ── every 15 min up to 10 hrs
  {id:"hang_900",   e:"🪝",label:"First Quarter",    desc:"15 min total hang time",          tier:"bronze",check:s=>s.unit==="sec"&&s.totalVol>=900},
  {id:"hang_1800",  e:"💪",label:"Half Hour",        desc:"30 min total hang time",          tier:"bronze",check:s=>s.unit==="sec"&&s.totalVol>=1800},
  {id:"hang_2700",  e:"🔥",label:"45 Minutes",       desc:"45 min total hang time",          tier:"bronze",check:s=>s.unit==="sec"&&s.totalVol>=2700},
  {id:"hang_3600",  e:"🦾",label:"One Hour",         desc:"1 hr total hang time",            tier:"silver",check:s=>s.unit==="sec"&&s.totalVol>=3600},
  {id:"hang_4500",  e:"⚡",label:"75 Minutes",       desc:"1 hr 15 min total hang time",     tier:"silver",check:s=>s.unit==="sec"&&s.totalVol>=4500},
  {id:"hang_5400",  e:"🔩",label:"90 Minutes",       desc:"1 hr 30 min total hang time",     tier:"silver",check:s=>s.unit==="sec"&&s.totalVol>=5400},
  {id:"hang_6300",  e:"🌊",label:"105 Minutes",      desc:"1 hr 45 min total hang time",     tier:"silver",check:s=>s.unit==="sec"&&s.totalVol>=6300},
  {id:"hang_7200",  e:"🏋️",label:"Two Hours",       desc:"2 hr total hang time",            tier:"silver",check:s=>s.unit==="sec"&&s.totalVol>=7200},
  {id:"hang_9000",  e:"🎯",label:"150 Minutes",      desc:"2 hr 30 min total hang time",     tier:"silver",check:s=>s.unit==="sec"&&s.totalVol>=9000},
  {id:"hang_10800", e:"🌿",label:"Three Hours",      desc:"3 hr total hang time",            tier:"gold",  check:s=>s.unit==="sec"&&s.totalVol>=10800},
  {id:"hang_14400", e:"🏔️",label:"Four Hours",      desc:"4 hr total hang time",            tier:"gold",  check:s=>s.unit==="sec"&&s.totalVol>=14400},
  {id:"hang_18000", e:"🌋",label:"Five Hours",       desc:"5 hr total hang time",            tier:"gold",  check:s=>s.unit==="sec"&&s.totalVol>=18000},
  {id:"hang_21600", e:"🦁",label:"Six Hours",        desc:"6 hr total hang time",            tier:"gold",  check:s=>s.unit==="sec"&&s.totalVol>=21600},
  {id:"hang_28800", e:"🌠",label:"Eight Hours",      desc:"8 hr total hang time",            tier:"gold",  check:s=>s.unit==="sec"&&s.totalVol>=28800},
  {id:"hang_36000", e:"🌌",label:"Legendary Grip",   desc:"10 hr total hang time",           tier:"gold",  check:s=>s.unit==="sec"&&s.totalVol>=36000},
  // ── 🚶 Cumulative distance (km unit) ── every 10 km
  {id:"walk_10",   e:"🥾",label:"First 10km",        desc:"10 km total distance",            tier:"bronze",check:s=>s.unit==="km"&&s.totalVol>=10},
  {id:"walk_25",   e:"🌿",label:"Quarter Century",   desc:"25 km total distance",            tier:"bronze",check:s=>s.unit==="km"&&s.totalVol>=25},
  {id:"walk_42",   e:"🎽",label:"Marathon",          desc:"42.2 km total distance",          tier:"silver",check:s=>s.unit==="km"&&s.totalVol>=42.2},
  {id:"walk_50",   e:"🏃",label:"50km Club",         desc:"50 km total distance",            tier:"silver",check:s=>s.unit==="km"&&s.totalVol>=50},
  {id:"walk_100",  e:"🌍",label:"Century Walks",     desc:"100 km total distance",           tier:"silver",check:s=>s.unit==="km"&&s.totalVol>=100},
  {id:"walk_150",  e:"🏅",label:"150km",             desc:"150 km total distance",           tier:"gold",  check:s=>s.unit==="km"&&s.totalVol>=150},
  {id:"walk_200",  e:"🚶",label:"200km",             desc:"200 km total distance",           tier:"gold",  check:s=>s.unit==="km"&&s.totalVol>=200},
  {id:"walk_250",  e:"🏆",label:"Long Hauler",       desc:"250 km total distance",           tier:"gold",  check:s=>s.unit==="km"&&s.totalVol>=250},
  {id:"walk_500",  e:"🚀",label:"500 Club",          desc:"500 km total distance",           tier:"gold",  check:s=>s.unit==="km"&&s.totalVol>=500},
  // ── 🚶 NEW: extended km milestones + single-session PBs
  {id:"walk_750",  e:"🌄",label:"750km",             desc:"750 km total distance",           tier:"gold",  check:s=>s.unit==="km"&&s.totalVol>=750},
  {id:"walk_1000", e:"🌍",label:"1000km Club",       desc:"1000 km total distance",          tier:"gold",  check:s=>s.unit==="km"&&s.totalVol>=1000},
  {id:"km_pb5",     e:"🏃",label:"5km Session",       desc:"5 km in one session",             tier:"bronze",check:s=>s.unit==="km"&&s.bestVal>=5},
  {id:"km_pb10",    e:"🎽",label:"10km Session",      desc:"10 km in one session",            tier:"silver",check:s=>s.unit==="km"&&s.bestVal>=10},
  // ── 🧗 NEW: single-session hang PBs (sec)
  {id:"hang_pb60",  e:"⏱️",label:"One Minute",       desc:"Single hang of 60 sec",           tier:"bronze",check:s=>s.unit==="sec"&&s.bestVal>=60},
  {id:"hang_pb90",  e:"🥋",label:"90 Seconds",       desc:"Single hang of 90 sec",           tier:"silver",check:s=>s.unit==="sec"&&s.bestVal>=90},
  {id:"hang_pb120", e:"🦅",label:"Two Minutes",      desc:"Single hang of 2 min",            tier:"silver",check:s=>s.unit==="sec"&&s.bestVal>=120},
  {id:"hang_pb180", e:"🏰",label:"Three Minutes",    desc:"Single hang of 3 min",            tier:"gold",  check:s=>s.unit==="sec"&&s.bestVal>=180},
  {id:"hang_pb300", e:"🌌",label:"Five Minutes",     desc:"Single hang of 5 min",            tier:"gold",  check:s=>s.unit==="sec"&&s.bestVal>=300},
  // ── 🏋️ NEW: reps unit milestones (squats, push-ups etc.) — brand new unit type
  {id:"reps_50",   e:"🌱",label:"50 Reps",           desc:"50 total reps logged",            tier:"bronze",check:s=>s.unit==="reps"&&s.totalVol>=50},
  {id:"reps_100",  e:"💯",label:"Century Reps",      desc:"100 total reps logged",           tier:"bronze",check:s=>s.unit==="reps"&&s.totalVol>=100},
  {id:"reps_250",  e:"🔥",label:"250 Reps",          desc:"250 total reps logged",           tier:"silver",check:s=>s.unit==="reps"&&s.totalVol>=250},
  {id:"reps_500",  e:"💪",label:"500 Reps",          desc:"500 total reps logged",           tier:"silver",check:s=>s.unit==="reps"&&s.totalVol>=500},
  {id:"reps_1000", e:"🏆",label:"1000 Reps",         desc:"1000 total reps logged",          tier:"gold",  check:s=>s.unit==="reps"&&s.totalVol>=1000},
  {id:"reps_2500", e:"🌟",label:"2500 Reps",         desc:"2500 total reps logged",          tier:"gold",  check:s=>s.unit==="reps"&&s.totalVol>=2500},
  {id:"reps_pb10", e:"🎯",label:"10 in a Row",       desc:"10 reps in one session",          tier:"bronze",check:s=>s.unit==="reps"&&s.bestVal>=10},
  {id:"reps_pb20", e:"⚡",label:"20 in a Row",       desc:"20 reps in one session",          tier:"silver",check:s=>s.unit==="reps"&&s.bestVal>=20},
  {id:"reps_pb30", e:"🦾",label:"30 in a Row",       desc:"30 reps in one session",          tier:"silver",check:s=>s.unit==="reps"&&s.bestVal>=30},
  {id:"reps_pb50", e:"🌋",label:"50 in a Row",       desc:"50 reps in one session",          tier:"gold",  check:s=>s.unit==="reps"&&s.bestVal>=50},
  // ── ⏱️ NEW: min unit milestones (strength training etc.)
  {id:"min_60",    e:"⏱️",label:"First Hour",        desc:"60 total minutes logged",         tier:"bronze",check:s=>s.unit==="min"&&s.totalVol>=60},
  {id:"min_300",   e:"🔥",label:"5 Hours",           desc:"300 total minutes logged",        tier:"bronze",check:s=>s.unit==="min"&&s.totalVol>=300},
  {id:"min_600",   e:"💪",label:"10 Hours",          desc:"600 total minutes logged",        tier:"silver",check:s=>s.unit==="min"&&s.totalVol>=600},
  {id:"min_pb30",  e:"🌱",label:"30 Min Session",    desc:"Single session of 30 min",        tier:"bronze",check:s=>s.unit==="min"&&s.bestVal>=30},
  {id:"min_pb45",  e:"🎯",label:"45 Min Session",    desc:"Single session of 45 min",        tier:"silver",check:s=>s.unit==="min"&&s.bestVal>=45},
];
const FAM_IDS=new Set(["fam_day","fam_10","fam_week","fam_trio"]);
// ── Get relevant badges for a member based on their actual activity units ─────
function getMemberBadges(member){
  const units = new Set((member.activities||[]).map(a=>a.unit));
  return BADGES.filter(b=>{
    if(FAM_IDS.has(b.id)) return false;
    // Prefix-based unit detection — most reliable
    if(b.id.startsWith("hang_")) return units.has("sec");
    if(b.id.startsWith("reps_")) return units.has("reps");
    if(b.id.startsWith("walk_")||b.id.startsWith("km_")) return units.has("km");
    if(b.id.startsWith("min_")) return units.has("min");
    return true; // generic badge — applies to everyone
  });
}
const TC={
  bronze:{bg:"#FDF0E0",bd:"#C97D3A",tx:"#7A4A1E",gl:"#C97D3A33"},
  silver:{bg:"#F0F4F8",bd:"#8A9BB0",tx:"#3A4A5E",gl:"#8A9BB033"},
  gold:  {bg:"#FFFAE0",bd:"#C9A800",tx:"#7A6200",gl:"#C9A80033"},
};

function computeStats(al,target){
  al=al||{};
  const today=todayStr();
  const entries=Object.entries(al).filter(([d])=>d<=today).sort(([a],[b])=>a.localeCompare(b));
  let totalDone=0,bestVal=0;
  for(const[,l]of entries) if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0){
    totalDone++;
    const sessionVals=l.sessions&&l.sessions.length>0?l.sessions:[l.value];
    const maxSession=Math.max(...sessionVals);
    if(maxSession>bestVal)bestVal=maxSession;
  }
  const bestPct=target>0?Math.round((bestVal/target)*100):0;
  const streak=streakCount(al);
  let bestPerf=0,cp=0;
  for(const[,l]of entries){
    if(l.status==="shielded"){cp=0;continue;} // shields break perfect streaks
    if(l.status!=="skipped"&&l.value>=target){cp++;if(cp>bestPerf)bestPerf=cp;}else cp=0;
  }
  const mons=[...new Set(entries.map(([d])=>d.slice(0,7)))];
  let bestMonPct=0,highMons=0;
  for(const ym of mons){const[y,m]=ym.split("-").map(Number);const p=consPct(al,y,m-1);if(p>bestMonPct)bestMonPct=p;if(p>=80)highMons++;}
  let trackDays=0;
  if(entries.length>0) trackDays=Math.round((new Date(today)-new Date(entries[0][0]))/86400000)+1;
  const wm={};
  for(const[ds,l]of entries){
    if(l.status==="skipped"||!l.value) continue;
    const d=new Date(ds+"T00:00:00");const dow=(d.getDay()+6)%7;
    const mon=new Date(d);mon.setDate(d.getDate()-dow);
    const wk=mon.toISOString().slice(0,10);
    wm[wk]=(wm[wk]||0)+1;
  }
  const wvals=Object.values(wm);const bestWeek=wvals.length?Math.max(...wvals):0;
  const wkeys=Object.keys(wm).sort();let consec5w=0,c5=0;
  for(const wk of wkeys){if(wm[wk]>=5){c5++;if(c5>consec5w)consec5w=c5;}else c5=0;}
  let comeback=false,lastL=null,gap=0,pg=0;
  for(const[ds,l]of entries){
    if(l.status==="skipped"||!l.value){
      if(lastL){const g=Math.round((new Date(ds)-new Date(lastL))/86400000);if(g>=7){gap=g;pg=0;}}
      continue;
    }
    if(gap>=7){pg++;if(pg>=3){comeback=true;break;}}
    lastL=ds;
  }
  let perfMon=false,perfSun=false,perfTue=false,perfThu=false;
  for(const ym of mons){
    const[y,m]=ym.split("-").map(Number);const dm=new Date(y,m,0).getDate();
    let am=true,hm=false,as_=true,hs=false,at=true,ht=false,ath=true,hth=false;
    for(let day=1;day<=dm;day++){
      const dt=new Date(y,m-1,day);const dow=dt.getDay();
      const key=`${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      if(key>today) continue;
      if(dow===1){hm=true;const l=al[key];if(!l||l.status==="skipped")am=false;}
      if(dow===0){hs=true;const l=al[key];if(!l||l.status==="skipped")as_=false;}
      if(dow===2){ht=true;const l=al[key];if(!l||l.status==="skipped")at=false;}
      if(dow===4){hth=true;const l=al[key];if(!l||l.status==="skipped")ath=false;}
    }
    if(hm&&am)perfMon=true;if(hs&&as_)perfSun=true;
    if(ht&&at)perfTue=true;if(hth&&ath)perfThu=true;
  }
  const wem={};
  for(const[ds,l]of entries){
    if(l.status==="skipped"||!l.value) continue;
    const d=new Date(ds+"T00:00:00");const dow=d.getDay();
    if(dow!==0&&dow!==6) continue;
    const sat=new Date(d);sat.setDate(d.getDate()-(dow===0?1:0));
    const wk=sat.toISOString().slice(0,10);
    if(!wem[wk])wem[wk]=new Set();wem[wk].add(dow);
  }
  const perfWknd=Object.values(wem).filter(s=>s.size===2).length;
  let overStreak=0,co=0,steadyStreak=0,cs=0;
  for(const[,l]of entries){
    if(l.status!=="skipped"&&l.value>=target*1.2){co++;if(co>overStreak)overStreak=co;}else co=0;
    const ok=l.status!=="skipped"&&l.value>=target*0.9&&l.value<=target*1.1;
    if(ok){cs++;if(cs>steadyStreak)steadyStreak=cs;}else cs=0;
  }
  let totalVol=0;
  for(const[,l]of entries) if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0) totalVol+=l.value;

  // Best days in a single calendar month
  let bestMonthDays=0;
  const allMonths=[...new Set(entries.map(([d])=>d.slice(0,7)))];
  for(const ym of allMonths){
    const[y,m]=ym.split("-").map(Number);
    let daysInMon=0;
    for(const[ds,l]of entries){
      if(ds.startsWith(ym)&&l.status!=="skipped"&&l.status!=="shielded"&&l.value>0) daysInMon++;
    }
    if(daysInMon>bestMonthDays) bestMonthDays=daysInMon;
  }

  // Best streak ever (not just current)
  let bestStreak=0,bsRun=0;
  for(const[,l]of entries){
    if(l.status!=="skipped"&&l.value>0){bsRun++;if(bsRun>bestStreak)bestStreak=bsRun;}
    else bsRun=0;
  }

  return{totalDone,bestVal,bestPct,streak,bestStreak,bestPerf,bestMonPct,highMons,hasPB:bestVal>target,
    bestWeek,consec5w,comeback,perfMon,perfSun,perfTue,perfThu,perfWknd,trackDays,overStreak,steadyStreak,
    totalVol,unit:"",bestMonthDays,famDays:0,famWeeks:0,famActive:false};
}

// ── Member-level stats for badges (handles alternating — any activity logged counts) ──
function computeMemberLevelStats(member, logs){
  const acts = member.activities || [];
  const today = todayStr();
  const sd = member.startDate || null;

  // Build a virtual combined log: one entry per day, reflecting whether
  // ANY activity was done/shielded/skipped that day — not per-activity.
  const allDatesSet = new Set();
  for(const a of acts){
    const al = getActivityLogs(logs, member.id, a.id);
    for(const d of Object.keys(al)) if(d <= today && (!sd || d >= sd)) allDatesSet.add(d);
  }
  const virtualAl = {};
  for(const d of allDatesSet){
    let anyDone=false, anyShielded=false, anySkipped=false;
    for(const a of acts){
      const l = getActivityLogs(logs, member.id, a.id)[d];
      if(!l) continue;
      if(l.status === "shielded") anyShielded = true;
      else if(l.status === "skipped") anySkipped = true;
      else if(l.value > 0) anyDone = true;
    }
    if(anyShielded) virtualAl[d] = {value:0, status:"shielded"};
    else if(anyDone) virtualAl[d] = {value:1, status:"done"}; // dummy value; target=1 makes it always "at target"
    else if(anySkipped) virtualAl[d] = {value:0, status:"skipped"};
  }

  const stats = computeStats(virtualAl, 1); // target=1 with dummy value=1 → presence/status is all that matters
  return {
    totalDone: stats.totalDone,
    bestStreak: stats.bestStreak,
    bestMonPct: stats.bestMonPct,
    highMons: stats.highMons,
    trackDays: stats.trackDays,
    bestWeek: stats.bestWeek,
    consec5w: stats.consec5w,
    comeback: stats.comeback,
    perfMon: stats.perfMon,
    perfSun: stats.perfSun,
    perfTue: stats.perfTue,
    perfThu: stats.perfThu,
    perfWknd: stats.perfWknd,
    bestMonthDays: stats.bestMonthDays,
  };
}

function computeFamStats(members,logs){
  if(!members||members.length<2) return{famDays:0,famWeeks:0,famActive:false};
  const today=todayStr();
  const sets=members.map(m=>{
    const s=new Set();
    for(const a of(m.activities||[])){
      const al=getActivityLogs(logs,m.id,a.id);
      for(const[d,l]of Object.entries(al)) if(d<=today&&l.status!=="skipped"&&l.value>0)s.add(d);
    }
    return s;
  });
  const famDays=[...sets[0]].filter(d=>sets.every(s=>s.has(d))).length;
  const wm={};
  for(const m of members){
    for(const a of(m.activities||[])){
      const al=getActivityLogs(logs,m.id,a.id);
      for(const[ds,l]of Object.entries(al)){
        if(ds>today||l.status==="skipped"||!l.value) continue;
        const d=new Date(ds+"T00:00:00");const dow=(d.getDay()+6)%7;
        const mon=new Date(d);mon.setDate(d.getDate()-dow);
        const wk=mon.toISOString().slice(0,10);
        if(!wm[wk])wm[wk]={};if(!wm[wk][m.id])wm[wk][m.id]=new Set();
        wm[wk][m.id].add(ds);
      }
    }
  }
  let famWeeks=0;
  for(const w of Object.values(wm)) if(members.every(m=>(w[m.id]?.size||0)>=5))famWeeks++;
  const famActive=members.every(m=>{
    let t=0;
    for(const a of(m.activities||[])){
      const al=getActivityLogs(logs,m.id,a.id);
      t+=Object.entries(al).filter(([d,l])=>d<=today&&l.status!=="skipped"&&l.value>0).length;
    }
    return t>=7;
  });
  return{famDays,famWeeks,famActive};
}

function earnedBadges(al,target,unit="",extra={}){
  const s={...computeStats(al,target),...extra,unit};
  return BADGES.filter(b=>!FAM_IDS.has(b.id)&&b.check(s)).map(b=>b.id);
}
function earnedFamBadges(members,logs){
  const fs=computeFamStats(members,logs);
  return BADGES.filter(b=>FAM_IDS.has(b.id)&&b.check({...fs}));
}

// ── Default data ──────────────────────────────────────────────────────────────
const DEF_MEMBERS=[
  {id:"son", name:"Son", emoji:"🧗",color:"#5B8FD4",activities:[{id:"son_act",name:"Passive Hang",unit:"sec",target:75}]},
  {id:"wife",name:"Wife",emoji:"🚶‍♀️",color:"#D47B9E",activities:[{id:"wife_act",name:"Walking",unit:"km",target:3}]},
];

// ── JSONBin Storage ───────────────────────────────────────────────────────────
const JSONBIN_BIN_ID  = import.meta.env.VITE_JSONBIN_BIN_ID;
const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY;
const JSONBIN_URL     = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
let _saveTimer=null;

async function loadData(){
  if(JSONBIN_BIN_ID&&JSONBIN_API_KEY){
    try{
      const res=await fetch(`${JSONBIN_URL}/latest`,{headers:{'X-Master-Key':JSONBIN_API_KEY,'X-Bin-Meta':'false'}});
      if(res.ok){
        const raw=await res.json();
        const d=migrateData(raw);
        try{localStorage.setItem("ff_data",JSON.stringify(d));}catch{}
        return d;
      }
    }catch{}
  }
  try{const r=localStorage.getItem("ff_data");if(r)return JSON.parse(r);}catch{}
  return null;
}
async function saveData(p){
  const s=JSON.stringify(p);
  try{localStorage.setItem("ff_data",s);}catch{}
  if(JSONBIN_BIN_ID&&JSONBIN_API_KEY){
    try{await fetch(JSONBIN_URL,{method:'PUT',headers:{'Content-Type':'application/json','X-Master-Key':JSONBIN_API_KEY},body:s});}catch{}
  }
}
function scheduleSave(p){clearTimeout(_saveTimer);_saveTimer=setTimeout(()=>saveData(p),800);}

// ── Shared styles ─────────────────────────────────────────────────────────────
const navBtn={background:"#FFFFFF",border:"1px solid #E8E4DC",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:16,color:"#1A1A1A"};
const iStyle={width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #E8E4DC",fontSize:13,color:"#1A1A1A",boxSizing:"border-box",outline:"none",background:"#F7F5F0"};
const lStyle={fontSize:11,color:"#8A8580",display:"block",marginBottom:4,fontWeight:600};

// ── ConsistencyBar ────────────────────────────────────────────────────────────
function ConsistencyBar({pct}){
  return <div style={{width:"100%",background:C.border,borderRadius:99,height:7,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${pct}%`,background:pct>=80?C.done:pct>=50?C.partial:C.missed,borderRadius:99,transition:"width 0.5s"}}/>
  </div>;
}

// ── Milestone Celebration Screen ─────────────────────────────────────────────
const MAJOR_MILESTONE_IDS = new Set([
  "streak_30","streak_60","streak_90",
  "days_100","days_200","days_365",
  "perfect_30","cons_100",
  "month_3","month_6","month_12",
  "hang_36000","walk_500",
  "mon_30","fam_trio",
  // PP level ups (levels 5+ get celebration, spread across all 40 levels)
  "pp_level_5","pp_level_7","pp_level_9","pp_level_11","pp_level_13",
  "pp_level_15","pp_level_17","pp_level_19","pp_level_21","pp_level_23",
  "pp_level_25","pp_level_27","pp_level_29","pp_level_31","pp_level_33",
  "pp_level_35","pp_level_37","pp_level_39","pp_level_40"
]);

function CelebrationScreen({badge, memberName, onClose}){
  const tc=TC[badge.tier];
  useEffect(()=>{
    const t=setTimeout(onClose,3800);
    return()=>clearTimeout(t);
  },[]);

  // Generate confetti pieces
  const confetti = Array.from({length:40},(_,i)=>({
    id:i,
    left:Math.random()*100,
    delay:Math.random()*0.6,
    duration:2+Math.random()*1.5,
    size:6+Math.random()*8,
    color:[tc.bd,"#FFD700","#3D9E6E","#5B8FD4","#D47B9E"][Math.floor(Math.random()*5)],
    rotate:Math.random()*360,
  }));

  return <div onClick={onClose} style={{
    position:"fixed",inset:0,zIndex:500,
    background:"rgba(0,0,0,0.55)",backdropFilter:"blur(2px)",
    display:"flex",alignItems:"center",justifyContent:"center",
    cursor:"pointer",animation:"fadeInOverlay 0.3s ease",
  }}>
    <style>{`
      @keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}
      @keyframes confettiFall{
        0%{transform:translateY(-20px) rotate(0deg);opacity:1}
        100%{transform:translateY(100vh) rotate(720deg);opacity:0.3}
      }
      @keyframes celebPopIn{
        0%{transform:scale(0.3) translateY(30px);opacity:0}
        60%{transform:scale(1.08) translateY(-6px);opacity:1}
        100%{transform:scale(1) translateY(0);opacity:1}
      }
      @keyframes crownBounce{
        0%,100%{transform:translateY(0)}
        50%{transform:translateY(-8px)}
      }
    `}</style>

    {/* Confetti */}
    {confetti.map(c=>(
      <div key={c.id} style={{
        position:"fixed",top:0,left:`${c.left}%`,
        width:c.size,height:c.size*0.6,
        background:c.color,borderRadius:2,
        animation:`confettiFall ${c.duration}s ${c.delay}s ease-in forwards`,
        transform:`rotate(${c.rotate}deg)`,
      }}/>
    ))}

    {/* Main card */}
    <div onClick={e=>e.stopPropagation()} style={{
      background:`linear-gradient(160deg, ${tc.bg}, #fff)`,
      border:`3px solid ${tc.bd}`,borderRadius:24,
      padding:"40px 36px",maxWidth:340,width:"90%",textAlign:"center",
      boxShadow:`0 20px 60px ${tc.gl}, 0 8px 24px rgba(0,0,0,0.15)`,
      animation:"celebPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{fontSize:64,marginBottom:8,animation:"crownBounce 1.2s ease-in-out infinite"}}>{badge.e}</div>
      <div style={{fontSize:12,fontWeight:800,color:tc.tx,letterSpacing:2,textTransform:"uppercase",opacity:0.7,marginBottom:6}}>
        {badge.tier} milestone!
      </div>
      <div style={{fontSize:24,fontWeight:900,color:tc.tx,marginBottom:6,lineHeight:1.2}}>
        {badge.label}
      </div>
      <div style={{fontSize:14,color:tc.tx,opacity:0.75,marginBottom:18,lineHeight:1.4}}>
        {memberName} just unlocked this!<br/>{badge.desc}
      </div>
      <div style={{fontSize:11,color:tc.tx,opacity:0.5}}>Tap anywhere to continue</div>
    </div>
  </div>;
}

// ── Badge Toast ───────────────────────────────────────────────────────────────
function Toast({badge,onDismiss}){
  const tc=TC[badge.tier];
  useEffect(()=>{const t=setTimeout(onDismiss,4000);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:300,
    background:tc.bg,border:`2px solid ${tc.bd}`,borderRadius:16,padding:"14px 22px",
    boxShadow:`0 8px 40px ${tc.gl}`,display:"flex",alignItems:"center",gap:14,minWidth:280,maxWidth:400}}>
    <span style={{fontSize:36}}>{badge.e}</span>
    <div style={{flex:1}}>
      <div style={{fontSize:11,fontWeight:700,color:tc.tx,letterSpacing:1,textTransform:"uppercase",opacity:0.7}}>{badge.tier} badge!</div>
      <div style={{fontSize:16,fontWeight:800,color:tc.tx}}>{badge.label}</div>
      <div style={{fontSize:12,color:tc.tx,opacity:0.7}}>{badge.desc}</div>
    </div>
    <button onClick={onDismiss} style={{background:"none",border:"none",fontSize:18,color:tc.tx,opacity:0.5,cursor:"pointer"}}>×</button>
  </div>;
}

// ── Multi-activity Log Modal ──────────────────────────────────────────────────
function LogModal({dateStr,member,logs,shieldsLeft,onSaveAll,onClose}){
  const displayDate=new Date(dateStr+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
  const isDecimal=(u)=>["km","miles","kg","hrs"].includes(u);

  // Build initial state — track per-activity: alreadySaved (logged before modal opened), editing, value, status
  const init=member.activities.map(a=>{
    const ex=getActivityLogs(logs,member.id,a.id)[dateStr];
    const alreadySaved=ex&&(ex.status==="done"||ex.status==="skipped"||ex.status==="shielded");
    return{
      actId:a.id,
      status:ex?.status??"done",
      value:ex?.value??a.target,
      originalValue:ex?.value??0, // snapshot of what was logged before this edit — used for "add session"
      sessions:ex?.sessions||null, // individual session values, if this day has more than one
      mode:"replace", // 'add' = sum onto existing, 'replace' = overwrite (default for fresh entries)
      alreadySaved:!!alreadySaved,
      editing:false, // true when user taps edit on an already-saved activity
    };
  });
  const[entries,setEntries]=useState(init);
  const upd=(id,f,v)=>setEntries(p=>p.map(e=>e.actId===id?{...e,[f]:v}:e));
  const startEdit=(id)=>setEntries(p=>p.map(e=>{
    if(e.actId!==id) return e;
    // Only offer "add session" for done activities with a real logged value — not skipped/shielded
    const canAdd = e.status==="done" && e.originalValue>0;
    return{...e, editing:true, mode:canAdd?"add":"replace", value:canAdd?0:e.originalValue};
  }));
  const switchMode=(id,mode)=>setEntries(p=>p.map(e=>{
    if(e.actId!==id) return e;
    return{...e, mode, value:mode==="replace"?e.originalValue:0};
  }));
  const saveSingle=(actId)=>{
    // Save just this one activity, keeping others as-is
    const entry=entries.find(e=>e.actId===actId);
    if(!entry) return;
    const act=member.activities.find(a=>a.id===actId);
    const isAdding = entry.mode==="add" && entry.status==="done";
    const finalValue = isAdding ? (entry.originalValue||0) + (entry.value||0) : entry.value;
    // Track individual sessions so PB detection can tell "170 total" apart from "a genuine 110 single session"
    let sessions;
    if(isAdding){
      const ex=getActivityLogs(logs,member.id,actId)[dateStr];
      const priorSessions = ex?.sessions || (ex?.value>0 ? [ex.value] : []);
      sessions = [...priorSessions, entry.value||0];
    } else if(entry.status==="done"){
      sessions = undefined; // "Correct Total" resets to a clean single authoritative value
    }
    // Build full entries array — for unsaved activities, pass their current logged value or skip
    const toSave=member.activities.map(a=>{
      if(a.id===actId) return{actId:a.id,value:finalValue,status:entry.status,target:a.target,sessions};
      // For other activities, use whatever is already logged (if anything)
      const ex=getActivityLogs(logs,member.id,a.id)[dateStr];
      if(ex) return{actId:a.id,value:ex.value,status:ex.status,target:a.target,sessions:ex.sessions};
      return null; // not yet logged, don't touch
    }).filter(Boolean);
    onSaveAll(toSave);
    // Mark as saved in local state, updating originalValue to the new total for any future "add"
    setEntries(p=>p.map(e=>e.actId===actId?{...e,value:finalValue,originalValue:finalValue,sessions:sessions||null,alreadySaved:true,editing:false,mode:"replace"}:e));
  };

  const deleteSession=(actId,sessionIdx)=>{
    const entry=entries.find(e=>e.actId===actId);
    if(!entry||!entry.sessions) return;
    const act=member.activities.find(a=>a.id===actId);
    const newSessions=entry.sessions.filter((_,i)=>i!==sessionIdx);
    const newValue=newSessions.reduce((s,v)=>s+v,0);
    const finalSessions=newSessions.length>1?newSessions:undefined; // collapse back to plain value if only one left
    const toSave=member.activities.map(a=>{
      if(a.id===actId) return{actId:a.id,value:newValue,status:newValue>0?"done":"skipped",target:a.target,sessions:finalSessions};
      const ex=getActivityLogs(logs,member.id,a.id)[dateStr];
      if(ex) return{actId:a.id,value:ex.value,status:ex.status,target:a.target,sessions:ex.sessions};
      return null;
    }).filter(Boolean);
    onSaveAll(toSave);
    setEntries(p=>p.map(e=>e.actId===actId?{...e,value:newValue,originalValue:newValue,sessions:finalSessions||null,status:newValue>0?"done":"skipped"}:e));
  };

  const allSaved=entries.every(e=>e.alreadySaved);
  const noneSaved=entries.every(e=>!e.alreadySaved);

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:18,padding:24,width:"100%",maxWidth:360,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:26}}>{member.emoji}</span>
        <div><div style={{fontWeight:700,fontSize:16}}>{member.name}</div><div style={{fontSize:12,color:C.muted}}>{displayDate}</div></div>
      </div>

      {member.activities.map((act,i)=>{
        const en=entries.find(e=>e.actId===act.id);
        if(!en) return null;
        const isActive=!en.alreadySaved||en.editing;

        return <div key={act.id}>
          {/* Already saved — show as greyed summary with Edit button */}
          {!isActive ? (
            <div style={{padding:"10px 12px",background:C.bg,borderRadius:10,marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16,color:en.status==="skipped"?C.missed:C.done}}>
                    {en.status==="skipped"?"✗":"✓"}
                  </span>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:C.text}}>{act.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {en.status==="skipped"?"Skipped":en.status==="shielded"?"Shielded":`${en.value} ${act.unit}${en.sessions&&en.sessions.length>1?` (${en.sessions.length} sessions)`:""}`}
                    </div>
                  </div>
                </div>
                <button onClick={()=>startEdit(act.id)} style={{background:"none",border:`1px solid ${C.border}`,
                  borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,color:C.muted}}>
                  Edit
                </button>
              </div>
              {/* Session breakdown with per-session delete */}
              {en.sessions&&en.sessions.length>1&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:4}}>
                {en.sessions.map((sv,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:C.muted}}>
                    <span>Session {i+1}: <strong style={{color:C.text}}>{sv} {act.unit}</strong></span>
                    <button onClick={()=>deleteSession(act.id,i)} style={{background:"none",border:"none",
                      color:C.missed,cursor:"pointer",fontSize:11,fontWeight:600,padding:"2px 6px"}}>Remove</button>
                  </div>
                ))}
              </div>}
            </div>
          ) : (
            /* Active — show full input */
            <div style={{border:`1.5px solid ${member.color}33`,borderRadius:12,padding:"12px 14px",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{act.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>Target: {act.target} {act.unit}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>upd(act.id,"status","done")}
                    style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${en.status==="done"?member.color:C.border}`,
                    background:en.status==="done"?member.color:"transparent",color:en.status==="done"?"#fff":C.muted,
                    fontWeight:600,cursor:"pointer",fontSize:12}}>✓ Done</button>
                  <button onClick={()=>upd(act.id,"status","skipped")}
                    style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${en.status==="skipped"?C.missed:C.border}`,
                    background:en.status==="skipped"?C.missed:"transparent",color:en.status==="skipped"?"#fff":C.muted,
                    fontWeight:600,cursor:"pointer",fontSize:12}}>✗ Skip</button>
                </div>
              </div>

              {/* Add-session vs replace-total mode toggle — only shown when there's an existing logged value */}
              {en.status==="done"&&en.alreadySaved&&en.originalValue>0&&<div style={{display:"flex",gap:6,marginBottom:10}}>
                <button onClick={()=>switchMode(act.id,"add")} style={{flex:1,padding:"6px 0",borderRadius:7,
                  border:`1.5px solid ${en.mode==="add"?member.color:C.border}`,
                  background:en.mode==="add"?member.color+"15":"none",
                  color:en.mode==="add"?member.color:C.muted,cursor:"pointer",fontWeight:600,fontSize:11}}>
                  ➕ Add Session
                </button>
                <button onClick={()=>switchMode(act.id,"replace")} style={{flex:1,padding:"6px 0",borderRadius:7,
                  border:`1.5px solid ${en.mode==="replace"?member.color:C.border}`,
                  background:en.mode==="replace"?member.color+"15":"none",
                  color:en.mode==="replace"?member.color:C.muted,cursor:"pointer",fontWeight:600,fontSize:11}}>
                  ✏️ Correct Total
                </button>
              </div>}

              {en.status==="done"&&en.mode==="add"&&en.originalValue>0&&<div style={{fontSize:11,color:C.muted,marginBottom:6}}>
                Already logged: <strong style={{color:C.text}}>{en.originalValue} {act.unit}</strong> today
              </div>}

              {en.status==="done"&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <input type="number" min={0} step={isDecimal(act.unit)?0.1:1}
                  value={en.value} onChange={e=>upd(act.id,"value",parseFloat(e.target.value)||0)}
                  placeholder={en.mode==="add"?"e.g. this session's amount":undefined}
                  style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,
                  fontSize:20,fontWeight:700,outline:"none",background:"#fff"}}/>
                <span style={{fontSize:13,color:C.muted,fontWeight:600,minWidth:36}}>{act.unit}</span>
              </div>}

              {en.status==="done"&&en.mode==="add"&&en.originalValue>0&&<div style={{fontSize:12,color:member.color,fontWeight:600,marginBottom:10}}>
                New total: {(en.originalValue||0)+(en.value||0)} {act.unit}
              </div>}

              <button onClick={()=>saveSingle(act.id)} style={{width:"100%",padding:"9px 0",borderRadius:8,
                border:"none",background:member.color,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>
                {en.mode==="add"&&en.originalValue>0?`➕ Add to ${act.name}`:`Save ${act.name}`}
              </button>
            </div>
          )}
          {i<member.activities.length-1&&<div style={{height:8}}/>}
        </div>;
      })}

      {/* Footer buttons */}
      <div style={{display:"flex",gap:8,marginTop:16}}>
        {noneSaved&&<button onClick={()=>setEntries(p=>p.map(e=>({...e,status:"skipped"})))}
          style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,
          background:"none",cursor:"pointer",fontWeight:600,color:C.muted,fontSize:13}}>Skip all</button>}
        <button onClick={onClose}
          style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,
          background:"none",cursor:"pointer",fontWeight:600,color:C.muted}}>
          {allSaved?"Done":"Cancel"}
        </button>
        {!allSaved&&<button onClick={()=>onSaveAll(entries.map(e=>{
          const act=member.activities.find(a=>a.id===e.actId);
          const finalValue = (e.mode==="add" && e.status==="done") ? (e.originalValue||0)+(e.value||0) : e.value;
          return{actId:e.actId,value:finalValue,status:e.status,target:act?.target};
        }))} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",
          background:member.color,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>Save all</button>}
      </div>

      {/* Shield option */}
      {shieldsLeft>0&&!allSaved&&<div style={{marginTop:10,padding:"10px 14px",background:"#E3F2FD",
        border:"1.5px solid #90CAF9",borderRadius:10,display:"flex",alignItems:"center",
        justifyContent:"space-between",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:13,color:"#1565C0"}}>🛡️ Use a shield</div>
          <div style={{fontSize:11,color:"#1976D2"}}>{shieldsLeft} of 4 remaining this month · Protects your streak</div>
        </div>
        <button onClick={()=>onSaveAll(entries.map(e=>({...e,status:"shielded",value:0})))}
          style={{background:"#1976D2",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",
          cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>Use shield</button>
      </div>}
    </div>
  </div>;
}

// ── Alternating Log Modal (pick one or more activities) ──────────────────────
function AlternatingLogModal({dateStr,member,logs,shieldsLeft,onSaveAll,onClose}){
  const displayDate=new Date(dateStr+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
  const acts=member.activities||[];

  // Build initial state
  const init=acts.map(a=>{
    const ex=getActivityLogs(logs,member.id,a.id)[dateStr];
    return{actId:a.id,selected:ex&&ex.status!=="skipped"&&ex.status!=="shielded",status:ex?.status??"none",value:ex?.value??a.target};
  });
  const[entries,setEntries]=useState(init);
  const[isRest,setIsRest]=useState(init.every(e=>e.status==="skipped"));

  const toggleAct=(actId)=>{
    setIsRest(false);
    setEntries(p=>p.map(e=>e.actId===actId?{...e,selected:!e.selected,status:!e.selected?"done":"none"}:e));
  };
  const updVal=(actId,val)=>setEntries(p=>p.map(e=>e.actId===actId?{...e,value:val}:e));
  const isDecimal=(u)=>["km","miles","kg","hrs"].includes(u);
  const anySelected=entries.some(e=>e.selected);

  const handleSave=()=>{
    const result=acts.map(a=>{
      const en=entries.find(e=>e.actId===a.id);
      if(isRest) return{actId:a.id,value:0,status:"skipped",target:a.target};
      if(en?.selected) return{actId:a.id,value:en.value,status:"done",target:a.target};
      return{actId:a.id,value:0,status:"skipped",target:a.target};
    });
    onSaveAll(result);
  };

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:18,padding:24,width:"100%",maxWidth:360,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:26}}>{member.emoji}</span>
        <div><div style={{fontWeight:700,fontSize:16}}>{member.name}</div><div style={{fontSize:12,color:C.muted}}>{displayDate}</div></div>
      </div>

      {/* Activity selector */}
      <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10,letterSpacing:0.3}}>WHAT DID YOU DO TODAY?</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {acts.map(a=>{
          const en=entries.find(e=>e.actId===a.id);
          const selected=en?.selected&&!isRest;
          return <div key={a.id}>
            <div onClick={()=>toggleAct(a.id)} style={{
              display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
              borderRadius:10,border:`2px solid ${selected?member.color:C.border}`,
              background:selected?member.color+"0F":"transparent",cursor:"pointer",
              transition:"all 0.15s",
            }}>
              <div style={{
                width:22,height:22,borderRadius:"50%",flexShrink:0,
                background:selected?member.color:C.border,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {selected&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:C.text}}>{a.name}</div>
                <div style={{fontSize:11,color:C.muted}}>Target: {a.target} {a.unit}</div>
              </div>
            </div>
            {/* Value input when selected */}
            {selected&&<div style={{display:"flex",alignItems:"center",gap:10,background:member.color+"0D",borderRadius:"0 0 10px 10px",padding:"10px 14px",marginTop:-4}}>
              <input type="number" min={0} step={isDecimal(a.unit)?0.1:1}
                value={en.value} onChange={e=>updVal(a.id,parseFloat(e.target.value)||0)}
                style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:20,fontWeight:700,outline:"none",background:"#fff"}}/>
              <span style={{fontSize:13,color:C.muted,fontWeight:600,minWidth:28}}>{a.unit}</span>
            </div>}
          </div>;
        })}

        {/* Rest day option */}
        <div onClick={()=>{setIsRest(r=>!r);if(!isRest)setEntries(p=>p.map(e=>({...e,selected:false})));}} style={{
          display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
          borderRadius:10,border:`2px solid ${isRest?C.missed:C.border}`,
          background:isRest?C.missed+"0F":"transparent",cursor:"pointer",transition:"all 0.15s",
        }}>
          <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:isRest?C.missed:C.border,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isRest&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
          </div>
          <div>
            <div style={{fontWeight:600,fontSize:14,color:C.text}}>Rest day</div>
            <div style={{fontSize:11,color:C.muted}}>Skip today — streak will break</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",cursor:"pointer",fontWeight:600,color:C.muted}}>Cancel</button>
        <button onClick={handleSave} disabled={!anySelected&&!isRest} style={{
          flex:2,padding:"10px 0",borderRadius:8,border:"none",
          background:(!anySelected&&!isRest)?C.border:member.color,
          color:"#fff",cursor:(!anySelected&&!isRest)?"not-allowed":"pointer",fontWeight:700,fontSize:14,
        }}>Save</button>
      </div>

      {/* Shield option */}
      {shieldsLeft>0&&<div style={{marginTop:10,padding:"10px 14px",background:"#E3F2FD",border:"1.5px solid #90CAF9",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:13,color:"#1565C0"}}>🛡️ Use a shield</div>
          <div style={{fontSize:11,color:"#1976D2"}}>{shieldsLeft} of 4 remaining · Protects your streak</div>
        </div>
        <button onClick={()=>onSaveAll(acts.map(a=>({actId:a.id,value:0,status:"shielded",target:a.target})))} style={{background:"#1976D2",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>Use shield</button>
      </div>}
    </div>
  </div>;
}

// ── Calendar Cell ─────────────────────────────────────────────────────────────
function CalCell({dateStr,member,logs,isToday,onClick,ppByDate}){
  const future=isFuture(dateStr)||(member.startDate&&dateStr<member.startDate);
  const status=future?"future":dayStatus(member,logs,dateStr);
  const bg={future:"transparent",empty:C.empty,skipped:C.missed,done:C.done,shielded:"#BBDEFB"}[status]||C.empty;

  const acts=member.activities||[];
  let aboveTarget=false;
  let isPB=false;
  let displayVal=null;
  const tooltipLines=[];
  if(!future&&status==="done"&&acts.length>0){
    for(const a of acts){
      const al=getActivityLogs(logs,member.id,a.id);
      const l=al[dateStr];
      if(l&&l.status!=="skipped"&&l.value>0){
        const effectiveTarget=l.target||a.target;
        if(l.value>effectiveTarget){
          aboveTarget=true;
          if(acts.length===1) displayVal=`${l.value}${a.unit}`;
        }
        const sessionVals=l.sessions&&l.sessions.length>0?l.sessions:[l.value];
        const maxSessionToday=Math.max(...sessionVals);
        const best=allTimeBest(al);
        if(maxSessionToday===best&&maxSessionToday>effectiveTarget){
          isPB=true;
          tooltipLines.push(`🏆 PB: ${maxSessionToday}${a.unit} (${a.name})`);
        } else {
          tooltipLines.push(`${a.name}: ${l.value}${a.unit}`);
        }
      }
    }
  }
  if(status==="skipped") tooltipLines.push("❌ Skipped");
  if(status==="shielded") tooltipLines.push("🛡️ Shielded");
  const dayPP = ppByDate&&ppByDate[dateStr];
  if(dayPP!==undefined&&dayPP!==0){
    const isMystery = isMysteryBonusDay(member.id, dateStr);
    tooltipLines.push(`⚡ ${dayPP>0?"+":""}${dayPP.toLocaleString()} PP${isMystery?" 🎁 2x Mystery!":""}`);
  }

  const borderColor = aboveTarget?"#C9A800":isToday?member.color:C.border;
  const borderWidth = aboveTarget||isToday?"2px":"1px";
  const bgColor = aboveTarget?"#2E8B57":bg;

  const[showTip,setShowTip]=useState(false);

  return <div onClick={()=>!future&&onClick(dateStr)} style={{
    background:bgColor,border:`${borderWidth} solid ${borderColor}`,
    borderRadius:7,minHeight:46,cursor:future?"default":"pointer",
    opacity:future?0.3:1,display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",gap:1,
    transition:"transform 0.1s",position:"relative",
  }}
  onMouseEnter={e=>{if(!future){e.currentTarget.style.transform="scale(1.07)";setShowTip(true);}}}
  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";setShowTip(false);}}>
    {status==="shielded"&&<span style={{fontSize:16}}>🛡️</span>}
    {isPB&&<span style={{position:"absolute",top:1,right:2,fontSize:9,lineHeight:1}}>👑</span>}
    {!isPB&&aboveTarget&&<span style={{position:"absolute",top:2,right:3,fontSize:8,lineHeight:1}}>⭐</span>}
    <span style={{fontSize:10,color:status==="empty"||future?C.muted:"#fff",fontWeight:600}}>
      {new Date(dateStr+"T00:00:00").getDate()}
    </span>
    {(isPB||displayVal)&&<span style={{fontSize:8,color:"rgba(255,255,255,0.9)",fontWeight:700,lineHeight:1}}>
      {isPB?`PB ${displayVal||""}`:displayVal}
    </span>}
    {showTip&&tooltipLines.length>0&&<div style={{
      position:"absolute",bottom:"110%",left:"50%",transform:"translateX(-50%)",
      background:"rgba(20,20,20,0.92)",color:"#fff",borderRadius:8,padding:"6px 10px",
      fontSize:10,whiteSpace:"nowrap",zIndex:100,pointerEvents:"none",
      boxShadow:"0 4px 12px rgba(0,0,0,0.3)",lineHeight:1.6,
    }}>
      {tooltipLines.map((l,i)=><div key={i}>{l}</div>)}
      <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",
        width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",
        borderTop:"5px solid rgba(20,20,20,0.92)"}}/>
    </div>}
  </div>;
}


// ── Badge Drawer ──────────────────────────────────────────────────────────────
function BadgeDrawer({member, allEarned, acts, logs, onClose}){
  const personalBadges = getMemberBadges(member);
  const earnedList     = personalBadges.filter(b=>allEarned.has(b.id));
  const lockedList     = personalBadges.filter(b=>!allEarned.has(b.id));

  // Compute "next up" — locked badges with computable progress
  function getProgress(badge){
    // Only for volume/streak/days badges that have numeric thresholds
    const s = badge.check.toString();
    // Extract threshold from check function e.g. s=>s.streak>=7
    const streakM   = s.match(/s\.bestStreak>=([\d]+)/);
    const daysM     = s.match(/s\.totalDone>=([\d]+)/);
    const trackM    = s.match(/s\.trackDays>=([\d]+)/);
    const weekM     = s.match(/s\.bestWeek>=([\d]+)/);
    const perfM     = s.match(/s\.bestPerf>=([\d]+)/);
    const volSecM   = s.match(/s\.unit==="sec"&&s\.totalVol>=([\d]+)/);
    const volKmM    = s.match(/s\.unit==="km"&&s\.totalVol>=([\d.]+)/);

    // Compute current values across all activities
    const today = todayStr();
    let curStreak=0, curDays=0, curTrack=0, curWeek=0, curPerf=0, curVolSec=0, curVolKm=0;
    for(const a of acts){
      const al = getActivityLogs(logs, member.id, a.id);
      const entries = Object.entries(al).filter(([d])=>d<=today).sort(([x],[y])=>x.localeCompare(y));
      const sc = streakCount(al);
      if(sc>curStreak) curStreak=sc;
      const done = entries.filter(([,l])=>l.status!=="skipped"&&l.value>0);
      curDays += done.length;
      if(entries.length>0){
        const td = Math.round((new Date(today)-new Date(entries[0][0]))/86400000)+1;
        if(td>curTrack) curTrack=td;
      }
      // Best week
      const wm={};
      for(const[ds,l]of entries){
        if(l.status==="skipped"||!l.value) continue;
        const d=new Date(ds+"T00:00:00"); const dow=(d.getDay()+6)%7;
        const mon=new Date(d); mon.setDate(d.getDate()-dow);
        const wk=mon.toISOString().slice(0,10);
        wm[wk]=(wm[wk]||0)+1;
      }
      const wv=Object.values(wm); if(wv.length&&Math.max(...wv)>curWeek) curWeek=Math.max(...wv);
      // Best perfect streak
      let bp=0,cp=0;
      for(const[,l]of entries){if(l.status!=="skipped"&&l.value>=a.target){cp++;if(cp>bp)bp=cp;}else cp=0;}
      if(bp>curPerf) curPerf=bp;
      // Volume
      if(a.unit==="sec") for(const[,l]of done) curVolSec+=l.value;
      if(a.unit==="km")  for(const[,l]of done) curVolKm+=l.value;
    }

    if(streakM){
      // For bestStreak, compute best historical streak across activities
      let best=0,run=0;
      for(const a of acts){
        const al=getActivityLogs(logs,member.id,a.id);
        const es=Object.entries(al).filter(([d])=>d<=today).sort(([x],[y])=>x.localeCompare(y));
        let r=0;
        for(const[,l]of es){if(l.status!=="skipped"&&l.value>0){r++;if(r>best)best=r;}else r=0;}
      }
      return {cur:best, max:parseInt(streakM[1]), label:"day streak"};
    }
    if(daysM)   return {cur:curDays,   max:parseInt(daysM[1]),   label:"days logged"};
    if(trackM)  return {cur:curTrack,  max:parseInt(trackM[1]),  label:"days tracking"};
    if(weekM)   return {cur:curWeek,   max:parseInt(weekM[1]),   label:"days in a week"};
    if(perfM)   return {cur:curPerf,   max:parseInt(perfM[1]),   label:"days at target"};
    if(volSecM){const sec=parseInt(volSecM[1]);return {cur:curVolSec,max:sec,label:`sec (${Math.round(sec/60)}min)`};}
    if(volKmM) {const km=parseFloat(volKmM[1]);return {cur:Math.round(curVolKm*10)/10,max:km,label:"km"};}
    return null;
  }

  const nextUp = lockedList
    .map(b=>({b, prog:getProgress(b)}))
    .filter(x=>x.prog&&x.prog.cur>0)
    .sort((a,b)=>(b.prog.cur/b.prog.max)-(a.prog.cur/a.prog.max))
    .slice(0,5);

  const tierOrder={bronze:0,silver:1,gold:2};

  return <>
    {/* Overlay */}
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    {/* Drawer */}
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(480px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Drawer header */}
      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>{member.emoji}</span>
            <div>
              <div style={{fontWeight:800,fontSize:18}}>{member.name}</div>
              <div style={{fontSize:12,color:C.muted}}>Achievement progress</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
            padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted,lineHeight:1}}>×</button>
        </div>
        {/* Hero stat */}
        <div style={{display:"flex",gap:12}}>
          {[
            {label:"Earned",val:earnedList.length,color:C.done},
            {label:"Locked",val:lockedList.length,color:C.muted},
            {label:"Total",val:personalBadges.length,color:C.text},
          ].map(x=><div key={x.label} style={{flex:1,background:C.bg,borderRadius:10,padding:"10px 0",textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:22,color:x.color}}>{x.val}</div>
            <div style={{fontSize:11,color:C.muted}}>{x.label}</div>
          </div>)}
        </div>
        {/* Progress bar */}
        <div style={{marginTop:12,background:C.border,borderRadius:99,height:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.round((earnedList.length/personalBadges.length)*100)}%`,
            background:C.done,borderRadius:99,transition:"width 0.6s"}}/>
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:4,textAlign:"right"}}>
          {Math.round((earnedList.length/personalBadges.length)*100)}% complete
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",padding:"0 24px 24px"}}>

        {/* Coming up next */}
        {nextUp.length>0&&<div style={{marginTop:20}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:12}}>🔜 COMING UP NEXT</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {nextUp.map(({b,prog})=>{
              const tc=TC[b.tier];
              const pct=Math.min(100,Math.round((prog.cur/prog.max)*100));
              return <div key={b.id} style={{background:tc.bg,border:`1.5px solid ${tc.bd}`,borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:22}}>{b.e}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:tc.tx}}>{b.label}</div>
                    <div style={{fontSize:11,color:tc.tx,opacity:0.7}}>{b.desc}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:800,color:tc.tx}}>{pct}%</div>
                </div>
                <div style={{background:"rgba(0,0,0,0.08)",borderRadius:99,height:5,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:tc.bd,borderRadius:99,transition:"width 0.5s"}}/>
                </div>
                <div style={{fontSize:10,color:tc.tx,opacity:0.6,marginTop:4}}>
                  {prog.cur} / {prog.max} {prog.label}
                </div>
              </div>;
            })}
          </div>
        </div>}

        {/* Earned badges */}
        {earnedList.length>0&&<div style={{marginTop:24}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:12}}>🏆 EARNED ({earnedList.length})</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[...earnedList].sort((a,b)=>tierOrder[b.tier]-tierOrder[a.tier]).map(b=>{
              const tc=TC[b.tier];
              return <div key={b.id} style={{background:tc.bg,border:`1.5px solid ${tc.bd}`,borderRadius:12,padding:"12px 14px",
                display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:24,flexShrink:0}}>{b.e}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:tc.tx,textTransform:"uppercase",letterSpacing:0.3,opacity:0.6}}>{b.tier}</div>
                  <div style={{fontSize:13,fontWeight:700,color:tc.tx,lineHeight:1.3}}>{b.label}</div>
                  <div style={{fontSize:10,color:tc.tx,opacity:0.6,marginTop:1,lineHeight:1.3}}>{b.desc}</div>
                </div>
              </div>;
            })}
          </div>
        </div>}

        {/* Locked badges */}
        {lockedList.length>0&&<div style={{marginTop:24}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:12}}>🔒 LOCKED ({lockedList.length})</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {lockedList.map(b=><div key={b.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",
              display:"flex",alignItems:"center",gap:10,opacity:0.5,filter:"grayscale(1)"}}>
              <span style={{fontSize:24,flexShrink:0}}>{b.e}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.3}}>{b.tier}</div>
                <div style={{fontSize:13,fontWeight:700,color:C.muted,lineHeight:1.3}}>{b.label}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:1,lineHeight:1.3}}>{b.desc}</div>
              </div>
            </div>)}
          </div>
        </div>}
      </div>
    </div>
  </>;
}

// ── Power Points Drawer ──────────────────────────────────────────────────────
// ── Power Points Panel (in-flow, tabbed — sits beside the card via flexbox, never fixed/floating) ──
function PowerPointsPanel({member, logs, onClose}){
  const {total, breakdown, weekPP, levelHistory, dailyEarned, dailyTags} = computePowerPoints(member, logs);
  const projection = projectNextLevel(member, logs);
  const level = getLevel(total);
  const nextLevel = getNextLevel(total);
  const pct = nextLevel ? Math.round(((total - level.pp) / (nextLevel.pp - level.pp)) * 100) : 100;
  const [tab, setTab] = useState("overview"); // overview | history | info
  const [showLevels, setShowLevels] = useState(false);

  // Build complete level crossing dates — fill gaps via cumulative daily sum
  const completeLevelDates = {};
  for(const h of levelHistory) completeLevelDates[h.level] = h.date;

  // Build a merged daily PP map that includes egg bonuses per day
  const eggLogsForDates = getEggLogs(logs, member.id);
  const allDailyPP = {...dailyEarned};
  for(const [d, count] of Object.entries(eggLogsForDates)){
    allDailyPP[d] = (allDailyPP[d]||0) + (count||0)*1000;
  }
  const sortedDailyDates = Object.keys(allDailyPP).sort();
  let running = 100;
  for(const d of sortedDailyDates){
    running += (allDailyPP[d]||0);
    for(const l of PP_LEVELS){
      if(!completeLevelDates[l.level] && running>=l.pp) completeLevelDates[l.level] = d;
    }
  }


  const earnedLevels = PP_LEVELS.filter(l => total >= l.pp);
  const lockedLevels = PP_LEVELS.filter(l => total < l.pp);

  const TAG_INFO = {
    pb:{icon:"🌟",label:"PB"}, above:{icon:"💪",label:"Above"}, at:{icon:"✅",label:"At target"},
    below:{icon:"📉",label:"Below"}, shielded:{icon:"🛡️",label:"Shielded"}, skipped:{icon:"❌",label:"Skipped"},
    mystery:{icon:"🎁",label:"Mystery"}, egg:{icon:"🥚",label:"Egg"},
    gk:{icon:"🧠",label:"GK Quiz"}, gkWeekend:{icon:"🏆",label:"Weekly Review"},
    bravery:{icon:"🦁",label:"Bravery"}, extraSession:{icon:"➕",label:"Extra Session"},
  };

  return <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,
    boxShadow:"0 4px 20px rgba(0,0,0,0.08)",overflow:"hidden",display:"flex",flexDirection:"column",
    maxHeight:"calc(100vh - 40px)",position:"sticky",top:20}}>

    {/* Header */}
    <div style={{padding:"16px 18px",background:"linear-gradient(135deg,#1a1a2e,#16213e)",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{member.emoji}</span>
          <span style={{fontWeight:700,fontSize:14,color:"#fff"}}>{member.name}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setShowLevels(true)} style={{background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,
              padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.6)"}}>📖 Levels</button>
            <button onClick={onClose} style={{background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,
              padding:"4px 8px",cursor:"pointer",fontSize:15,color:"rgba(255,255,255,0.6)"}}>×</button>
          </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{fontSize:26,fontWeight:900,color:"#FFD700",lineHeight:1}}>{total.toLocaleString()}</div>
          {weekPP>0&&<div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>+{weekPP.toLocaleString()} this week</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:22}}>{level.icon}</div>
          <div style={{fontSize:12,fontWeight:700,color:"#FFD700"}}>{level.title}</div>
        </div>
      </div>
      {nextLevel && <>
        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:99,height:6,overflow:"hidden",marginBottom:4}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#FFD700,#FFA500)",borderRadius:99}}/>
        </div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{(nextLevel.pp-total).toLocaleString()} PP to {nextLevel.icon} {nextLevel.title}</div>
      </>}
    </div>

    {/* Levels sub-view — replaces tabs+content when open */}
    {showLevels ? <>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={()=>setShowLevels(false)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,
          padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.muted}}>← Back</button>
        <span style={{fontWeight:700,fontSize:13}}>📖 All {PP_LEVELS.length} Levels</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 12px 16px"}}>
        {PP_LEVELS.map((l)=>{
          const isCur = l.level===level.level, isEarned = total>=l.pp;
          const dateStr = completeLevelDates[l.level];
          const dateLabel = dateStr ? new Date(dateStr+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : null;
          return <div key={l.level} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
            background:isCur?"#1a1a2e":"transparent",borderRadius:8,marginBottom:3,
            opacity:isEarned?1:0.35,
            border:`1px solid ${isCur?"#FFD700":"transparent"}`}}>
            <span style={{fontSize:10,fontWeight:700,color:isCur?"#FFD700":C.muted,minWidth:18,textAlign:"right"}}>{l.level}</span>
            <span style={{fontSize:14,minWidth:22}}>{l.icon}</span>
            <span style={{flex:1,fontSize:12,fontWeight:isCur?700:500,color:isCur?"#FFD700":C.text}}>{l.title}</span>
            <span style={{fontSize:9,color:isCur?"rgba(255,255,255,0.4)":C.muted,textAlign:"right"}}>
              {l.pp.toLocaleString()} PP
              {isEarned&&dateLabel&&<span style={{display:"block"}}>{dateLabel}</span>}
            </span>
          </div>;
        })}
      </div>
    </> : <>
    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
      {[{id:"overview",label:"Overview"},{id:"history",label:"History"},{id:"info",label:"Info"}].map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{
          flex:1,padding:"10px 0",border:"none",borderBottom:`2px solid ${tab===t.id?"#FFD700":"transparent"}`,
          background:"none",cursor:"pointer",fontWeight:tab===t.id?700:500,fontSize:12,
          color:tab===t.id?C.text:C.muted,
        }}>{t.label}</button>
      ))}
    </div>

    {/* Content */}
    <div style={{flex:1,overflowY:"auto",padding:16}}>

      {tab==="overview"&&<>
        {projection&&projection.daysAway!==null&&<div style={{
          background:"#FFFDE7",border:"1px solid #F9A825",borderRadius:10,padding:"10px 12px",marginBottom:14,
        }}>
          <div style={{fontSize:11,color:"#7A6200"}}>
            🔮 At this pace, <strong>{projection.nextLevel.icon} {projection.nextLevel.title}</strong> in{" "}
            <strong>{projection.daysAway===1?"~1 day":projection.daysAway<7?`~${projection.daysAway} days`:projection.weeksAway===1?"~1 week":`~${projection.weeksAway} weeks`}</strong>
          </div>
        </div>}

        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>HOW YOU EARNED IT</div>
        <div style={{background:C.bg,borderRadius:10,overflow:"hidden",marginBottom:16}}>
          {[
            {label:"PB days",val:breakdown.pb,show:breakdown.pb>0},
            {label:"Above target",val:breakdown.aboveTarget,show:breakdown.aboveTarget>0},
            {label:"At target",val:breakdown.atTarget,show:breakdown.atTarget>0},
            {label:"Below target",val:breakdown.belowTarget,show:breakdown.belowTarget>0},
            {label:"Shielded",val:breakdown.shielded,show:breakdown.shielded>0},
            {label:"Streak bonus",val:breakdown.streakBonus,show:breakdown.streakBonus>0},
            {label:"🥚 Eggs",val:breakdown.eggBonus,show:breakdown.eggBonus>0},
            {label:"🧠 GK Learning",val:breakdown.gkBonus,show:breakdown.gkBonus>0},
            {label:"🦁 Bravery",val:breakdown.braveryBonus,show:breakdown.braveryBonus>0},
            {label:"➕ Extra sessions",val:breakdown.extraSessionBonus,show:breakdown.extraSessionBonus>0},
            {label:"Starting bonus",val:100,show:true},
            {label:"Skipped",val:breakdown.skipped,show:breakdown.skipped<0},
            {label:"Streak breaks",val:breakdown.streakBreak,show:breakdown.streakBreak<0},
          ].filter(r=>r.show).map((row,i,arr)=>(
            <div key={row.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",
              borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",fontSize:11}}>
              <span style={{color:C.text}}>{row.label}</span>
              <span style={{fontWeight:700,color:row.val>=0?(row.val>0?C.done:C.muted):C.missed}}>{row.val>0?"+":""}{row.val.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>LEVELS UNLOCKED ({earnedLevels.length}/{PP_LEVELS.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {[...earnedLevels].reverse().slice(0,5).map(l=>{
            const dateStr = completeLevelDates[l.level];
            const dateLabel = dateStr ? new Date(dateStr+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : (l.level===1?"Day 1":null);
            return <div key={l.level} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
              background:l.level===level.level?"#1a1a2e":C.bg,borderRadius:8,
              border:`1px solid ${l.level===level.level?"#FFD700":C.border}`}}>
              <span style={{fontSize:10,fontWeight:700,color:l.level===level.level?"#FFD700":C.muted,minWidth:16,textAlign:"right"}}>{l.level}</span>
              <span style={{fontSize:15}}>{l.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontWeight:700,fontSize:11,color:l.level===level.level?"#FFD700":C.text}}>{l.title}</span>
                {dateLabel&&<span style={{fontSize:9,color:l.level===level.level?"rgba(255,255,255,0.4)":C.muted,marginLeft:6}}>{dateLabel}</span>}
              </div>
            </div>;
          })}
          {earnedLevels.length>5&&<div style={{fontSize:10,color:C.muted,textAlign:"center",marginTop:2}}>+{earnedLevels.length-5} more — see Info tab</div>}
        </div>
      </>}

      {tab==="history"&&(()=>{
        const dates = Object.keys(dailyEarned).filter(d=>dailyEarned[d]!==0 || (dailyTags[d]&&dailyTags[d].length>0)).sort((a,b)=>b.localeCompare(a));
        if(dates.length===0) return <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:20}}>No history yet.</div>;
        return <div>
          {dates.map((d,i)=>{
            const pts = dailyEarned[d]||0;
            const tags = dailyTags[d]||[];
            const dateLabel = new Date(d+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
            return <div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"9px 4px",borderBottom:i<dates.length-1?`1px solid ${C.border}`:"none"}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text}}>{dateLabel}</div>
                <div style={{display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
                  {tags.map(t=>TAG_INFO[t]&&<span key={t} style={{fontSize:9,color:C.muted}}>{TAG_INFO[t].icon} {TAG_INFO[t].label}</span>)}
                </div>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:pts>=0?(pts>0?C.done:C.muted):C.missed}}>{pts>0?"+":""}{pts.toLocaleString()}</span>
            </div>;
          })}
        </div>;
      })()}

      {tab==="info"&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>DAILY POINTS</div>
        <div style={{marginBottom:16}}>
          {[
            {icon:"🌟",label:"Personal best",val:"+250"},
            {icon:"💪",label:"Above target",val:"+200"},
            {icon:"✅",label:"At target",val:"+100"},
            {icon:"📉",label:"Below target",val:"+50"},
            {icon:"🛡️",label:"Shielded",val:"+25"},
            {icon:"❌",label:"Skipped",val:"-25"},
            {icon:"💔",label:"Breaking 7+ streak",val:"-100"},
          ].map(r=><div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
            <span>{r.icon} {r.label}</span>
            <span style={{fontWeight:700,color:r.val.startsWith("-")?C.missed:C.done}}>{r.val}</span>
          </div>)}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>STREAK MULTIPLIERS</div>
        <div style={{marginBottom:16}}>
          {[{s:"30+ days",m:"5x"},{s:"14–29 days",m:"3x"},{s:"7–13 days",m:"2x"},{s:"3–6 days",m:"1.5x"},{s:"1–2 days",m:"1x"}].map(r=>
            <div key={r.s} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
              <span>🔥 {r.s}</span><span style={{fontWeight:700,color:"#E8A838"}}>{r.m}</span>
            </div>)}
        </div>
      </>}
    </div>
    </>}
  </div>;
}


// ── Mystery Bonus Reveal ─────────────────────────────────────────────────────
function MysteryBonusReveal({normalPP, bonusPP, onClose}){
  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[]);
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:500,
    display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)",
    animation:"fadeInOverlay 0.3s ease"}}>
    <style>{`
      @keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}
      @keyframes mysteryPop{0%{transform:scale(0.3) rotate(-5deg);opacity:0}60%{transform:scale(1.1) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}
      @keyframes giftBounce{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-12px) rotate(-10deg)}75%{transform:translateY(-8px) rotate(10deg)}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    `}</style>
    <div onClick={e=>e.stopPropagation()} style={{
      background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      border:"3px solid #FFD700",borderRadius:24,padding:"36px 32px",
      maxWidth:320,width:"90%",textAlign:"center",
      boxShadow:"0 0 60px rgba(255,215,0,0.4), 0 20px 60px rgba(0,0,0,0.5)",
      animation:"mysteryPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{fontSize:60,marginBottom:8,animation:"giftBounce 1.5s ease-in-out infinite"}}>🎁</div>
      <div style={{fontSize:13,fontWeight:800,color:"#FFD700",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>
        Mystery Bonus Day!
      </div>
      <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",marginBottom:20,lineHeight:1.5}}>
        Today was secretly a<br/><strong style={{color:"#FFD700"}}>Double PP Day!</strong>
      </div>
      <div style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <span style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Normal</span>
          <span style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>+{normalPP} ⚡</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <span style={{fontSize:13,color:"#FFD700"}}>🎁 Bonus</span>
          <span style={{fontSize:13,color:"#FFD700"}}>+{normalPP} ⚡</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:15,fontWeight:800,color:"#fff"}}>Total earned</span>
          <span style={{fontSize:15,fontWeight:900,color:"#FFD700"}}>+{bonusPP} ⚡ 🔥</span>
        </div>
      </div>
      <button onClick={onClose} style={{
        background:"linear-gradient(135deg,#FFD700,#FFA500)",
        border:"none",borderRadius:12,padding:"12px 32px",
        fontSize:15,fontWeight:800,color:"#1a1a2e",cursor:"pointer",
        boxShadow:"0 4px 20px rgba(255,215,0,0.4)",
      }}>Awesome! 🎉</button>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:12}}>Tap anywhere to continue</div>
    </div>
  </div>;
}

// ── Egg-O-Meter (isolated bonus PP feature) ───────────────────────────────────
// ── Egg History Drawer — calendar view + monthly total ──────────────────────
function EggHistoryDrawer({member, logs, onClose}){
  const now = new Date();
  const[yr, setYr] = useState(now.getFullYear());
  const[mo, setMo] = useState(now.getMonth());
  const eggLogs = getEggLogs(logs, member.id);
  const today = todayStr();
  const isCurMo = yr===now.getFullYear() && mo===now.getMonth();

  const prevMo = ()=>{ if(mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1); };
  const nextMo = ()=>{ if(mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1); };

  // Monthly total
  const monthPrefix = `${yr}-${String(mo+1).padStart(2,"0")}`;
  const monthTotal = Object.entries(eggLogs)
    .filter(([d])=>d.startsWith(monthPrefix))
    .reduce((s,[,c])=>s+(c||0), 0);

  const dCount = daysInMonth(yr, mo);
  const firstDay = firstDayOfMonth(yr, mo);
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=dCount;d++) cells.push(d);

  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(400px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>{member.emoji}</span>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>🥚 Egg History</div>
              <div style={{fontSize:11,color:C.muted}}>{member.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted}}>×</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 24px"}}>
        {/* Month nav + total */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={prevMo} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,
            padding:"4px 10px",cursor:"pointer",fontSize:14,color:C.text}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:700,fontSize:14}}>{MONTHS[mo]} {yr}</div>
          </div>
          <button onClick={nextMo} disabled={isCurMo} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:14,color:C.text,opacity:isCurMo?0.3:1}}>›</button>
        </div>

        <div style={{background:"linear-gradient(135deg,#EBF2FC,#DCE9F9)",border:"1.5px solid #5B8FD4",
          borderRadius:12,padding:"14px 16px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2C5FA8",letterSpacing:0.5,marginBottom:2}}>MONTHLY TOTAL</div>
          <div style={{fontSize:24,fontWeight:900,color:"#2C5FA8"}}>{monthTotal} <span style={{fontSize:14}}>🥚</span></div>
          <div style={{fontSize:11,color:"#4A6B94"}}>+{(monthTotal*1000).toLocaleString()} ⚡ this month</div>
        </div>

        {/* Calendar grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.muted,fontWeight:600,padding:"4px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {cells.map((d,i)=>{
            if(d===null) return <div key={`e${i}`}/>;
            const dateStr = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const count = eggLogs[dateStr] || 0;
            const isToday = dateStr===today;
            const isFuture = dateStr>today;
            return <div key={d} style={{
              aspectRatio:"1",borderRadius:7,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:1,
              background:count>0?"#5B8FD4":C.bg,
              border:isToday?"2px solid #2C5FA8":`1px solid ${C.border}`,
              opacity:isFuture?0.3:1,
            }}>
              <span style={{fontSize:10,fontWeight:600,color:count>0?"#fff":C.muted}}>{d}</span>
              {count>0&&<span style={{fontSize:9,color:"#fff"}}>🥚{count>1?count:""}</span>}
            </div>;
          })}
        </div>
      </div>
    </div>
  </>;
}

function EggMeter({member, logs, onEggChange, onNewBadge}){
  const today = todayStr();
  const eggLogs = getEggLogs(logs, member.id);
  const todayCount = eggLogs[today] || 0;
  const totalCount = totalEggCount(logs, member.id);
  const[celebrate,setCelebrate]=useState(false);
  const[showHistory,setShowHistory]=useState(false);

  function handleTap(delta){
    if(delta>0){
      setCelebrate(true);
      setTimeout(()=>setCelebrate(false),1400);
    }
    const prevLevel = getLevel(computePowerPoints(member, logs).total);
    onEggChange(member.id, today, delta);
    setTimeout(()=>{
      const nextLogs = {...logs, [member.id]: {...(logs[member.id]||{})}};
      const eggs = {...(nextLogs[member.id].eggs||{})};
      const newCount = Math.max(0, (eggs[today]||0)+delta);
      if(newCount===0) delete eggs[today]; else eggs[today]=newCount;
      nextLogs[member.id].eggs = eggs;
      const newLevel = getLevel(computePowerPoints(member, nextLogs).total);
      if(newLevel.level > prevLevel.level && onNewBadge){
        onNewBadge({id:`pp_level_${newLevel.level}`,e:newLevel.icon,
          label:`Level ${newLevel.level}: ${newLevel.title}!`,
          desc:`You reached ${newLevel.title}! Keep going!`,
          tier:newLevel.level>=33?'gold':newLevel.level>=20?'silver':'bronze'}, member.name);
      }
    },100);
  }

  return <>
  <div style={{
    background:"linear-gradient(135deg,#EBF2FC,#DCE9F9)",border:"1.5px solid #5B8FD4",
    borderRadius:12,padding:"12px 16px",marginBottom:12,position:"relative",overflow:"hidden",
    display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
  }}>
    <style>{`
      @keyframes henBounce{
        0%{transform:translateY(0) rotate(0deg)}
        25%{transform:translateY(-6px) rotate(-4deg)}
        50%{transform:translateY(2px) rotate(0deg)}
        75%{transform:translateY(-3px) rotate(4deg)}
        100%{transform:translateY(0) rotate(0deg)}
      }
      @keyframes eggDrop{
        0%{transform:translateY(-8px) scale(0.3);opacity:0}
        40%{opacity:1}
        60%{transform:translateY(4px) scale(1.15)}
        80%{transform:translateY(-2px) scale(0.95)}
        100%{transform:translateY(0) scale(1);opacity:1}
      }
      @keyframes ppFloat{
        0%{transform:translateY(0);opacity:0}
        20%{opacity:1}
        100%{transform:translateY(-32px);opacity:0}
      }
    `}</style>
    {celebrate&&<div style={{position:"absolute",top:6,right:16,display:"flex",flexDirection:"column",alignItems:"center",pointerEvents:"none",zIndex:5}}>
      <span style={{fontSize:24,display:"inline-block",animation:"henBounce 0.7s ease-in-out"}}>🐔</span>
      <span style={{fontSize:16,display:"inline-block",animation:"eggDrop 0.9s 0.3s ease-out both",marginTop:-4}}>🥚</span>
      <span style={{position:"absolute",top:0,right:-6,fontSize:12,fontWeight:800,color:"#F9A825",
        whiteSpace:"nowrap",animation:"ppFloat 1.2s 0.2s ease-out both"}}>+1,000 ⚡</span>
    </div>}
    <div>
      <div style={{fontSize:11,fontWeight:700,color:"#2C5FA8",letterSpacing:0.5,marginBottom:2}}>🥚 EGG-O-METER</div>
      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
        <span style={{fontSize:20,fontWeight:900,color:"#2C5FA8"}}>{totalCount}</span>
        <span style={{fontSize:11,color:"#4A6B94"}}>eggs · +{(totalCount*1000).toLocaleString()} ⚡ total</span>
      </div>
      {todayCount>0&&<div style={{fontSize:11,color:"#4A6B94",marginTop:2}}>{todayCount} today</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={()=>setShowHistory(true)} style={{
        background:"none",border:"1.5px solid #5B8FD4",borderRadius:8,
        width:32,height:32,cursor:"pointer",fontSize:14,color:"#2C5FA8",
      }}>📅</button>
      {todayCount>0&&<button onClick={()=>handleTap(-1)} style={{
        background:"none",border:"1.5px solid #5B8FD4",borderRadius:8,
        width:32,height:32,cursor:"pointer",fontSize:16,color:"#2C5FA8",fontWeight:700,
      }}>−</button>}
      <button onClick={()=>handleTap(1)} style={{
        background:"#5B8FD4",color:"#fff",border:"none",borderRadius:8,
        padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13,whiteSpace:"nowrap",
      }}>🥚 +1 Egg</button>
    </div>
  </div>
  {showHistory&&<EggHistoryDrawer member={member} logs={logs} onClose={()=>setShowHistory(false)}/>}
  </>;
}

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({member,logs,allMembers,onLogAll,onEggChange,onEdit,onNewBadge,year,month,theme,onOpenPP,onGrowthSave,onGkSave,onBraverySave}){
  const today=todayStr();
  const[showCal,setShowCal]=useState(true);
  const[showBadges,setShowBadges]=useState(false);
  const[showStats,setShowStats]=useState(false);
  const[showGrowth,setShowGrowth]=useState(false);
  const[showGK,setShowGK]=useState(false);
  const[showBravery,setShowBravery]=useState(false);
  const[showHeatmap,setShowHeatmap]=useState(false);
  const[mysteryReveal,setMysteryReveal]=useState(null); // {normalPP, bonusPP}
  const[modal,setModal]=useState(null);
  const ppData = computePowerPoints(member, logs);
  const ppLevel = getLevel(ppData.total);
  const ppNext = getNextLevel(ppData.total);

  const acts=member.activities||[];
  const avgPct=memberConsPct(member,logs,year,month);
  const bestStreak=memberStreakCount(member,logs);

  const todayStats=acts.map(a=>{const l=getActivityLogs(logs,member.id,a.id)[today];return{act:a,log:l};});
  const doneToday=todayStats.filter(x=>x.log&&x.log.status!=="skipped");
  const loggedCount=doneToday.length;

  const fs=computeFamStats(allMembers,logs);
  const memberOverride = (member.alternating && acts.length>1) ? computeMemberLevelStats(member,logs) : {};
  const allEarned=new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,member.id,a.id),a.target,a.unit,{...fs,...memberOverride})));
  const personalBadges=getMemberBadges(member);

  const dCount=daysInMonth(year,month);
  const firstDay=firstDayOfMonth(year,month);
  const calDays=[];
  for(let i=0;i<firstDay;i++) calDays.push(null);
  for(let d=1;d<=dCount;d++) calDays.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  const themeAccent = (THEMES.find(t=>t.id===theme)||THEMES[0]).accent;
  const[hovered,setHovered]=useState(false);

  return <div
    onMouseEnter={()=>setHovered(true)}
    onMouseLeave={()=>setHovered(false)}
    style={{
      background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,
      padding:20,paddingTop:24,position:"relative",overflow:"hidden",
      boxShadow:hovered?"0 8px 28px rgba(0,0,0,0.10)":"0 2px 12px rgba(0,0,0,0.05)",
      transform:hovered?"translateY(-2px)":"translateY(0)",
      transition:"box-shadow 0.2s ease, transform 0.2s ease",
    }}>
    {/* Themed top border strip */}
    <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:themeAccent}}/>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{
          width:44,height:44,borderRadius:"50%",background:member.color+"22",
          border:`1.5px solid ${member.color}55`,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:22,flexShrink:0,
        }}>{member.emoji}</div>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>{member.name}</div>
          <div style={{fontSize:11,color:C.muted}}>{acts.map(a=>`${a.name} (${a.target}${a.unit})`).join(" · ")}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {bestStreak>0&&<div style={{display:"flex",alignItems:"center",gap:4,background:member.color+"18",border:`1px solid ${member.color}44`,borderRadius:99,padding:"3px 10px"}}>
          <span>🔥</span><span style={{fontSize:12,fontWeight:700,color:member.color}}>{bestStreak}d streak</span>
        </div>}
        {(()=>{const sl=4-shieldsUsed(logs,member.id,acts);return sl<4&&<div style={{display:"flex",alignItems:"center",gap:3,background:"#E3F2FD",border:"1px solid #90CAF9",borderRadius:99,padding:"3px 9px"}}>
          <span style={{fontSize:11}}>🛡️</span><span style={{fontSize:11,fontWeight:700,color:"#1565C0"}}>{sl} left</span>
        </div>;})()}
        <button onClick={()=>onEdit(member)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:C.muted}}>✏️ Edit</button>
      </div>
    </div>

    {/* Power Points Banner */}
    <div onClick={()=>onOpenPP&&onOpenPP(member.id)} style={{
      background:"linear-gradient(135deg,#1a1a2e,#16213e)",
      borderRadius:12,padding:"12px 16px",marginBottom:12,cursor:"pointer",
      display:"flex",alignItems:"center",justifyContent:"space-between",
      transition:"opacity 0.15s",position:"relative",overflow:"hidden",
    }}
    onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      <div>
        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:2}}>⚡ POWER POINTS</div>
        <div style={{fontSize:24,fontWeight:900,color:"#FFD700",lineHeight:1}}>{ppData.total.toLocaleString()}</div>
        {ppData.weekPP>0&&<div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>+{ppData.weekPP.toLocaleString()} this week</div>}
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:22}}>{ppLevel.icon}</div>
        <div style={{fontSize:12,fontWeight:700,color:"#FFD700"}}>{ppLevel.title}</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Level {ppLevel.level}</div>
        {ppNext&&<div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:2}}>{(ppNext.pp-ppData.total).toLocaleString()} to {ppNext.icon} {ppNext.title}</div>}
      </div>
      {ppNext&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,0.1)",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.round(((ppData.total-ppLevel.pp)/(ppNext.pp-ppLevel.pp))*100)}%`,background:"linear-gradient(90deg,#FFD700,#FFA500)",transition:"width 0.5s"}}/>
      </div>}
    </div>

    {/* Egg-O-Meter */}
    {member.eggMeter&&<EggMeter member={member} logs={logs} onEggChange={onEggChange} onNewBadge={onNewBadge}/>}

    {/* Consistency */}
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:C.muted}}>Month consistency</span>
        <span style={{fontSize:11,fontWeight:700,color:avgPct>=80?C.done:avgPct>=50?C.partial:C.missed}}>{avgPct}%</span>
      </div>
      <ConsistencyBar pct={avgPct}/>
    </div>

    {/* Month summary */}
    {(()=>{
      const {done, missed, remaining} = memberMonthSummary(member, logs, year, month);
      const used=shieldsUsed(logs,member.id,acts);
      const left=4-used;
      return <div style={{display:"flex",gap:12,marginBottom:12,marginTop:-6,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:C.done,fontWeight:600}}>✓ {done} done</span>
        <span style={{fontSize:12,color:C.missed,fontWeight:600}}>✗ {missed} missed</span>
        {used>0&&<span style={{fontSize:12,color:"#1565C0",fontWeight:600}}>🛡️ {used} used</span>}
        {used>0&&<span style={{fontSize:12,color:"#1976D2",fontWeight:600}}>🛡️ {left} left</span>}
        {remaining>0&&<span style={{fontSize:12,color:C.muted}}>{remaining} {remaining===1?'day':'days'} remaining</span>}
      </div>;
    })()}

    {/* PB Tile */}
    {(()=>{
      const pbs=acts.map(a=>{
        const al=getActivityLogs(logs,member.id,a.id);
        const today=todayStr();
        const entries=Object.entries(al).filter(([d])=>d<=today);
        let bestVal=0,bestDate=null;
        for(const[d,l]of entries){
          if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0){
            const sessionVals=l.sessions&&l.sessions.length>0?l.sessions:[l.value];
            const maxSession=Math.max(...sessionVals);
            if(maxSession>bestVal){bestVal=maxSession;bestDate=d;}
          }
        }
        return bestVal>0?{act:a,val:bestVal,date:bestDate}:null;
      }).filter(Boolean);
      if(!pbs.length) return null;
      return <div style={{
        background:"#FFFDE7",border:"1.5px solid #F9A825",
        borderRadius:10,padding:"10px 14px",marginBottom:12,
      }}>
        <div style={{fontSize:11,fontWeight:700,color:"#F57F17",letterSpacing:0.5,marginBottom:6}}>👑 PERSONAL BEST{pbs.length>1?"S":""}</div>
        {pbs.map(({act,val,date})=>(
          <div key={act.id} style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:pbs.length>1?4:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              {pbs.length>1&&<span style={{fontSize:12,color:"#795548"}}>{act.name}</span>}
              <span style={{fontSize:22,fontWeight:800,color:"#E65100",lineHeight:1}}>{val}</span>
              <span style={{fontSize:13,fontWeight:600,color:"#E65100"}}>{act.unit}</span>
            </div>
            <span style={{fontSize:11,color:"#795548"}}>
              {date?new Date(date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):""}
            </span>
          </div>
        ))}
      </div>;
    })()}

    {/* Today */}
    <div style={{background:member.color+"0E",border:`1px solid ${member.color}28`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,color:C.muted,marginBottom:3}}>Today</div>
        {loggedCount===0
          ?<span style={{fontSize:13,color:C.muted}}>Not logged yet</span>
          :<div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px"}}>
            {doneToday.map(({act,log})=><span key={act.id} style={{fontSize:13,fontWeight:700,color:log.value>=act.target?C.done:C.partial}}>
              {act.name}: {log.value}{act.unit}
            </span>)}
          </div>}
      </div>
      <button onClick={()=>setModal(today)} style={{background:member.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>
        {loggedCount>0?"Edit":"Log today"}
      </button>
    </div>

    {/* Calendar */}
    <button onClick={()=>setShowCal(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:member.color,fontWeight:600,padding:0,marginBottom:8}}>
      {showCal?"▾ Hide calendar":"▸ Show calendar"}
    </button>
    {showCal&&<div style={{marginBottom:8}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:C.muted,fontWeight:600}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {calDays.map((ds,i)=>ds===null?<div key={`e${i}`}/>:
          <CalCell key={ds} dateStr={ds} member={member} logs={logs} isToday={ds===today} onClick={d=>setModal(d)} ppByDate={ppData.dailyEarned}/>)}
      </div>
    </div>}

    {/* Badges + Stats footer */}
    <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:C.muted}}><span style={{fontWeight:700,color:C.text}}>{allEarned.size}</span> / {personalBadges.length} badges earned</span>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <button onClick={()=>setShowStats(true)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:600,fontSize:12,color:C.muted}}>📊 Stats</button>
        <button onClick={()=>setShowGrowth(true)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:600,fontSize:12,color:C.muted}}>📏 Growth</button>
        {member.gkEnabled&&<button onClick={()=>setShowGK(true)} style={{background:"none",border:"1px solid #7E57C2",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:600,fontSize:12,color:"#7E57C2"}}>🧠 GK</button>}
        {member.braveryEnabled&&<button onClick={()=>setShowBravery(true)} style={{background:"none",border:"1px solid #F57C00",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:600,fontSize:12,color:"#F57C00"}}>🦁 Bravery</button>}
        <button onClick={()=>setShowBadges(true)} style={{background:member.color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>🏆 Badges</button>
      </div>
    </div>
    {showBadges&&<BadgeDrawer member={member} allEarned={allEarned} acts={acts} logs={logs} onClose={()=>setShowBadges(false)}/>}
    {showStats&&<AllTimeStats member={member} logs={logs} onClose={()=>setShowStats(false)}/>}
    {showGrowth&&<GrowthDrawer member={member} logs={logs} onSave={onGrowthSave} onClose={()=>setShowGrowth(false)}/>}
    {showGK&&<GKDrawer member={member} logs={logs} onGkSave={onGkSave} onClose={()=>setShowGK(false)}/>}
    {showBravery&&<BraveryDrawer member={member} logs={logs} onBraverySave={onBraverySave} onClose={()=>setShowBravery(false)}/>}
    {mysteryReveal&&<MysteryBonusReveal normalPP={mysteryReveal.normalPP} bonusPP={mysteryReveal.bonusPP} onClose={()=>setMysteryReveal(null)}/>}

    {modal&&(member.alternating&&acts.length>1
      ?<AlternatingLogModal dateStr={modal} member={member} logs={logs} shieldsLeft={4-shieldsUsed(logs,member.id,acts)}
      onSaveAll={entries=>{
        // Stamp current target onto each entry so history is preserved
        const stampedEntries=entries.map(e=>{
          const act=acts.find(a=>a.id===e.actId);
          return act?{...e,target:act.target}:e;
        });
        const prev=new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,member.id,a.id),a.target,a.unit,computeMemberLevelStats(member,logs))));
        onLogAll(member.id,modal,stampedEntries);
        setTimeout(()=>{
          const nextLogs={...logs,[member.id]:{...logs[member.id]}};
          for(const en of stampedEntries) nextLogs[member.id][en.actId]={...nextLogs[member.id]?.[en.actId],[modal]:{value:en.value,status:en.status,target:en.target}};
          const memberOverride=computeMemberLevelStats(member,nextLogs);
          const next=acts.flatMap(a=>{
            const en=stampedEntries.find(e=>e.actId===a.id);if(!en)return[];
            const nl={...getActivityLogs(logs,member.id,a.id),[modal]:{value:en.value,status:en.status,target:en.target}};
            return earnedBadges(nl,a.target,a.unit,memberOverride);
          });
          next.filter(id=>!prev.has(id)).forEach(id=>{const b=BADGES.find(x=>x.id===id);if(b)onNewBadge(b,member.name);});
          // Mystery bonus day check
          if(isMysteryBonusDay(member.id, modal)){
            // Calculate what normal PP would have been (without mystery multiplier)
            const entryForDay = stampedEntries[0];
            if(entryForDay && entryForDay.status !== "skipped" && entryForDay.status !== "shielded" && entryForDay.value > 0){
              const act = acts.find(a=>a.actId===entryForDay.actId||a.id===entryForDay.actId);
              const effectiveTarget = entryForDay.target || act?.target || 0;
              const normalPP = entryForDay.value > effectiveTarget*1.5 ? 250 : entryForDay.value > effectiveTarget ? 200 : entryForDay.value >= effectiveTarget ? 100 : 50;
              setTimeout(()=>setMysteryReveal({normalPP, bonusPP: normalPP*2}), 300);
            }
          }
          // PP level-up check
          const prevLevel=getLevel(computePowerPoints(member,logs).total);
          setTimeout(()=>{
            const newLevel=getLevel(computePowerPoints(member,logs).total);
            if(newLevel.level>prevLevel.level){
              onNewBadge({id:`pp_level_${newLevel.level}`,e:newLevel.icon,
                label:`Level ${newLevel.level}: ${newLevel.title}!`,
                desc:`You reached ${newLevel.title}! Keep going!`,
                tier:newLevel.level>=33?'gold':newLevel.level>=20?'silver':'bronze'},member.name);
            }
          },200);
        },50);
        setModal(null);
      }}
      onClose={()=>setModal(null)}/>
      :<LogModal dateStr={modal} member={member} logs={logs} shieldsLeft={4-shieldsUsed(logs,member.id,acts)}
        onSaveAll={entries=>{
          const stampedEntries=entries.map(e=>{const act=acts.find(a=>a.id===e.actId);return act?{...e,target:act.target}:e;});
          const prev=new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,member.id,a.id),a.target,a.unit)));
          onLogAll(member.id,modal,stampedEntries);
          setTimeout(()=>{
            const next=acts.flatMap(a=>{const en=stampedEntries.find(e=>e.actId===a.id);if(!en)return[];const nl={...getActivityLogs(logs,member.id,a.id),[modal]:{value:en.value,status:en.status,target:en.target}};return earnedBadges(nl,a.target,a.unit);});
            next.filter(id=>!prev.has(id)).forEach(id=>{const b=BADGES.find(x=>x.id===id);if(b)onNewBadge(b,member.name);});
            // Mystery bonus day reveal
            if(isMysteryBonusDay(member.id, modal)){
              const doneEntries=stampedEntries.filter(e=>e.status!=="skipped"&&e.status!=="shielded"&&e.value>0);
              if(doneEntries.length>0){
                let normalPP=0;
                for(const e of doneEntries){
                  const act=acts.find(a=>a.id===e.actId);
                  const effectiveTarget=e.target||act?.target||0;
                  normalPP+=e.value>effectiveTarget*1.5?250:e.value>effectiveTarget?200:e.value>=effectiveTarget?100:50;
                }
                setTimeout(()=>setMysteryReveal({normalPP:normalPP*getStreakMultiplier(bestStreak), bonusPP:normalPP*getStreakMultiplier(bestStreak)*2}),300);
              }
            }
          },50);
          setModal(null);
        }}
        onClose={()=>setModal(null)}/>
    )}
  </div>;
}

// ── Edit Member Modal ─────────────────────────────────────────────────────────
function EditModal({member,isNew,onSave,onDelete,onClose}){
  const[name,setName]=useState(member?.name??"");
  const[emoji,setEmoji]=useState(member?.emoji??"🏃");
  const[color,setColor]=useState(member?.color??"#5B8FD4");
  const[acts,setActs]=useState(member?.activities??[{id:Date.now().toString(),name:"",unit:"min",target:30}]);
  const[alternating,setAlternating]=useState(member?.alternating??false);
  const[eggMeter,setEggMeter]=useState(member?.eggMeter??false);
  const[gkEnabled,setGkEnabled]=useState(member?.gkEnabled??false);
  const[braveryEnabled,setBraveryEnabled]=useState(member?.braveryEnabled??false);
  const[startDate,setStartDate]=useState(member?.startDate??"");
  const[memberTheme,setMemberTheme]=useState(member?.memberTheme??"");
  const[memberPattern,setMemberPattern]=useState(member?.memberPattern??"");
  const eOpts=["🧗","🚶","🏃","🚴","🏋️","🤸","🧘","🏊","⚽","🏓","🎯","💪","🧒","👩","👨"];
  const cOpts=["#5B8FD4","#D47B9E","#3D9E6E","#E8A838","#9B6FD4","#E05C5C","#5BC4C4","#E8873A"];
  const addAct=()=>setActs(a=>[...a,{id:Date.now().toString(),name:"",unit:"reps",target:10}]);
  const remAct=id=>setActs(a=>a.filter(x=>x.id!==id));
  const updAct=(id,f,v)=>setActs(a=>a.map(x=>x.id===id?{...x,[f]:v}:x));
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:16,padding:28,width:380,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontWeight:700,fontSize:17,marginBottom:20}}>{isNew?"Add member":`Edit ${member?.name}`}</div>
      <div style={{marginBottom:14}}><label style={lStyle}>Name</label><input value={name} onChange={e=>setName(e.target.value)} style={iStyle} placeholder="e.g. Abilash"/></div>
      <div style={{marginBottom:14}}>
        <label style={lStyle}>Tracking start date</label>
        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={iStyle} max={todayStr()}/>
        <div style={{fontSize:10,color:C.muted,marginTop:3}}>Days before this date are ignored in all calculations</div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={lStyle}>Icon</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {eOpts.map(e=><button key={e} onClick={()=>setEmoji(e)} style={{fontSize:18,padding:"3px 7px",borderRadius:7,border:`2px solid ${emoji===e?color:C.border}`,background:emoji===e?color+"18":"none",cursor:"pointer"}}>{e}</button>)}
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <label style={lStyle}>Colour</label>
        <div style={{display:"flex",gap:7}}>
          {cOpts.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?`3px solid ${C.text}`:"3px solid transparent",boxSizing:"border-box"}}/>)}
        </div>
      </div>

      {/* Per-member theme */}
      <div style={{marginBottom:14}}>
        <label style={lStyle}>Page theme (this member only)</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
          <div onClick={()=>setMemberTheme("")} style={{
            width:26,height:26,borderRadius:"50%",cursor:"pointer",
            background:"linear-gradient(135deg,#ccc 50%,#fff 50%)",
            border:memberTheme===""?`3px solid ${C.text}`:"3px solid transparent",boxSizing:"border-box",
          }} title="Use global theme"/>
          {THEMES.map(t=><div key={t.id} onClick={()=>setMemberTheme(t.id)} style={{
            width:26,height:26,borderRadius:"50%",background:t.accent,cursor:"pointer",
            border:memberTheme===t.id?`3px solid ${C.text}`:"3px solid transparent",boxSizing:"border-box",
          }} title={t.name}/>)}
        </div>
        <div style={{fontSize:10,color:C.muted}}>{memberTheme?`Using: ${THEMES.find(t=>t.id===memberTheme)?.name}`:"Using global theme (half-circle = default)"}</div>
      </div>

      {/* Per-member pattern */}
      <div style={{marginBottom:18}}>
        <label style={lStyle}>Background pattern (this member only)</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <div onClick={()=>setMemberPattern("")} style={{
            width:30,height:22,borderRadius:5,cursor:"pointer",
            background:"linear-gradient(135deg,#ccc 50%,#fff 50%)",
            border:memberPattern===""?`2px solid ${C.text}`:"2px solid transparent",boxSizing:"border-box",
          }} title="Use global pattern"/>
          {PATTERN_OPTIONS.map(p=><div key={p.id} onClick={()=>setMemberPattern(p.id)} style={{
            width:30,height:22,borderRadius:5,cursor:"pointer",fontSize:12,
            display:"flex",alignItems:"center",justifyContent:"center",
            background:C.bg,border:memberPattern===p.id?`2px solid ${C.text}`:"2px solid transparent",
            boxSizing:"border-box",
          }} title={p.name}>{p.emoji}</div>)}
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:3}}>{memberPattern?`Using: ${PATTERN_OPTIONS.find(p=>p.id===memberPattern)?.name}`:"Using global pattern"}</div>
      </div>
      <div style={{marginBottom:18}}>
        <div onClick={()=>setEggMeter(e=>!e)} style={{
          display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
          background:eggMeter?"#FFFDE7":"#F7F5F0",border:`1.5px solid ${eggMeter?"#F9A825":C.border}`,
          borderRadius:10,cursor:"pointer",userSelect:"none",
        }}>
          <div style={{width:36,height:20,borderRadius:99,background:eggMeter?"#F9A825":C.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:eggMeter?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:eggMeter?"#F57F17":C.text}}>🥚 Egg-O-Meter</div>
            <div style={{fontSize:11,color:C.muted}}>Each egg logged adds +1000 Power Points</div>
          </div>
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <div onClick={()=>setGkEnabled(g=>!g)} style={{
          display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
          background:gkEnabled?"#EDE7F6":"#F7F5F0",border:`1.5px solid ${gkEnabled?"#7E57C2":C.border}`,
          borderRadius:10,cursor:"pointer",userSelect:"none",
        }}>
          <div style={{width:36,height:20,borderRadius:99,background:gkEnabled?"#7E57C2":C.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:gkEnabled?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:gkEnabled?"#5E35B1":C.text}}>🧠 General Knowledge</div>
            <div style={{fontSize:11,color:C.muted}}>Ask questions verbally — tap when aced, earns Power Points</div>
          </div>
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <div onClick={()=>setBraveryEnabled(b=>!b)} style={{
          display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
          background:braveryEnabled?"#FFF3E0":"#F7F5F0",border:`1.5px solid ${braveryEnabled?"#F57C00":C.border}`,
          borderRadius:10,cursor:"pointer",userSelect:"none",
        }}>
          <div style={{width:36,height:20,borderRadius:99,background:braveryEnabled?"#F57C00":C.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:braveryEnabled?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:braveryEnabled?"#E65100":C.text}}>🦁 Bravery Points</div>
            <div style={{fontSize:11,color:C.muted}}>Award points for anything brave — you choose the reason & amount</div>
          </div>
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <label style={{...lStyle,marginBottom:0}}>Activities</label>
          <button onClick={addAct} style={{background:color,color:"#fff",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:700}}>+ Add</button>
        </div>
        {acts.length>1&&<div onClick={()=>setAlternating(a=>!a)} style={{
          display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:10,
          background:alternating?"#E8F5E9":"#F7F5F0",border:`1.5px solid ${alternating?C.done:C.border}`,
          borderRadius:10,cursor:"pointer",userSelect:"none",
        }}>
          <div style={{width:36,height:20,borderRadius:99,background:alternating?C.done:C.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:alternating?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:alternating?C.done:C.text}}>Alternating activities</div>
            <div style={{fontSize:11,color:C.muted}}>Do at least one per day — not all required</div>
          </div>
        </div>}
        {acts.map((a,i)=><div key={a.id} style={{background:C.bg,borderRadius:10,padding:12,marginBottom:8,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Activity {i+1}</span>
            {acts.length>1&&<button onClick={()=>remAct(a.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.missed,padding:0}}>✕ Remove</button>}
          </div>
          <div style={{marginBottom:8}}><label style={lStyle}>Name</label><input value={a.name} onChange={e=>updAct(a.id,"name",e.target.value)} style={iStyle} placeholder="e.g. Squats"/></div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={lStyle}>Daily target</label><input type="number" value={a.target} onChange={e=>updAct(a.id,"target",parseFloat(e.target.value)||0)} style={iStyle}/></div>
            <div style={{flex:1}}>
              <label style={lStyle}>Unit</label>
              <select value={a.unit} onChange={e=>updAct(a.id,"unit",e.target.value)} style={iStyle}>
                {UNIT_OPTIONS.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        {!isNew&&<button onClick={()=>{if(window.confirm("Remove?"))onDelete(member.id);}} style={{padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.missed}`,background:"none",cursor:"pointer",color:C.missed,fontWeight:600}}>Delete</button>}
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",cursor:"pointer",fontWeight:600,color:C.muted}}>Cancel</button>
        <button onClick={()=>onSave({id:member?.id??Date.now().toString(),name,emoji,color,activities:acts,alternating,startDate,eggMeter,memberTheme,memberPattern,gkEnabled,braveryEnabled})} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",background:color,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>Save</button>
      </div>
    </div>
  </div>;
}

// ── Family Feed ──────────────────────────────────────────────────────────────
function FamilyFeed({members,logs}){
  const [expanded,setExpanded]=useState(false);
  const today=todayStr();

  // Collect all log entries across members and activities
  const entries=[];
  for(const m of members){
    for(const a of(m.activities||[])){
      const al=getActivityLogs(logs,m.id,a.id);
      const best=allTimeBest(al);
      for(const[d,l]of Object.entries(al)){
        if(d>today) continue;
        if(l.status==="shielded") continue;
        const sessionVals=l.sessions&&l.sessions.length>0?l.sessions:[l.value];
        const maxSession=Math.max(...sessionVals);
        entries.push({date:d,member:m,activity:a,log:l,isPB:maxSession===best&&maxSession>a.target,isAbove:l.value>a.target});
      }
    }
  }
  entries.sort((a,b)=>b.date.localeCompare(a.date));
  const shown=expanded?entries.slice(0,30):entries.slice(0,6);

  if(!entries.length) return null;

  function relDate(ds){
    const diff=Math.round((new Date(today)-new Date(ds))/86400000);
    if(diff===0)return"Today";if(diff===1)return"Yesterday";
    if(diff<7)return`${diff} days ago`;
    return new Date(ds+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  }

  return <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
    <div style={{fontWeight:700,fontSize:14,color:C.muted,marginBottom:14,letterSpacing:0.3}}>📣 FAMILY FEED</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {shown.map((en,i)=>{
        const isSkip=en.log.status==="skipped";
        return <div key={`${en.member.id}-${en.activity.id}-${en.date}-${i}`} style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"9px 12px",borderRadius:10,
          background:isSkip?C.bg:en.isPB?"#FFFDE7":en.isAbove?C.done+"0F":C.bg,
          border:`1px solid ${isSkip?C.border:en.isPB?"#F9A825":en.isAbove?C.done+"33":C.border}`,
        }}>
          <span style={{fontSize:20,flexShrink:0}}>{en.member.emoji}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>
              <span style={{fontWeight:700}}>{en.member.name}</span>
              {isSkip
                ?<span style={{color:C.muted}}> skipped {en.activity.name}</span>
                :<span> · {en.activity.name}: <span style={{color:en.isPB?"#F9A825":en.isAbove?C.done:C.text,fontWeight:700}}>{en.log.value}{en.activity.unit}</span>
                  {en.isPB&&" 👑"}{!en.isPB&&en.isAbove&&" ⭐"}
                </span>}
            </div>
          </div>
          <div style={{fontSize:11,color:C.muted,flexShrink:0,whiteSpace:"nowrap"}}>{relDate(en.date)}</div>
        </div>;
      })}
    </div>
    {entries.length>6&&<button onClick={()=>setExpanded(s=>!s)} style={{
      marginTop:10,background:"none",border:"none",cursor:"pointer",
      fontSize:12,color:C.muted,fontWeight:600,padding:0,width:"100%",textAlign:"center"
    }}>{expanded?`▲ Show less`:`▾ Show ${Math.min(entries.length-6,24)} more`}</button>}
  </div>;
}

// ── All-time Stats Panel ──────────────────────────────────────────────────────
// ── Growth Tracker ────────────────────────────────────────────────────────────
function getGrowthLogs(logs, memberId){
  return (logs[memberId] && logs[memberId].growth) || [];
}

function GrowthLogModal({member, existing, onSave, onClose}){
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [height, setHeight] = useState(existing?.height ?? "");
  const [weight, setWeight] = useState(existing?.weight ?? "");
  const monthLabel = now.toLocaleDateString("en-IN",{month:"long",year:"numeric"});

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,
    display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:18,padding:24,width:"100%",maxWidth:320,
      boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:24}}>{member.emoji}</span>
        <div>
          <div style={{fontWeight:700,fontSize:15}}>Log Measurement</div>
          <div style={{fontSize:11,color:C.muted}}>{monthLabel}</div>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:6}}>HEIGHT (cm)</label>
        <input type="number" min={50} max={250} step={0.1} value={height}
          onChange={e=>setHeight(e.target.value)} placeholder="e.g. 128.5"
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,
          fontSize:18,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:20}}>
        <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:6}}>WEIGHT (kg)</label>
        <input type="number" min={5} max={300} step={0.1} value={weight}
          onChange={e=>setWeight(e.target.value)} placeholder="e.g. 26.5"
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,
          fontSize:18,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:8,
          border:`1.5px solid ${C.border}`,background:"none",cursor:"pointer",
          fontWeight:600,color:C.muted}}>Cancel</button>
        <button onClick={()=>{
          if(!height&&!weight) return;
          onSave({month:monthStr,
            height:height?parseFloat(height):null,
            weight:weight?parseFloat(weight):null});
          onClose();
        }} disabled={!height&&!weight} style={{flex:2,padding:"10px 0",borderRadius:8,
          border:"none",background:(!height&&!weight)?C.border:member.color,
          color:"#fff",cursor:(!height&&!weight)?"not-allowed":"pointer",
          fontWeight:700,fontSize:14}}>Save</button>
      </div>
    </div>
  </div>;
}

function GrowthDrawer({member, logs, onSave, onClose}){
  const growthLogs = getGrowthLogs(logs, member.id)
    .slice().sort((a,b)=>a.month.localeCompare(b.month));
  const [showLogModal, setShowLogModal] = useState(false);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const thisMonthEntry = growthLogs.find(g=>g.month===thisMonth);
  const latest = growthLogs[growthLogs.length-1];
  const prev = growthLogs[growthLogs.length-2];

  const heightDelta = latest?.height&&prev?.height ? (latest.height-prev.height).toFixed(1) : null;
  const weightDelta = latest?.weight&&prev?.weight ? (latest.weight-prev.weight).toFixed(1) : null;

  // SVG chart dimensions
  const W=320, H=140, padL=36, padR=16, padT=16, padB=28;
  const cW=W-padL-padR, cH=H-padT-padB;
  const hasChart = growthLogs.filter(g=>g.height||g.weight).length >= 1;

  function chartPath(key){
    const pts = growthLogs.filter(g=>g[key]!=null);
    if(pts.length===0) return null;
    const vals = pts.map(g=>g[key]);
    const minV=Math.min(...vals), maxV=Math.max(...vals);
    const range = maxV-minV || 10; // avoid divide by zero with single point
    const totalSlots = Math.max(growthLogs.length-1, 1);
    const xStep = cW/totalSlots;
    return pts.map((g)=>{
      const xi = growthLogs.indexOf(g);
      const x = padL + (growthLogs.length===1 ? cW/2 : xi*xStep); // center single point
      const y = padT+cH-(((g[key]-minV)/range)*cH*0.8)-cH*0.1; // add 10% padding top/bottom
      return {x,y,val:g[key],month:g.month};
    });
  }

  const hPts = chartPath("height","#5B8FD4");
  const wPts = chartPath("weight","#E8873A");

  function buildD(pts){
    if(!pts||pts.length<2) return "";
    return pts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(" ");
  }

  function monthLabel(m){
    const d=new Date(m+"-01");
    return d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
  }

  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(400px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>{member.emoji}</span>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>📏 Growth</div>
              <div style={{fontSize:11,color:C.muted}}>{member.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted}}>×</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 24px"}}>

        {/* Latest + delta */}
        {latest ? <div style={{background:C.bg,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:10}}>
            LATEST — {monthLabel(latest.month)}
          </div>
          <div style={{display:"flex",gap:16}}>
            {latest.height&&<div>
              <div style={{fontSize:28,fontWeight:900,color:member.color}}>{latest.height}</div>
              <div style={{fontSize:11,color:C.muted}}>cm height</div>
              {heightDelta&&<div style={{fontSize:11,fontWeight:600,
                color:parseFloat(heightDelta)>=0?C.done:C.missed,marginTop:2}}>
                {parseFloat(heightDelta)>=0?"↑":"↓"} {Math.abs(heightDelta)}cm
              </div>}
            </div>}
            {latest.height&&latest.weight&&<div style={{width:1,background:C.border}}/>}
            {latest.weight&&<div>
              <div style={{fontSize:28,fontWeight:900,color:"#E8873A"}}>{latest.weight}</div>
              <div style={{fontSize:11,color:C.muted}}>kg weight</div>
              {weightDelta&&<div style={{fontSize:11,fontWeight:600,
                color:C.muted,marginTop:2}}>
                {parseFloat(weightDelta)>=0?"↑":"↓"} {Math.abs(weightDelta)}kg
              </div>}
            </div>}
          </div>
        </div> : <div style={{background:C.bg,borderRadius:12,padding:20,textAlign:"center",
          marginBottom:16,color:C.muted,fontSize:13}}>
          No measurements yet. Log the first one!
        </div>}

        {/* Chart */}
        {hasChart&&<div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>GROWTH CHART</div>
          <div style={{display:"flex",gap:12,marginBottom:8}}>
            <span style={{fontSize:10,color:"#5B8FD4",fontWeight:600}}>— Height (cm)</span>
            <span style={{fontSize:10,color:"#E8873A",fontWeight:600}}>— Weight (kg)</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
            {/* Grid */}
            {[0,0.5,1].map(t=><line key={t}
              x1={padL} y1={padT+cH*(1-t)} x2={W-padR} y2={padT+cH*(1-t)}
              stroke={C.border} strokeWidth={1} strokeDasharray={t===0?"":"4,4"}/>)}
            {/* Height line or dot */}
            {hPts&&<>
              {hPts.length>=2&&<path d={buildD(hPts)} fill="none" stroke="#5B8FD4" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"/>}
              {hPts.map((p,i)=><g key={i}>
                <circle cx={p.x} cy={p.y} r={4} fill="#5B8FD4" stroke="#fff" strokeWidth={2}/>
                <text x={p.x} y={p.y-8} textAnchor="middle" fontSize={8} fill="#5B8FD4">{p.val}</text>
              </g>)}
            </>}
            {/* Weight line or dot */}
            {wPts&&<>
              {wPts.length>=2&&<path d={buildD(wPts)} fill="none" stroke="#E8873A" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"/>}
              {wPts.map((p,i)=><g key={i}>
                <circle cx={p.x} cy={p.y} r={4} fill="#E8873A" stroke="#fff" strokeWidth={2}/>
                <text x={p.x} y={p.y-8} textAnchor="middle" fontSize={8} fill="#E8873A">{p.val}</text>
              </g>)}
            </>}
            {/* X axis labels */}
            {growthLogs.map((g,i)=>{
              const totalSlots = Math.max(growthLogs.length-1,1);
              const xStep=cW/totalSlots;
              const x = growthLogs.length===1 ? padL+cW/2 : padL+i*xStep;
              return <text key={g.month} x={x} y={H-6}
                textAnchor="middle" fontSize={8} fill={C.muted}>{monthLabel(g.month)}</text>;
            })}
          </svg>
        </div>}

        {/* History list */}
        {growthLogs.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>HISTORY</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[...growthLogs].reverse().map(g=><div key={g.month} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"8px 12px",background:C.bg,borderRadius:8}}>
              <span style={{fontSize:12,fontWeight:600,color:C.text}}>{monthLabel(g.month)}</span>
              <div style={{display:"flex",gap:12}}>
                {g.height&&<span style={{fontSize:12,color:"#5B8FD4",fontWeight:700}}>{g.height}cm</span>}
                {g.weight&&<span style={{fontSize:12,color:"#E8873A",fontWeight:700}}>{g.weight}kg</span>}
              </div>
            </div>)}
          </div>
        </div>}

        {/* Log button */}
        <button onClick={()=>setShowLogModal(true)} style={{
          width:"100%",padding:"12px 0",borderRadius:10,border:"none",
          background:thisMonthEntry?C.bg:member.color,
          color:thisMonthEntry?C.muted:"#fff",
          cursor:"pointer",fontWeight:700,fontSize:14,
          border:thisMonthEntry?`1.5px solid ${C.border}`:"none",
        }}>
          {thisMonthEntry?"✏️ Edit this month's measurement":"📏 Log this month's measurement"}
        </button>
      </div>
    </div>

    {showLogModal&&<GrowthLogModal member={member} existing={thisMonthEntry}
      onSave={entry=>onSave(member.id,entry)} onClose={()=>setShowLogModal(false)}/>}
  </>;
}

// ── General Knowledge (GK) View ────────────────────────────────────────────────
// ── General Knowledge (GK) View — simple verbal-quiz tracker ────────────────────
// ── GK Drawer (wraps GKView in a slide-in panel) ─────────────────────────────
function GKDrawer({member, logs, onGkSave, onClose}){
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(400px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>{member.emoji}</span>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>🧠 GK</div>
              <div style={{fontSize:11,color:C.muted}}>{member.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted}}>×</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 24px"}}>
        {(()=>{
          const gkBonus = computeGkBonus(logs, member.id);
          return <>
            <div style={{background:C.bg,borderRadius:12,padding:"12px 16px",marginBottom:14,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:0.5}}>🧠 GK CONTRIBUTED</div>
                <div style={{fontSize:18,fontWeight:900,color:"#7E57C2"}}>{gkBonus.total.toLocaleString()} ⚡</div>
              </div>
              <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                {gkBonus.dailyCount>0&&<div>{gkBonus.dailyCount} {gkBonus.dailyCount===1?"day":"days"} done</div>}
                {gkBonus.weekendCount>0&&<div>{gkBonus.weekendCount} {gkBonus.weekendCount===1?"week":"weeks"} done</div>}
              </div>
            </div>
            <GKView member={member} logs={logs} onGkSave={onGkSave}/>
          </>;
        })()}
      </div>
    </div>
  </>;
}

// ── General Knowledge (GK) View — verbal quiz tracker with tiered credit ────────
function GKView({member, logs, onGkSave}){
  const today = todayStr();
  const now = new Date();
  const isWeekend = now.getDay()===0 || now.getDay()===6;
  const gk = getGkData(logs, member.id);
  const[points, setPoints] = useState("");
  const[reason, setReason] = useState("");

  const PointsForm = ({onGive, placeholder, reasonPlaceholder}) => (
    <div>
      <input value={reason} onChange={e=>setReason(e.target.value)}
        placeholder={reasonPlaceholder} style={{width:"100%",padding:"10px 12px",borderRadius:8,
        border:"1.5px solid #7E57C2",fontSize:13,outline:"none",
        boxSizing:"border-box",marginBottom:10,background:"#fff"}}/>
      <input type="number" min={1} value={points} onChange={e=>setPoints(e.target.value)}
        placeholder={placeholder} style={{width:"100%",padding:"11px 12px",borderRadius:8,
        border:"1.5px solid #7E57C2",fontSize:16,fontWeight:700,outline:"none",
        boxSizing:"border-box",marginBottom:10,background:"#fff",textAlign:"center"}}/>
      <button disabled={!points||parseInt(points)<=0||!reason.trim()} onClick={()=>{
        onGive(parseInt(points), reason.trim());
        setPoints(""); setReason("");
      }} style={{width:"100%",padding:"11px 0",borderRadius:10,border:"none",
        background:(!points||parseInt(points)<=0||!reason.trim())?"#D1C4E9":"#7E57C2",
        color:"#fff",cursor:(!points||parseInt(points)<=0||!reason.trim())?"not-allowed":"pointer",
        fontWeight:700,fontSize:14}}>Give Points</button>
    </div>
  );

  if(isWeekend){
    const weekKey = getWeekKey(today);
    const existing = gk.weekendResults?.[weekKey];

    if(existing){
      return <div style={{background:"linear-gradient(135deg,#EDE7F6,#D1C4E9)",border:"1.5px solid #7E57C2",
        borderRadius:16,padding:24,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🏆</div>
        <div style={{fontWeight:800,fontSize:16,color:"#4A148C"}}>Weekly Review Done!</div>
        <div style={{fontSize:13,color:"#5E35B1",marginTop:4}}>+{existing.points.toLocaleString()} ⚡ earned this week.</div>
        {existing.reason&&<div style={{fontSize:12,color:"#7E57C2",marginTop:6,fontStyle:"italic"}}>"{existing.reason}"</div>}
      </div>;
    }

    return <div style={{background:C.surface,border:"1.5px solid #7E57C2",borderRadius:16,padding:24,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:8}}>🏆</div>
      <div style={{fontWeight:800,fontSize:16,marginBottom:6}}>Weekly Review Time!</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:18}}>
        Quiz {member.name} on everything learned this week — how did it go? Enter what you quizzed and the points to award.
      </div>
      <PointsForm placeholder="e.g. 2000" reasonPlaceholder="What topic? (e.g. Indian state capitals)"
        onGive={(pts,rsn)=>onGkSave(member.id,{type:"weekend", weekKey, date:today, points:pts, reason:rsn})}/>
    </div>;
  }

  // Weekday mode
  const todayEntry = gk.dailyResults?.[today];

  if(todayEntry?.points>0){
    return <div style={{background:"linear-gradient(135deg,#EDE7F6,#D1C4E9)",border:"1.5px solid #7E57C2",
      borderRadius:16,padding:24,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:8}}>🧠</div>
      <div style={{fontWeight:800,fontSize:15,color:"#4A148C"}}>Today's quiz done!</div>
      <div style={{fontSize:13,color:"#5E35B1",marginTop:4}}>+{todayEntry.points.toLocaleString()} ⚡ earned. Come back tomorrow!</div>
      {todayEntry.reason&&<div style={{fontSize:12,color:"#7E57C2",marginTop:6,fontStyle:"italic"}}>"{todayEntry.reason}"</div>}
    </div>;
  }

  return <div style={{background:C.surface,border:"1.5px solid #7E57C2",borderRadius:16,padding:24,textAlign:"center"}}>
    <div style={{fontSize:36,marginBottom:8}}>🧠</div>
    <div style={{fontWeight:800,fontSize:16,marginBottom:6}}>Today's GK Quiz</div>
    <div style={{fontSize:13,color:C.muted,marginBottom:18}}>
      Ask {member.name} a few general knowledge questions — how did it go? Enter what you quizzed and the points to award.
    </div>
    <PointsForm placeholder="e.g. 1000" reasonPlaceholder="What topic? (e.g. Indian state capitals)"
      onGive={(pts,rsn)=>onGkSave(member.id,{type:"daily", date:today, points:pts, reason:rsn})}/>
  </div>;
}

// ── Bravery Drawer (wraps BraveryView in a slide-in panel) ───────────────────
function BraveryDrawer({member, logs, onBraverySave, onClose}){
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(400px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>{member.emoji}</span>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>🦁 Bravery</div>
              <div style={{fontSize:11,color:C.muted}}>{member.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted}}>×</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 24px"}}>
        <BraveryView member={member} logs={logs} onBraverySave={onBraverySave}/>
      </div>
    </div>
  </>;
}

// ── Bravery Points View — parent picks reason + points, feeds same PP pool ──────
function BraveryView({member, logs, onBraverySave}){
  const today = todayStr();
  const entries = getBraveryLog(logs, member.id);
  const[reason, setReason] = useState("");
  const[points, setPoints] = useState("");
  const bonus = computeBraveryBonus(logs, member.id);

  const sorted = [...entries].sort((a,b)=>b.date.localeCompare(a.date));

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{background:"linear-gradient(135deg,#FFF3E0,#FFE0B2)",border:"1.5px solid #F57C00",
      borderRadius:16,padding:20,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:6}}>🦁</div>
      <div style={{fontWeight:800,fontSize:16,color:"#E65100",marginBottom:2}}>Give Bravery Points</div>
      <div style={{fontSize:12,color:"#F57C00",marginBottom:16}}>
        Award {member.name} points for anything brave — you choose why and how much
      </div>
      <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="What did they do? (e.g. Tried a new food)"
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #F57C00",
        fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10,background:"#fff"}}/>
      <input type="number" min={1} value={points} onChange={e=>setPoints(e.target.value)} placeholder="Points (e.g. 500)"
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #F57C00",
        fontSize:16,fontWeight:700,outline:"none",boxSizing:"border-box",marginBottom:12,background:"#fff"}}/>
      <button disabled={!reason.trim()||!points||parseInt(points)<=0} onClick={()=>{
        onBraverySave(member.id, {date:today, reason:reason.trim(), points:parseInt(points)});
        setReason(""); setPoints("");
      }} style={{
        width:"100%",padding:"11px 0",borderRadius:10,border:"none",
        background:(!reason.trim()||!points||parseInt(points)<=0)?"#E0B080":"#F57C00",
        color:"#fff",cursor:(!reason.trim()||!points||parseInt(points)<=0)?"not-allowed":"pointer",
        fontWeight:700,fontSize:14,
      }}>🦁 Give Bravery Points</button>
    </div>

    {bonus.total>0&&<div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px",
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5}}>🦁 BRAVERY CONTRIBUTED</div>
        <div style={{fontSize:20,fontWeight:900,color:"#F57C00"}}>{bonus.total.toLocaleString()} ⚡</div>
      </div>
      <div style={{fontSize:11,color:C.muted}}>{bonus.count} {bonus.count===1?"award":"awards"}</div>
    </div>}

    {sorted.length>0&&<div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px"}}>
      <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:10}}>HISTORY</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map((e,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"8px 10px",background:"#FFF8F0",borderRadius:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.text}}>{e.reason}</div>
              <div style={{fontSize:10,color:C.muted}}>{new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
            </div>
            <span style={{fontSize:13,fontWeight:800,color:"#F57C00"}}>+{e.points.toLocaleString()} ⚡</span>
          </div>
        ))}
      </div>
    </div>}
  </div>;
}

function AllTimeStats({member,logs,onClose}){
  const today=todayStr();
  const acts=member.activities||[];

  const stats=acts.map(a=>{
    const al=getActivityLogs(logs,member.id,a.id);
    const entries=Object.entries(al).filter(([d])=>d<=today).sort(([x],[y])=>x.localeCompare(y));
    const done=entries.filter(([,l])=>l.status!=="skipped"&&l.status!=="shielded"&&l.value>0);
    const totalVol=done.reduce((s,[,l])=>s+l.value,0);
    const best=done.reduce((b,[,l])=>{
      const sessionVals=l.sessions&&l.sessions.length>0?l.sessions:[l.value];
      return Math.max(b,...sessionVals);
    },0);
    const bestDay=done.find(([,l])=>{
      const sessionVals=l.sessions&&l.sessions.length>0?l.sessions:[l.value];
      return Math.max(...sessionVals)===best;
    })?.[0];
    const bestStrk=()=>{let b=0,r=0;for(const[,l]of entries){if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0){r++;b=Math.max(b,r);}else r=0;}return b;};
    // Best month
    const mons=[...new Set(done.map(([d])=>d.slice(0,7)))];
    let bestMon={ym:"",count:0};
    for(const ym of mons){const c=done.filter(([d])=>d.startsWith(ym)).length;if(c>bestMon.count)bestMon={ym,count:c};}
    // Format vol
    let volStr=`${totalVol}${a.unit}`;
    if(a.unit==="sec"&&totalVol>=3600) volStr=`${(totalVol/3600).toFixed(1)}hrs (${totalVol}sec)`;
    else if(a.unit==="sec"&&totalVol>=60) volStr=`${Math.floor(totalVol/60)}min ${totalVol%60}sec`;
    return{a,totalDays:done.length,totalVol,volStr,best,bestDay,bestStreak:bestStrk(),bestMon};
  });

  const overallStreak=memberStreakCount(member,logs);
  const trackStart=acts.flatMap(a=>Object.keys(getActivityLogs(logs,member.id,a.id))).sort()[0];
  const trackDays=trackStart?Math.round((new Date(today)-new Date(trackStart))/86400000)+1:0;

  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(480px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:28}}>{member.emoji}</span>
          <div>
            <div style={{fontWeight:800,fontSize:18}}>{member.name}</div>
            <div style={{fontSize:12,color:C.muted}}>All-time stats · {trackDays} days tracking</div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        {stats.map(s=><div key={s.a.id} style={{marginBottom:24}}>
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>{s.a.name}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {label:"Total days logged",val:s.totalDays,icon:"📅"},
              {label:"Total volume",val:s.volStr,icon:"📦"},
              {label:"Personal best",val:`${s.best}${s.a.unit}`,icon:"👑",sub:s.bestDay?new Date(s.bestDay+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):""},
              {label:"Best streak ever",val:`${s.bestStreak} days`,icon:"🔥"},
              {label:"Best month",val:s.bestMon.ym?`${s.bestMon.count} days`:"—",icon:"🗓️",sub:s.bestMon.ym?new Date(s.bestMon.ym+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"}):""},
            ].map(stat=><div key={stat.label} style={{background:C.bg,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:18,marginBottom:4}}>{stat.icon}</div>
              <div style={{fontWeight:800,fontSize:16,color:C.text,lineHeight:1.2}}>{stat.val}</div>
              {stat.sub&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{stat.sub}</div>}
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>{stat.label}</div>
            </div>)}
          </div>
        </div>)}
      </div>
    </div>
  </>;
}

// ── Heatmap View ─────────────────────────────────────────────────────────────
function HeatmapView({member,logs}){
  const today=todayStr();
  const todayDate=new Date(today);
  // Show last 52 weeks (364 days) + padding to start on Sunday
  const endDate=new Date(todayDate);
  const startDate=new Date(todayDate);
  startDate.setDate(startDate.getDate()-363);
  // Go back to nearest Sunday
  startDate.setDate(startDate.getDate()-startDate.getDay());

  const acts=member.activities||[];
  // Build a map of date -> status
  const dayMap={};
  const d=new Date(startDate);
  while(d<=endDate){
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    let status="empty";
    if(k<=today){
      let anyDone=false,anyAbove=false,isPB=false;
      for(const a of acts){
        const al=getActivityLogs(logs,member.id,a.id);
        const l=al[k];
        if(l&&l.status==="shielded"){status="shielded";break;}
        if(l&&l.status!=="skipped"&&l.value>0){
          anyDone=true;
          if(l.value>a.target) anyAbove=true;
          if(l.value===allTimeBest(al)&&l.value>a.target) isPB=true;
        } else if(l&&l.status==="skipped") status="skipped";
      }
      if(anyDone) status=isPB?"pb":anyAbove?"above":"done";
    }
    dayMap[k]=status;
    d.setDate(d.getDate()+1);
  }

  // Build weeks array
  const weeks=[];
  const cur=new Date(startDate);
  while(cur<=endDate){
    const week=[];
    for(let i=0;i<7;i++){
      const k=`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
      week.push({k,status:dayMap[k]||"future",day:cur.getDate(),month:cur.getMonth()});
      cur.setDate(cur.getDate()+1);
    }
    weeks.push(week);
  }

  const heatBg={
    empty:"#E8E4DC",skipped:"#E05C5C",
    done:"#3D9E6E",above:"#2E8B57",pb:"#1B5E20",
    shielded:"#B0BEC5",future:"transparent"
  };
  // Month labels
  const monthLabels=[];
  weeks.forEach((wk,wi)=>{
    const first=wk.find(d=>d.status!=="future");
    if(first&&first.day<=7) monthLabels.push({wi,label:MONTHS[first.month]});
  });

  return <div style={{overflowX:"auto",paddingBottom:4}}>
    <div style={{minWidth:Math.max(weeks.length*13,300)}}>
      {/* Month labels */}
      <div style={{display:"flex",marginBottom:2,marginLeft:0}}>
        {weeks.map((wk,wi)=>{
          const ml=monthLabels.find(l=>l.wi===wi);
          return <div key={wi} style={{width:12,marginRight:1,fontSize:8,color:C.muted,flexShrink:0}}>{ml?ml.label:""}</div>;
        })}
      </div>
      {/* Grid: 7 rows (days) × N cols (weeks) */}
      {[0,1,2,3,4,5,6].map(dow=><div key={dow} style={{display:"flex",gap:1,marginBottom:1}}>
        {weeks.map((wk,wi)=>{
          const cell=wk[dow];
          return <div key={wi} title={cell.k} style={{
            width:11,height:11,borderRadius:2,flexShrink:0,
            background:heatBg[cell.status]||"transparent",
          }}/>;
        })}
      </div>)}
      {/* Legend */}
      <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
        {[{c:heatBg.done,l:"Done"},{c:heatBg.above,l:"Above target"},{c:heatBg.pb,l:"Personal best"},{c:heatBg.skipped,l:"Skipped"},{c:heatBg.shielded,l:"Shielded"},{c:heatBg.empty,l:"No log"}].map(x=>
          <div key={x.l} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:9,height:9,borderRadius:2,background:x.c,border:`1px solid ${C.border}`}}/>
            <span style={{fontSize:9,color:C.muted}}>{x.l}</span>
          </div>
        )}
      </div>
    </div>
  </div>;
}

// ── Consistency Trend Line ───────────────────────────────────────────────────
// ── Infer a member's real tracking start (explicit startDate, or first-ever log) ──
function getEffectiveStart(member, logs){
  if(member.startDate) return member.startDate;
  let earliest = null;
  for(const a of (member.activities||[])){
    const al = getActivityLogs(logs, member.id, a.id);
    for(const d of Object.keys(al)) if(!earliest || d < earliest) earliest = d;
  }
  return earliest; // null if member has no data at all yet
}

function ConsistencyTrend({members, logs}){
  const today = new Date(todayStr());

  // Figure out each member's real start, and the earliest across the family
  const effectiveStarts = {};
  let globalStart = null;
  for(const m of members){
    const es = getEffectiveStart(m, logs);
    effectiveStarts[m.id] = es;
    if(es && (!globalStart || es < globalStart)) globalStart = es;
  }

  // Size the window dynamically: from the earliest activity to now, capped at 12 weeks
  let weekCount = 8;
  if(globalStart){
    const daysSinceStart = Math.round((today - new Date(globalStart+"T00:00:00")) / 86400000);
    weekCount = Math.min(12, Math.max(1, Math.ceil((daysSinceStart+1)/7)));
  }

  // Build weeks of data
  const weeks = [];
  for(let w=weekCount-1; w>=0; w--){
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w*7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const label = weekEnd.toLocaleDateString("en-IN",{day:"numeric",month:"short"});

    const memberPcts = members.map(m=>{
      const acts = m.activities||[];
      const sd = effectiveStarts[m.id];
      if(!sd) return null; // member has no data at all — no line
      // If this entire week ends before the member's start, no point for this week
      const weekEndStr = weekEnd.toISOString().slice(0,10);
      if(weekEndStr < sd) return null;

      let done=0, app=0;
      for(let d=0; d<7; d++){
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate()+d);
        const k = dt.toISOString().slice(0,10);
        if(k > todayStr()) continue;
        if(k < sd) continue; // before this member's real start
        app++;
        if(m.alternating){
          const anyDone = acts.some(a=>{
            const l=getActivityLogs(logs,m.id,a.id)[k];
            return l&&l.status!=="skipped"&&l.status!=="shielded"&&l.value>0;
          });
          const anyShielded = acts.some(a=>{
            const l=getActivityLogs(logs,m.id,a.id)[k];
            return l&&l.status==="shielded";
          });
          if(anyDone||anyShielded) done++;
        } else {
          const anyDone = acts.some(a=>{
            const l=getActivityLogs(logs,m.id,a.id)[k];
            return l&&l.status!=="skipped"&&l.value>0;
          });
          if(anyDone) done++;
        }
      }
      return app===0 ? null : Math.round((done/app)*100);
    });
    weeks.push({label, memberPcts});
  }

  // SVG dimensions
  const W=560, H=180, padL=32, padR=16, padT=16, padB=32;
  const chartW=W-padL-padR;
  const chartH=H-padT-padB;
  const xStep = chartW/(weeks.length-1);

  // Y gridlines at 0, 25, 50, 75, 100
  const gridLines=[0,25,50,75,100];

  function xPos(i){ return padL + i*xStep; }
  function yPos(pct){ return padT + chartH - (pct/100)*chartH; }

  // Build path for each member
  function buildPath(memberIdx){
    const points = weeks.map((w,i)=>{
      const pct = w.memberPcts[memberIdx];
      if(pct===null) return null;
      return {x:xPos(i), y:yPos(pct), pct};
    });
    let d="";
    points.forEach((p,i)=>{
      if(!p) return;
      if(d===""||points.slice(0,i).every(x=>x===null)) d+=`M${p.x},${p.y}`;
      else d+=`L${p.x},${p.y}`;
    });
    return {d, points};
  }

  return <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
    <div style={{fontWeight:700,fontSize:14,color:C.muted,letterSpacing:0.5,marginBottom:4}}>📈 CONSISTENCY TREND · LAST {weekCount} {weekCount===1?"WEEK":"WEEKS"}</div>
    <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
      {members.map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:20,height:3,borderRadius:99,background:m.color}}/>
        <span style={{fontSize:12,color:C.muted}}>{m.name}</span>
      </div>)}
    </div>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",minWidth:320,height:"auto"}}>
        {/* Grid lines */}
        {gridLines.map(g=><g key={g}>
          <line x1={padL} y1={yPos(g)} x2={W-padR} y2={yPos(g)} stroke={C.border} strokeWidth={1} strokeDasharray={g===0?"":"4,4"}/>
          <text x={padL-4} y={yPos(g)+4} textAnchor="end" fontSize={9} fill={C.muted}>{g}%</text>
        </g>)}

        {/* Member lines */}
        {members.map((m,mi)=>{
          const {d,points} = buildPath(mi);
          return <g key={m.id}>
            {/* Line */}
            {d&&<path d={d} fill="none" stroke={m.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>}
            {/* Dots */}
            {points.map((p,i)=>p&&<g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill={m.color} stroke="#fff" strokeWidth={2}/>
              {/* Value label on hover via title */}
              <title>{m.name}: {p.pct}%</title>
            </g>)}
          </g>;
        })}

        {/* X axis labels */}
        {weeks.map((w,i)=><text key={i} x={xPos(i)} y={H-6} textAnchor="middle" fontSize={9} fill={C.muted}>
          {i===weeks.length-1?"Now":w.label}
        </text>)}
      </svg>
    </div>
  </div>;
}

// ── Family Dashboard (Family Tab) ────────────────────────────────────────────
function FamilyDashboard({members, logs, yr, mo, MONTHS}){
  const now = new Date();
  const[scoreYr, setScoreYr] = useState(yr);
  const[scoreMo, setScoreMo] = useState(mo);
  const prevScoreMo=()=>{ if(scoreMo===0){setScoreYr(y=>y-1);setScoreMo(11);}else setScoreMo(m=>m-1); };
  const nextScoreMo=()=>{ if(scoreMo===11){setScoreYr(y=>y+1);setScoreMo(0);}else setScoreMo(m=>m+1); };
  const isCurrentScoreMo = scoreYr===now.getFullYear()&&scoreMo===now.getMonth();
  const today = todayStr();

  // Per-member stats
  const memberStats = members.map(m=>{
    const acts = m.activities||[];
    const sd = m.startDate||null;
    const avgPct = memberConsPct(m, logs, scoreYr, scoreMo);
    const {done, missed} = memberMonthSummary(m, logs, scoreYr, scoreMo);
    const curStreak = memberStreakCount(m, logs);
    let bestEver=0;
    for(const a of acts){
      const al=getActivityLogs(logs,m.id,a.id);
      const entries=Object.entries(al).filter(([d])=>d<=today).sort(([x],[y])=>x.localeCompare(y));
      let run=0;
      for(const[,l]of entries){if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0){run++;if(run>bestEver)bestEver=run;}else run=0;}
    }
    const shields = shieldsUsed(logs,m.id,acts);
    const familyOverride = (m.alternating && acts.length>1) ? computeMemberLevelStats(m,logs) : {};
    const allEarned = new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,m.id,a.id),a.target,a.unit,familyOverride)));
    const personalBadges = getMemberBadges(m);
    const volumes = acts.map(a=>{
      const al=getActivityLogs(logs,m.id,a.id);
      let total=0;
      for(const[d,l]of Object.entries(al)) if(d<=today&&l.status!=="skipped"&&l.status!=="shielded"&&l.value>0) total+=l.value;
      return{act:a,total,formatted:formatVol(total,a.unit)};
    }).filter(v=>v.total>0);
    return{m,avgPct,done,missed,curStreak,bestEver,shields,badgeCount:allEarned.size,totalBadges:personalBadges.length,volumes};
  });

  const ranked = [...memberStats].sort((a,b)=>b.avgPct-a.avgPct);
  const rankLabels = ["🥇","🥈","🥉"];
  const leader = ranked[0];

  // All activities for volume table
  const allActivities=[];const seenActs=new Set();
  for(const m of members) for(const a of(m.activities||[])) if(!seenActs.has(a.name)){seenActs.add(a.name);allActivities.push(a);}

  const fb = earnedFamBadges(members,logs);
  const famBadgeDefs = BADGES.filter(b=>FAM_IDS.has(b.id));
  const fbIds = new Set(fb.map(b=>b.id));

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>

    {/* ── Month selector + rank chips ── */}
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"16px 20px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div style={{fontWeight:800,fontSize:16}}>🏆 {MONTHS[scoreMo]} {scoreYr} Leaderboard</div>
          {leader&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{leader.m.name} leads with {leader.avgPct}% consistency</div>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={prevScoreMo} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"3px 10px",cursor:"pointer",fontSize:14,color:C.text}}>‹</button>
          <button onClick={nextScoreMo} disabled={isCurrentScoreMo} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"3px 10px",cursor:"pointer",fontSize:14,color:C.text,opacity:isCurrentScoreMo?0.3:1}}>›</button>
        </div>
      </div>
      {/* Rank chips — Consistency */}
      <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>📊 CONSISTENCY</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
        {ranked.map((s,i)=>(
          <div key={s.m.id} style={{
            flex:1,minWidth:140,padding:"12px 16px",borderRadius:12,
            background:i===0?s.m.color+"18":C.bg,
            border:`2px solid ${i===0?s.m.color:C.border}`,
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:18}}>{rankLabels[i]}</span>
                <span style={{fontWeight:700,fontSize:15,color:i===0?s.m.color:C.text}}>{s.m.name}</span>
              </div>
              <span style={{fontWeight:800,fontSize:18,color:i===0?s.m.color:C.text}}>{s.avgPct}%</span>
            </div>
            <div style={{background:C.border,borderRadius:99,height:5,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${s.avgPct}%`,background:s.m.color,borderRadius:99,transition:"width 0.5s"}}/>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {s.curStreak>0&&<span style={{fontSize:11,color:C.muted}}>🔥 {s.curStreak}d streak</span>}
              <span style={{fontSize:11,color:C.muted}}>✓ {s.done} done</span>
              {s.missed>0&&<span style={{fontSize:11,color:C.muted}}>✗ {s.missed} missed</span>}
            </div>
          </div>
        ))}
      </div>

      {/* PP Leaderboard */}
      {(()=>{
        const ppRanked=[...members].map(m=>({m,pp:computePowerPoints(m,logs)})).sort((a,b)=>b.pp.total-a.pp.total);
        return <>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:8}}>⚡ POWER POINTS</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {ppRanked.map((s,i)=>{
              const lv=getLevel(s.pp.total);
              return <div key={s.m.id} style={{
                flex:1,minWidth:140,padding:"12px 16px",borderRadius:12,
                background:i===0?"linear-gradient(135deg,#1a1a2e,#16213e)":C.bg,
                border:`2px solid ${i===0?"#FFD700":C.border}`,
              }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:16}}>{rankLabels[i]}</span>
                    <span style={{fontWeight:700,fontSize:14,color:i===0?"#FFD700":C.text}}>{s.m.name}</span>
                  </div>
                  <span style={{fontSize:20}}>{lv.icon}</span>
                </div>
                <div style={{fontWeight:900,fontSize:20,color:i===0?"#FFD700":C.text}}>{s.pp.total.toLocaleString()} <span style={{fontSize:12}}>⚡</span></div>
                <div style={{fontSize:11,color:i===0?"rgba(255,255,255,0.5)":C.muted}}>{lv.title} · Level {lv.level}</div>
                {(()=>{
                  const proj=projectNextLevel(s.m,logs);
                  if(!proj||proj.daysAway===null) return null;
                  const label = proj.daysAway===1?"~1d":proj.daysAway<7?`~${proj.daysAway}d`:proj.weeksAway===1?"~1wk":`~${proj.weeksAway}wks`;
                  return <div style={{fontSize:10,color:i===0?"rgba(255,255,255,0.35)":C.muted,marginTop:4}}>
                    🔮 {proj.nextLevel.title} in {label}
                  </div>;
                })()}
              </div>;
            })}
          </div>
        </>;
      })()}
    </div>

    {/* ── Trend chart ── */}
    <ConsistencyTrend members={members} logs={logs}/>

    {/* ── Per-member stat cards + volume side by side ── */}
    <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"start"}}>

      {/* Per-member cards */}
      <div style={{flex:"2 1 340px",display:"flex",flexDirection:"column",gap:12}}>
        {memberStats.map(s=>(
          <div key={s.m.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,
            padding:"14px 18px",paddingLeft:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
            position:"relative",overflow:"hidden"}}>
            {/* Member-colour left accent strip */}
            <div style={{position:"absolute",top:0,left:0,bottom:0,width:4,background:s.m.color}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,marginLeft:4}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:38,height:38,borderRadius:"50%",background:s.m.color+"22",
                  border:`1.5px solid ${s.m.color}55`,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,flexShrink:0,
                }}>{s.m.emoji}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{s.m.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{(s.m.activities||[]).map(a=>a.name).join(" · ")}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:22,color:s.m.color,lineHeight:1}}>{s.avgPct}%</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>this month</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginLeft:4}}>
              {[
                {icon:"✅",label:"Done",val:s.done},
                {icon:"❌",label:"Missed",val:s.missed},
                {icon:"🔥",label:"Streak",val:s.curStreak?`${s.curStreak}d`:"—",sub:s.bestEver>0?`best ${s.bestEver}d`:null},
                {icon:"🏆",label:"Badges",val:`${s.badgeCount}/${s.totalBadges}`},
              ].map(stat=>(
                <div key={stat.label} style={{background:C.bg,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontSize:14}}>{stat.icon}</div>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginTop:2}}>{stat.val}</div>
                  <div style={{fontSize:10,color:C.muted}}>{stat.label}</div>
                  {stat.sub&&<div style={{fontSize:8,color:C.muted,marginTop:1}}>{stat.sub}</div>}
                  {stat.label==="Badges"&&<div style={{background:C.border,borderRadius:99,height:3,overflow:"hidden",marginTop:5}}>
                    <div style={{height:"100%",width:`${Math.round((s.badgeCount/s.totalBadges)*100)}%`,background:s.m.color,borderRadius:99}}/>
                  </div>}
                </div>
              ))}
            </div>
            {s.shields>0&&<div style={{fontSize:11,color:C.muted,marginTop:8,marginLeft:4}}>
              🛡️ {s.shields} shields used this month
            </div>}
          </div>
        ))}
      </div>

      {/* All-time volume */}
      <div style={{flex:"1 1 220px",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontWeight:700,fontSize:13,color:C.muted,letterSpacing:0.5,marginBottom:12}}>📦 ALL-TIME VOLUME</div>
        {allActivities.map((act,ri)=>(
          <div key={act.id} style={{marginBottom:ri<allActivities.length-1?14:0}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${C.border}`}}>{act.name}</div>
            {memberStats.map(s=>{
              const vol=s.volumes.find(v=>v.act.name===act.name);
              if(!vol) return null;
              return <div key={s.m.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:s.m.color,flexShrink:0}}/>
                <span style={{fontSize:11,color:C.muted,flex:1}}>{s.m.name}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.text}}>{vol.formatted}</span>
              </div>;
            })}
          </div>
        ))}
        {allActivities.length===0&&<div style={{fontSize:12,color:C.muted}}>No activity logged yet</div>}
      </div>
    </div>

    {/* ── Family badges ── */}
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
      <div style={{fontWeight:700,fontSize:13,color:C.muted,letterSpacing:0.5,marginBottom:10}}>👨‍👩‍👦 FAMILY BADGES · {fb.length}/{famBadgeDefs.length} earned</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {famBadgeDefs.map(b=>{
          const earned=fbIds.has(b.id);const tc=TC[b.tier];
          return <div key={b.id} title={b.desc} style={{display:"flex",alignItems:"center",gap:6,background:earned?tc.bg:C.bg,border:`1.5px solid ${earned?tc.bd:C.border}`,borderRadius:10,padding:"6px 10px",opacity:earned?1:0.4,filter:earned?"none":"grayscale(1)"}}>
            <span style={{fontSize:18}}>{b.e}</span>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:earned?tc.tx:C.muted}}>{b.label}</div>
              <div style={{fontSize:10,color:C.muted}}>{b.desc}</div>
            </div>
          </div>;
        })}
      </div>
    </div>

  </div>;
}

// ── Smart Daily Greeting ──────────────────────────────────────────────────────
function getSmartGreeting(members, logs){
  const today = todayStr();
  const now = new Date();
  const hour = now.getHours();
  if(members.length===0) return "Keep showing up, together.";
  const activeMembers = members.filter(m=>!m.startDate||m.startDate<=today);
  if(activeMembers.length===0) return "Keep showing up, together.";
  const loggedStatus = activeMembers.map(m=>{
    const acts=m.activities||[];
    return acts.some(a=>{const l=getActivityLogs(logs,m.id,a.id)[today];return l&&(l.status==="done"||l.status==="shielded");});
  });
  const loggedCount = loggedStatus.filter(Boolean).length;
  const total = activeMembers.length;
  if(loggedCount===total){
    const msgs=["Perfect day, family! 🎉","Everyone's in! Great job today 🌟","Full house today — well done! 💪"];
    return msgs[now.getDate()%msgs.length];
  }
  if(loggedCount===0){
    if(hour<11) return "Good morning! Who's up first today? ☀️";
    if(hour<17) return "Afternoon check-in — anyone logged yet?";
    return "Evening's here — don't forget to log today 🌙";
  }
  const remaining = total - loggedCount;
  if(remaining===1){
    const pending = activeMembers.find((m,i)=>!loggedStatus[i]);
    return `Almost there — just ${pending?.name||"one more"} to go!`;
  }
  return `${loggedCount}/${total} logged so far — ${remaining} more to go`;
}

// ── Pattern Picker ─────────────────────────────────────────────────────────────
function PatternPicker({pattern, setPattern, accent}){
  const[open,setOpen]=useState(false);
  const current = PATTERN_OPTIONS.find(p=>p.id===pattern) || PATTERN_OPTIONS[0];

  return <div style={{position:"relative"}}>
    <button onClick={()=>setOpen(o=>!o)} title="Change pattern" style={{
      background:"none",border:`1px solid ${C.border}`,borderRadius:8,
      width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:14,
    }}>{current.emoji}</button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:90}}/>
      <div style={{position:"absolute",top:"110%",right:0,background:C.surface,
        border:`1px solid ${C.border}`,borderRadius:14,padding:16,zIndex:91,
        boxShadow:"0 8px 30px rgba(0,0,0,0.15)",width:280}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:12}}>🖼️ BACKGROUND PATTERN</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {PATTERN_OPTIONS.map(p=>{
            const isSelected = pattern===p.id;
            const previewSvg = getPatternSvg(p.id, accent);
            const previewUrl = `url("data:image/svg+xml,${encodeURIComponent(previewSvg)}")`;
            return <button key={p.id} onClick={()=>{setPattern(p.id);setOpen(false);}} style={{
              background:"none",border:"none",cursor:"pointer",padding:0,
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            }}>
              <div style={{
                width:72,height:52,borderRadius:8,
                background:`${p.id==="none"?"#f5f5f5":`${previewUrl}, #f0f0f0`}`,
                backgroundRepeat:"repeat",
                border:`2px solid ${isSelected?accent:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                position:"relative",overflow:"hidden",
                boxShadow:isSelected?`0 0 0 1px ${accent}`:"none",
              }}>
                {isSelected&&<div style={{
                  position:"absolute",top:3,right:3,width:16,height:16,borderRadius:"50%",
                  background:accent,display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  <span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>
                </div>}
                {p.id==="none"&&<span style={{fontSize:18,opacity:0.3}}>○</span>}
              </div>
              <span style={{fontSize:10,color:isSelected?accent:C.muted,fontWeight:isSelected?700:400}}>{p.name}</span>
            </button>;
          })}
        </div>
      </div>
    </>}
  </div>;
}

// ── Theme Picker ──────────────────────────────────────────────────────────────
function ThemePicker({theme, setTheme}){
  const[open,setOpen]=useState(false);
  const[customColor,setCustomColor]=useState("#5B8FD4");
  const current = THEMES.find(t=>t.id===theme) || {accent:theme,light:"#E8E4DC",name:"Custom"};

  // Seasonal suggestion based on current month
  const month = new Date().getMonth();
  const seasonal = month>=2&&month<=4?"forest":month>=5&&month<=7?"sunset":month>=8&&month<=10?"amber":"midnight";
  const seasonalName = THEMES.find(t=>t.id===seasonal)?.name;

  const groups = [
    {label:"🌿 NATURE",    ids:["forest","mint","teal","ocean"]},
    {label:"🌅 WARM",      ids:["sunset","peach","amber","rose","cherry"]},
    {label:"🌌 COOL",      ids:["lavender","slate","storm","midnight"]},
  ];

  return <div style={{position:"relative"}}>
    <button onClick={()=>setOpen(o=>!o)} title="Change theme" style={{
      background:"none",border:`1px solid ${C.border}`,borderRadius:8,
      width:36,height:36,cursor:"pointer",
      display:"flex",alignItems:"center",justifyContent:"center",
    }}>
      <span style={{width:16,height:16,borderRadius:"50%",background:current.accent,display:"inline-block",
        boxShadow:`0 0 0 2px ${current.accent}40`}}/>
    </button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:90}}/>
      <div style={{position:"absolute",top:"110%",right:0,background:C.surface,
        border:`1px solid ${C.border}`,borderRadius:14,padding:16,zIndex:91,
        boxShadow:"0 8px 30px rgba(0,0,0,0.15)",width:260}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:10}}>🎨 CHOOSE A THEME</div>

        {/* Seasonal suggestion */}
        {theme!==seasonal&&<div onClick={()=>{setTheme(seasonal);setOpen(false);}} style={{
          display:"flex",alignItems:"center",gap:8,background:THEMES.find(t=>t.id===seasonal)?.light,
          border:`1px solid ${THEMES.find(t=>t.id===seasonal)?.accent}`,borderRadius:8,
          padding:"6px 10px",marginBottom:12,cursor:"pointer",
        }}>
          <span style={{width:14,height:14,borderRadius:"50%",background:THEMES.find(t=>t.id===seasonal)?.accent,flexShrink:0}}/>
          <span style={{fontSize:11,color:THEMES.find(t=>t.id===seasonal)?.accent,fontWeight:600}}>
            ✨ Suggested for {MONTHS[month]}: {seasonalName}
          </span>
        </div>}

        {/* Grouped swatches */}
        {groups.map(g=>(
          <div key={g.label} style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:6}}>{g.label}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {g.ids.map(id=>{
                const t = THEMES.find(x=>x.id===id);
                if(!t) return null;
                const isSelected = theme===id;
                return <button key={id} onClick={()=>{setTheme(id);setOpen(false);}} title={t.name} style={{
                  background:"none",border:"none",cursor:"pointer",padding:2,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                }}>
                  <span style={{
                    width:30,height:30,borderRadius:"50%",background:t.accent,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:isSelected?`3px solid ${C.text}`:"3px solid transparent",
                    boxSizing:"border-box",boxShadow:isSelected?`0 0 0 1px ${C.text}`:"none",
                  }}>
                    {isSelected&&<span style={{color:"#fff",fontSize:12,fontWeight:900,lineHeight:1}}>✓</span>}
                  </span>
                  <span style={{fontSize:9,color:isSelected?C.text:C.muted,fontWeight:isSelected?700:400}}>{t.name}</span>
                </button>;
              })}
            </div>
          </div>
        ))}

        {/* Custom colour */}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
          <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:6}}>🖌️ CUSTOM</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="color" value={customColor}
              onChange={e=>setCustomColor(e.target.value)}
              style={{width:30,height:30,border:"none",borderRadius:"50%",cursor:"pointer",padding:0,background:"none"}}/>
            <span style={{fontSize:11,color:C.muted,flex:1}}>{customColor}</span>
            <button onClick={()=>{
              // Generate a light version of the custom colour
              const hex = customColor.replace("#","");
              const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
              const lightHex = `#${Math.round(r+(255-r)*0.75).toString(16).padStart(2,"0")}${Math.round(g+(255-g)*0.75).toString(16).padStart(2,"0")}${Math.round(b+(255-b)*0.75).toString(16).padStart(2,"0")}`;
              // Store custom theme by adding it temporarily
              setTheme(customColor);
              setOpen(false);
            }} style={{background:customColor,color:"#fff",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Apply</button>
          </div>
        </div>
      </div>
    </>}
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const[members,setMembers]=useState(DEF_MEMBERS);
  const[logs,setLogs]=useState({});
  const[loaded,setLoaded]=useState(false);
  const[editM,setEditM]=useState(null);
  const[toasts,setToasts]=useState([]);
  const[activeTab,setActiveTab]=useState(null); // null = show all (family summary)
  const[ppPanelFor,setPpPanelFor]=useState(null); // memberId whose PP panel is open, or null
  const[theme,setTheme]=useState("forest");
  const[pattern,setPattern]=useState("topo");
  const mRef=useRef(members);const lRef=useRef(logs);
  const tRef=useRef(theme);const pRef=useRef(pattern);
  mRef.current=members;lRef.current=logs;tRef.current=theme;pRef.current=pattern;
  const mInit=useRef(false);const lInit=useRef(false);const tInit=useRef(false);const pInit=useRef(false);
  const now=new Date();
  const[yr,setYr]=useState(now.getFullYear());
  const[mo,setMo]=useState(now.getMonth());

  useEffect(()=>{
    (async()=>{
      const d=await loadData();
      if(d){
        if(d.members&&Array.isArray(d.members)&&d.members.length>0) setMembers(d.members);
        if(d.logs&&typeof d.logs==="object") setLogs(d.logs);
        if(d.theme&&(THEMES.some(t=>t.id===d.theme)||d.theme.startsWith('#'))) setTheme(d.theme);
        if(d.pattern&&PATTERN_OPTIONS.some(p=>p.id===d.pattern)) setPattern(d.pattern);
      }
      setLoaded(true);
    })();
  },[]);

  // Set active tab to first member once loaded
  useEffect(()=>{
    if(loaded&&members.length>0&&activeTab===null){
      setActiveTab(members[0].id);
    }
  },[loaded]);

  useEffect(()=>{if(!loaded)return;if(!mInit.current){mInit.current=true;return;}scheduleSave({members:mRef.current,logs:lRef.current,theme:tRef.current,pattern:pRef.current});},[members,loaded]);
  useEffect(()=>{if(!loaded)return;if(!lInit.current){lInit.current=true;return;}scheduleSave({members:mRef.current,logs:lRef.current,theme:tRef.current,pattern:pRef.current});},[logs,loaded]);
  useEffect(()=>{if(!loaded)return;if(!tInit.current){tInit.current=true;return;}scheduleSave({members:mRef.current,logs:lRef.current,theme:tRef.current,pattern:pRef.current});},[theme,loaded]);
  useEffect(()=>{if(!loaded)return;if(!pInit.current){pInit.current=true;return;}scheduleSave({members:mRef.current,logs:lRef.current,theme:tRef.current,pattern:pRef.current});},[pattern,loaded]);

  const handleLogAll=useCallback((mid,dateStr,entries)=>{
    setLogs(prev=>{
      const next={...prev,[mid]:{...prev[mid]}};
      for(const{actId,value,status,target,sessions}of entries){
        const entry={value,status};
        if(target!==undefined) entry.target=target;
        if(sessions&&sessions.length>0) entry.sessions=sessions;
        next[mid][actId]={...next[mid]?.[actId],[dateStr]:entry};
      }
      return next;
    });
  },[]);

  const handleEggChange=useCallback((mid,dateStr,delta)=>{
    setLogs(prev=>{
      const next={...prev,[mid]:{...(prev[mid]||{})}};
      const eggs={...(next[mid].eggs||{})};
      const newCount=Math.max(0,(eggs[dateStr]||0)+delta);
      if(newCount===0) delete eggs[dateStr]; else eggs[dateStr]=newCount;
      next[mid].eggs=eggs;
      return next;
    });
  },[]);

  const handleGrowthSave=useCallback((mid,entry)=>{
    setLogs(prev=>{
      const next={...prev,[mid]:{...(prev[mid]||{})}};
      const growth=[...(next[mid].growth||[])];
      const idx=growth.findIndex(g=>g.month===entry.month);
      if(idx>=0) growth[idx]=entry; else growth.push(entry);
      next[mid].growth=growth;
      return next;
    });
  },[]);

  const handleGkSave=useCallback((mid,result)=>{
    setLogs(prev=>{
      const next={...prev,[mid]:{...(prev[mid]||{})}};
      const gk={dailyResults:{}, weekendResults:{}, ...(next[mid].gk||{})};
      const dailyResults={...gk.dailyResults};
      const weekendResults={...gk.weekendResults};
      if(result.type==="daily"){
        dailyResults[result.date]={points:result.points, reason:result.reason||""};
      } else if(result.type==="weekend"){
        weekendResults[result.weekKey]={date:result.date, points:result.points, reason:result.reason||""};
      }
      next[mid].gk={dailyResults, weekendResults};
      return next;
    });
  },[]);

  const handleBraverySave=useCallback((mid,entry)=>{
    setLogs(prev=>{
      const next={...prev,[mid]:{...(prev[mid]||{})}};
      const bravery=[...(next[mid].bravery||[]), entry];
      next[mid].bravery=bravery;
      return next;
    });
  },[]);

  const handleSave=useCallback((m)=>{
    setMembers(p=>{const ex=p.find(x=>x.id===m.id);return ex?p.map(x=>x.id===m.id?m:x):[...p,m];});
    setEditM(null);
  },[]);
  const handleDel=useCallback((id)=>{setMembers(p=>p.filter(m=>m.id!==id));setEditM(null);},[]);
  const[celebration,setCelebration]=useState(null);
  const handleBadge=useCallback((b,memberName)=>{
    if(MAJOR_MILESTONE_IDS.has(b.id)){
      setCelebration({...b,memberName});
    } else {
      setToasts(q=>[...q,{...b,key:Date.now()+Math.random()}]);
    }
  },[]);

  const prevMo=()=>{if(mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1);};
  const nextMo=()=>{if(mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1);};
  const isCurMo=yr===now.getFullYear()&&mo===now.getMonth();

  if(!loaded) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.muted,fontSize:16}}>Loading…</div></div>;

  // Derive active theme and pattern — per-member if set, otherwise global
  const activeMember = activeTab ? members.find(m=>m.id===activeTab) : null;
  const activeThemeId = (activeMember?.memberTheme) || theme;
  const activePatternId = (activeMember?.memberPattern) || pattern;

  const currentTheme = THEMES.find(t=>t.id===activeThemeId) || (activeThemeId.startsWith("#") ? {
    accent: activeThemeId,
    light: (()=>{
      const hex=activeThemeId.replace("#","");
      const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
      return `#${Math.round(r+(255-r)*0.75).toString(16).padStart(2,"0")}${Math.round(g+(255-g)*0.75).toString(16).padStart(2,"0")}${Math.round(b+(255-b)*0.75).toString(16).padStart(2,"0")}`;
    })(),
  } : THEMES[0]);
  const bgPattern = `url("data:image/svg+xml,${encodeURIComponent(getPatternSvg(activePatternId, currentTheme.accent))}")`;

  return <div style={{background:`${bgPattern}, ${currentTheme.light}`,backgroundRepeat:"repeat",minHeight:"100vh",fontFamily:"'Inter','Helvetica Neue',sans-serif",color:C.text,transition:"background 0.3s"}}>
    <div style={{height:4,background:currentTheme.accent,transition:"background 0.3s"}}/>
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
      <div style={{minWidth:120}}>
        <div style={{fontWeight:800,fontSize:20,letterSpacing:-0.5}}>⚡ Family Fitness</div>
      </div>
      <div style={{flex:1}}/>
      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:120,justifyContent:"flex-end"}}>
        <button onClick={prevMo} style={navBtn}>‹</button>
        <span style={{fontWeight:700,fontSize:14,minWidth:100,textAlign:"center"}}>{MONTHS[mo]} {yr}</span>
        <button onClick={nextMo} disabled={isCurMo} style={{...navBtn,opacity:isCurMo?0.3:1}}>›</button>
        <ThemePicker theme={theme} setTheme={setTheme}/>
        <PatternPicker pattern={pattern} setPattern={setPattern} accent={currentTheme.accent}/>
        <button onClick={()=>setEditM("new")} style={{background:currentTheme.accent,color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>+ Add member</button>
      </div>
    </div>

    {/* Tab bar */}
    {members.length>0&&<div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:65,zIndex:40}}>
      <div style={{maxWidth:860,margin:"0 auto",padding:"0 16px",display:"flex",gap:0,overflowX:"auto"}}>
        {members.map(m=>(
          <button key={m.id} onClick={()=>{setActiveTab(m.id);setPpPanelFor(null);}} style={{
            padding:"12px 20px",border:"none",borderBottom:`3px solid ${activeTab===m.id?m.color:"transparent"}`,
            background:"none",cursor:"pointer",fontWeight:activeTab===m.id?700:500,
            fontSize:14,color:activeTab===m.id?m.color:C.muted,
            whiteSpace:"nowrap",transition:"all 0.15s",
          }}>{m.name}</button>
        ))}
        <button onClick={()=>{setActiveTab(null);setPpPanelFor(null);}} style={{
          padding:"12px 20px",border:"none",borderBottom:`3px solid ${activeTab===null?currentTheme.accent:"transparent"}`,
          background:"none",cursor:"pointer",fontWeight:activeTab===null?700:500,
          fontSize:14,color:activeTab===null?currentTheme.accent:C.muted,
          whiteSpace:"nowrap",transition:"all 0.15s",
        }}>Family</button>
      </div>
    </div>}

    <div style={{maxWidth:(activeTab&&ppPanelFor===activeTab)?1300:860,margin:"0 auto",padding:"24px 16px",display:"flex",flexDirection:"column",gap:20,transition:"max-width 0.2s"}}>
      {members.length===0&&<div style={{textAlign:"center",padding:60,color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🌱</div>
        <div style={{fontSize:16,fontWeight:600}}>No members yet. Add one to get started.</div>
      </div>}

      {/* Individual member tab */}
      {activeTab&&members.filter(m=>m.id===activeTab).map(m=>(
        <div key={m.id} style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-start",justifyContent:"center"}}>
          <div style={{flex:"1 1 460px",maxWidth:860,minWidth:0}}>
            <MemberCard member={m} logs={logs} allMembers={members}
              onLogAll={handleLogAll} onEggChange={handleEggChange} onEdit={m=>setEditM(m)} onNewBadge={handleBadge} year={yr} month={mo} theme={theme}
              onOpenPP={(id)=>setPpPanelFor(id)} onGrowthSave={handleGrowthSave}
              onGkSave={handleGkSave} onBraverySave={handleBraverySave}/>
          </div>
          {ppPanelFor===m.id&&<div style={{flex:"1 1 320px",maxWidth:380,minWidth:280}}>
            <PowerPointsPanel member={m} logs={logs} onClose={()=>setPpPanelFor(null)}/>
          </div>}
        </div>
      ))}

      {/* Family tab */}
      {activeTab===null&&members.length>0&&<FamilyDashboard members={members} logs={logs} yr={yr} mo={mo} MONTHS={MONTHS}/>}
    </div>

    {celebration&&<CelebrationScreen badge={celebration} memberName={celebration.memberName} onClose={()=>setCelebration(null)}/>}
    {toasts.length>0&&<Toast badge={toasts[0]} onDismiss={()=>setToasts(q=>q.slice(1))}/>}
    {editM&&<EditModal member={editM==="new"?null:editM} isNew={editM==="new"} onSave={handleSave} onDelete={handleDel} onClose={()=>setEditM(null)}/>}
  </div>;
}
