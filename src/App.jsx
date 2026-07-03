import { useState, useEffect, useCallback, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#F7F5F0", surface:"#FFFFFF", border:"#E8E4DC",
  text:"#1A1A1A", muted:"#8A8580",
  done:"#3D9E6E", partial:"#E8A838", missed:"#E05C5C", empty:"#D9D5CD",
};
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
    if(d<=today&&l.status!=="skipped"&&l.value>best) best=l.value;
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

// ── Member-level consistency (handles alternating) ───────────────────────────
function memberConsPct(member, logs, y, m){
  const sd=member.startDate||null;
  if(!member.alternating) {
    const acts=member.activities||[];
    const pcts=acts.map(a=>consPct(getActivityLogs(logs,member.id,a.id),y,m,sd));
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
    const summaries = acts.map(a=>monthSummary(getActivityLogs(logs,member.id,a.id),y,m,sd));
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
  {level:1,  pp:0,      title:"Rookie",     icon:"🌱"},
  {level:2,  pp:200,    title:"Trainee",    icon:"🔰"},
  {level:3,  pp:500,    title:"Cadet",      icon:"🥉"},
  {level:4,  pp:900,    title:"Scout",      icon:"🎯"},
  {level:5,  pp:1500,   title:"Fighter",    icon:"⚔️"},
  {level:6,  pp:2500,   title:"Brawler",    icon:"🥊"},
  {level:7,  pp:4000,   title:"Warrior",    icon:"🛡️"},
  {level:8,  pp:6000,   title:"Gladiator",  icon:"🏟️"},
  {level:9,  pp:7200,   title:"Spartan",    icon:"⚡"},
  {level:10, pp:8600,   title:"Centurion",  icon:"🎖️"},
  {level:11, pp:10300,  title:"Champion",   icon:"🏆"},
  {level:12, pp:12300,  title:"Conqueror",  icon:"🗡️"},
  {level:13, pp:14700,  title:"Vanguard",   icon:"🚩"},
  {level:14, pp:17600,  title:"Hero",       icon:"🦸"},
  {level:15, pp:21000,  title:"Guardian",   icon:"🏰"},
  {level:16, pp:25100,  title:"Sentinel",   icon:"🗿"},
  {level:17, pp:30000,  title:"Legend",     icon:"🌟"},
  {level:18, pp:36000,  title:"Mythic",     icon:"🔱"},
  {level:19, pp:43000,  title:"Paragon",    icon:"💠"},
  {level:20, pp:51500,  title:"Master",     icon:"💎"},
  {level:21, pp:61500,  title:"Elite",      icon:"👑"},
  {level:22, pp:73500,  title:"Ascendant",  icon:"✨"},
  {level:23, pp:88000,  title:"Titan",      icon:"🌋"},
  {level:24, pp:105000, title:"Warlord",    icon:"🔥"},
  {level:25, pp:125000, title:"Immortal",   icon:"🌌"},
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

function isMysteryBonusDay(memberId, dateStr){
  // Seed = memberId + year + week number → deterministic random day of week
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const week = getWeekNumber(dateStr);
  // Simple hash of memberId + year + week
  const seed = [...(memberId + year + week).toString()].reduce((acc,c)=>acc*31+c.charCodeAt(0),0);
  const bonusDow = Math.abs(seed) % 7; // 0=Sun, 1=Mon ... 6=Sat
  return d.getDay() === bonusDow;
}

function computePowerPoints(member, logs){
  const today = todayStr();
  const acts = member.activities || [];
  const sd = member.startDate || null;

  // Collect all days across all activities
  const allDates = new Set();
  for(const a of acts){
    const al = getActivityLogs(logs, member.id, a.id);
    for(const d of Object.keys(al)) if(d <= today && (!sd || d >= sd)) allDates.add(d);
  }
  const sortedDates = [...allDates].sort();

  let totalPP = 100; // base starting points
  let breakdown = {atTarget:0, aboveTarget:0, belowTarget:0, pb:0, shielded:0, skipped:0, streakBonus:0, streakBreak:0, mysteryDays:0};
  let prevStreak = 0;
  let levelHistory = []; // [{level, title, icon, date}]
  let lastLevelSeen = 1;
  let dailyEarned = {}; // dateStr -> net PP change that day (for accurate weekPP/pace)

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

      if(anyShielded){ totalPP += 25; breakdown.shielded += 25; }
      else if(anySkipped){ totalPP = Math.max(0, totalPP - 25); breakdown.skipped -= 25; }
      else if(doneActs.length > 0){
        // Use best activity for scoring
        let bestPts = 0;
        for(const a of doneActs){
          const l = getActivityLogs(logs, member.id, a.id)[dateStr];
          const effectiveTarget = l.target || a.target;
          const isPB = l.value > actBests[a.id] && l.value > effectiveTarget;
          if(isPB) actBests[a.id] = l.value;
          const basePts = isPB ? 250 : l.value > effectiveTarget ? 200 : l.value >= effectiveTarget ? 100 : 50;
          if(basePts > bestPts) bestPts = basePts;
        }
        const mysteryMult = isMysteryBonusDay(member.id, dateStr) ? 2 : 1;
        const earned = Math.round(bestPts * multiplier * mysteryMult);
        const bonus = earned - bestPts;
        totalPP += earned;
        if(bestPts === 250) breakdown.pb += earned;
        else if(bestPts === 200) breakdown.aboveTarget += earned;
        else if(bestPts === 100) breakdown.atTarget += earned;
        else breakdown.belowTarget += earned;
        breakdown.streakBonus += bonus;
      }
    } else {
      // Non-alternating: score each activity
      for(const a of acts){
        const al = getActivityLogs(logs, member.id, a.id);
        const l = al[dateStr];
        if(!l) continue;
        const effectiveTarget = l.target || a.target;
        if(l.status === "shielded"){ totalPP += 25; breakdown.shielded += 25; }
        else if(l.status === "skipped"){ totalPP = Math.max(0, totalPP - 25); breakdown.skipped -= 25; }
        else if(l.value > 0){
          const isPB = l.value > actBests[a.id] && l.value > effectiveTarget;
          if(isPB) actBests[a.id] = l.value;
          const basePts = isPB ? 250 : l.value > effectiveTarget ? 200 : l.value >= effectiveTarget ? 100 : 50;
          const mysteryMult = isMysteryBonusDay(member.id, dateStr) ? 2 : 1;
          const earned = Math.round(basePts * multiplier * mysteryMult);
          const bonus = earned - basePts;
          totalPP += earned;
          if(basePts === 250) breakdown.pb += earned;
          else if(basePts === 200) breakdown.aboveTarget += earned;
          else if(basePts === 100) breakdown.atTarget += earned;
          else breakdown.belowTarget += earned;
          breakdown.streakBonus += bonus;
        }
      }
    }
    totalPP = Math.max(0, totalPP);
    dailyEarned[dateStr] = totalPP - ppBeforeDay; // net change this day, multiplier already applied

    // Track level-up moments
    const dayLevel = getLevel(totalPP);
    if(dayLevel.level > lastLevelSeen){
      levelHistory.push({level:dayLevel.level, title:dayLevel.title, icon:dayLevel.icon, date:dateStr});
      lastLevelSeen = dayLevel.level;
    }
  }

  // This week's PP — sum of actual net daily earnings (multiplier + mystery bonus already applied)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0,10);
  let weekPP = 0;
  for(const dateStr of sortedDates){
    if(dateStr < weekStartStr) continue;
    weekPP += Math.max(0, dailyEarned[dateStr] || 0); // only count positive earnings for pace, not penalties
  }

  return { total: Math.round(totalPP), breakdown, weekPP, levelHistory };
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
  let totalDone=0,bestVal=0;
  for(const[,l]of entries) if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0){totalDone++;if(l.value>bestVal)bestVal=l.value;}
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
  let perfMon=false,perfSun=false;
  for(const ym of mons){
    const[y,m]=ym.split("-").map(Number);const dm=new Date(y,m,0).getDate();
    let am=true,hm=false,as_=true,hs=false;
    for(let day=1;day<=dm;day++){
      const dt=new Date(y,m-1,day);const dow=dt.getDay();
      const key=`${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      if(key>today) continue;
      if(dow===1){hm=true;const l=al[key];if(!l||l.status==="skipped")am=false;}
      if(dow===0){hs=true;const l=al[key];if(!l||l.status==="skipped")as_=false;}
    }
    if(hm&&am)perfMon=true;if(hs&&as_)perfSun=true;
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
    bestWeek,consec5w,comeback,perfMon,perfSun,perfWknd,trackDays,overStreak,steadyStreak,
    totalVol,unit:"",bestMonthDays,famDays:0,famWeeks:0,famActive:false};
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
  // PP level ups (levels 5+ get celebration, spread across all 25 levels)
  "pp_level_5","pp_level_7","pp_level_9","pp_level_11","pp_level_13",
  "pp_level_15","pp_level_17","pp_level_19","pp_level_21","pp_level_23","pp_level_25"
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
  const init=member.activities.map(a=>{
    const ex=getActivityLogs(logs,member.id,a.id)[dateStr];
    return{actId:a.id,status:ex?.status??"done",value:ex?.value??a.target};
  });
  const[entries,setEntries]=useState(init);
  const upd=(id,f,v)=>setEntries(p=>p.map(e=>e.actId===id?{...e,[f]:v}:e));
  const isDecimal=(u)=>["km","miles","kg","hrs"].includes(u);

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:18,padding:24,width:"100%",maxWidth:360,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:26}}>{member.emoji}</span>
        <div><div style={{fontWeight:700,fontSize:16}}>{member.name}</div><div style={{fontSize:12,color:C.muted}}>{displayDate}</div></div>
      </div>
      {member.activities.map((act,i)=>{
        const en=entries.find(e=>e.actId===act.id);
        if(!en) return null;
        return <div key={act.id}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{act.name}</div>
              <div style={{fontSize:11,color:C.muted}}>Target: {act.target} {act.unit}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>upd(act.id,"status","done")} style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${en.status==="done"?member.color:C.border}`,background:en.status==="done"?member.color:"transparent",color:en.status==="done"?"#fff":C.muted,fontWeight:600,cursor:"pointer",fontSize:12}}>✓ Done</button>
              <button onClick={()=>upd(act.id,"status","skipped")} style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${en.status==="skipped"?C.missed:C.border}`,background:en.status==="skipped"?C.missed:"transparent",color:en.status==="skipped"?"#fff":C.muted,fontWeight:600,cursor:"pointer",fontSize:12}}>✗ Skip</button>
            </div>
          </div>
          {en.status==="done"&&<div style={{display:"flex",alignItems:"center",gap:10,background:member.color+"0D",borderRadius:10,padding:"10px 12px",marginBottom:4}}>
            <input type="number" min={0} step={isDecimal(act.unit)?0.1:1}
              value={en.value} onChange={e=>upd(act.id,"value",parseFloat(e.target.value)||0)}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:20,fontWeight:700,outline:"none",background:"#fff"}}/>
            <span style={{fontSize:13,color:C.muted,fontWeight:600,minWidth:36}}>{act.unit}</span>
          </div>}
          {i<member.activities.length-1&&<div style={{height:1,background:C.border,margin:"14px 0"}}/>}
        </div>;
      })}
      <div style={{display:"flex",gap:8,marginTop:20}}>
        <button onClick={()=>setEntries(p=>p.map(e=>({...e,status:"skipped"})))} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",cursor:"pointer",fontWeight:600,color:C.muted,fontSize:13}}>Skip all</button>
        <button onClick={onClose} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1.5px solid ${C.border}`,background:"none",cursor:"pointer",fontWeight:600,color:C.muted}}>Cancel</button>
        <button onClick={()=>onSaveAll(entries)} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",background:member.color,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>Save all</button>
      </div>
      {/* Shield option */}
      {shieldsLeft>0&&<div style={{marginTop:10,padding:"10px 14px",background:"#E3F2FD",border:"1.5px solid #90CAF9",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:13,color:"#1565C0"}}>🛡️ Use a shield</div>
          <div style={{fontSize:11,color:"#1976D2"}}>{shieldsLeft} of 4 remaining this month · Protects your streak</div>
        </div>
        <button onClick={()=>onSaveAll(entries.map(e=>({...e,status:"shielded",value:0})))} style={{background:"#1976D2",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>Use shield</button>
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
function CalCell({dateStr,member,logs,isToday,onClick}){
  const future=isFuture(dateStr)||(member.startDate&&dateStr<member.startDate);
  const status=future?"future":dayStatus(member,logs,dateStr);
  const bg={future:"transparent",empty:C.empty,skipped:C.missed,done:C.done,shielded:"#BBDEFB"}[status]||C.empty;

  // Check if any activity exceeded target or set a PB on this day
  const acts=member.activities||[];
  let aboveTarget=false;
  let isPB=false;
  let displayVal=null;
  if(!future&&status==="done"&&acts.length>0){
    for(const a of acts){
      const al=getActivityLogs(logs,member.id,a.id);
      const l=al[dateStr];
      if(l&&l.status!=="skipped"&&l.value>0){
        const effectiveTarget=l.target||a.target; // use stored target if available
        if(l.value>effectiveTarget){
          aboveTarget=true;
          if(acts.length===1) displayVal=`${l.value}${a.unit}`;
        }
        // PB: this day's value equals the all-time best AND it's above effective target
        const best=allTimeBest(al);
        if(l.value===best&&l.value>effectiveTarget) isPB=true;
      }
    }
  }

  // Above target = richer green + gold border
  const borderColor = aboveTarget
    ? "#C9A800"
    : isToday
      ? member.color
      : C.border;
  const borderWidth = aboveTarget || isToday ? "2px" : "1px";
  const bgColor = aboveTarget ? "#2E8B57" : bg; // deeper green for above target

  return <div onClick={()=>!future&&onClick(dateStr)} style={{
    background:bgColor,
    border:`${borderWidth} solid ${borderColor}`,
    borderRadius:7,minHeight:46,cursor:future?"default":"pointer",
    opacity:future?0.3:1,display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",gap:1,
    transition:"transform 0.1s",position:"relative",
  }}
  onMouseEnter={e=>{if(!future)e.currentTarget.style.transform="scale(1.07)";}}
  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
    {/* Shield icon for protected days */}
    {status==="shielded"&&<span style={{fontSize:16}}>🛡️</span>}
    {/* PB crown or star for above target */}
    {isPB&&<span style={{position:"absolute",top:1,right:2,fontSize:9,lineHeight:1}}>👑</span>}
    {!isPB&&aboveTarget&&<span style={{position:"absolute",top:2,right:3,fontSize:8,lineHeight:1}}>⭐</span>}
    <span style={{fontSize:10,color:status==="empty"||future?C.muted:"#fff",fontWeight:600}}>
      {new Date(dateStr+"T00:00:00").getDate()}
    </span>
    {(isPB||displayVal)&&<span style={{fontSize:8,color:"rgba(255,255,255,0.9)",fontWeight:700,lineHeight:1}}>
      {isPB?`PB ${displayVal||""}`:displayVal}
    </span>}
  </div>;
}


// ── Badge Drawer ──────────────────────────────────────────────────────────────
function BadgeDrawer({member, allEarned, acts, logs, onClose}){
  const personalBadges = BADGES.filter(b=>!FAM_IDS.has(b.id));
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
function PowerPointsDrawer({member, logs, onClose, onLevelUp}){
  const {total, breakdown, weekPP, levelHistory} = computePowerPoints(member, logs);
  const projection = projectNextLevel(member, logs);
  const level = getLevel(total);
  const nextLevel = getNextLevel(total);
  const pct = nextLevel ? Math.round(((total - level.pp) / (nextLevel.pp - level.pp)) * 100) : 100;
  const [showPointsLegend, setShowPointsLegend] = useState(false);
  const [showLevelsLegend, setShowLevelsLegend] = useState(false);

  const earnedLevels = PP_LEVELS.filter(l => total >= l.pp);
  const lockedLevels = PP_LEVELS.filter(l => total < l.pp);

  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
    <div style={{position:"fixed",top:0,right:0,height:"100%",width:"min(480px,92vw)",
      background:C.surface,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.15)",
      display:"flex",flexDirection:"column",animation:"slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)"}}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>{member.emoji}</span>
            <div>
              <div style={{fontWeight:800,fontSize:18}}>{member.name}</div>
              <div style={{fontSize:12,color:C.muted}}>⚡ Power Points</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
            padding:"6px 10px",cursor:"pointer",fontSize:18,color:C.muted}}>×</button>
        </div>

        {/* Big PP number + level */}
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:14,padding:"20px 20px 16px",marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1,marginBottom:4}}>TOTAL POWER POINTS</div>
              <div style={{fontSize:40,fontWeight:900,color:"#FFD700",lineHeight:1}}>{total.toLocaleString()} <span style={{fontSize:18}}>⚡</span></div>
              {weekPP>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:4}}>+{weekPP.toLocaleString()} this week</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:32}}>{level.icon}</div>
              <div style={{fontWeight:800,fontSize:14,color:"#FFD700"}}>{level.title}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Level {level.level}</div>
            </div>
          </div>
          {/* Progress bar */}
          {nextLevel ? <>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:99,height:8,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#FFD700,#FFA500)",borderRadius:99,transition:"width 0.6s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.5)"}}>
              <span>{level.icon} {level.title}</span>
              <span>{(nextLevel.pp - total).toLocaleString()} PP to {nextLevel.icon} {nextLevel.title}</span>
            </div>
          </> : <div style={{fontSize:12,color:"#FFD700",fontWeight:700,textAlign:"center"}}>🌌 Maximum Level Reached!</div>}
        </div>

        {/* Pace projection */}
        {projection&&projection.daysAway!==null&&<div style={{
          marginTop:10,background:"#FFFDE7",border:"1.5px solid #F9A825",borderRadius:10,
          padding:"9px 14px",display:"flex",alignItems:"center",gap:8,
        }}>
          <span style={{fontSize:16}}>🔮</span>
          <span style={{fontSize:12,color:"#7A6200"}}>
            At your current pace, you'll reach <strong>{projection.nextLevel.icon} {projection.nextLevel.title}</strong> in
            {" "}<strong>{projection.daysAway===1?"about a day":projection.daysAway<7?`about ${projection.daysAway} days`:projection.weeksAway===1?"about a week":`about ${projection.weeksAway} weeks`}</strong>
          </span>
        </div>}
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 24px 24px"}}>

        {/* Breakdown */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:10}}>HOW YOU EARNED IT</div>
          <div style={{background:C.bg,borderRadius:12,overflow:"hidden"}}>
            {[
              {label:"Personal best days",val:breakdown.pb,color:"#FFD700",show:breakdown.pb>0},
              {label:"Above target days",val:breakdown.aboveTarget,color:C.done,show:breakdown.aboveTarget>0},
              {label:"At target days",val:breakdown.atTarget,color:C.done,show:breakdown.atTarget>0},
              {label:"Below target days",val:breakdown.belowTarget,color:C.partial,show:breakdown.belowTarget>0},
              {label:"Shielded days",val:breakdown.shielded,color:"#5B8FD4",show:breakdown.shielded>0},
              {label:"Streak multiplier bonus",val:breakdown.streakBonus,color:"#E8A838",show:breakdown.streakBonus>0},
              {label:"Starting bonus",val:100,color:C.muted,show:true},
              {label:"🎁 Mystery bonus days",val:breakdown.mysteryDays,color:"#FFD700",show:breakdown.mysteryDays>0},
              {label:"Skipped days",val:breakdown.skipped,color:C.missed,show:breakdown.skipped<0},
              {label:"Streak break penalties",val:breakdown.streakBreak,color:C.missed,show:breakdown.streakBreak<0},
            ].filter(r=>r.show).map((row,i,arr)=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"10px 14px",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                <span style={{fontSize:13,color:C.text}}>{row.label}</span>
                <span style={{fontSize:13,fontWeight:700,color:row.color}}>{row.val>0?"+":""}{row.val.toLocaleString()} ⚡</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"12px 14px",background:"#1a1a2e",borderTop:`2px solid ${C.border}`}}>
              <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>Total</span>
              <span style={{fontSize:16,fontWeight:900,color:"#FFD700"}}>{total.toLocaleString()} ⚡</span>
            </div>
          </div>
        </div>

        {/* Levels earned */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:0.5,marginBottom:10}}>
            LEVELS UNLOCKED ({earnedLevels.length}/{PP_LEVELS.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[...earnedLevels].reverse().map(l=>{
              const histEntry = levelHistory.find(h=>h.level===l.level);
              const dateLabel = histEntry ? new Date(histEntry.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : (l.level===1?"Day 1":null);
              return <div key={l.level} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                background:l.level===level.level?"#1a1a2e":C.bg,borderRadius:10,
                border:`1.5px solid ${l.level===level.level?"#FFD700":C.border}`}}>
                <span style={{fontSize:20}}>{l.icon}</span>
                <div style={{flex:1}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:13,color:l.level===level.level?"#FFD700":C.text}}>{l.title}</span>
                    {l.level===level.level&&<span style={{fontSize:10,color:"#FFD700",marginLeft:8}}>← YOU ARE HERE</span>}
                  </div>
                  {dateLabel&&<div style={{fontSize:10,color:l.level===level.level?"rgba(255,255,255,0.4)":C.muted,marginTop:1}}>Reached {dateLabel}</div>}
                </div>
                <span style={{fontSize:11,color:l.level===level.level?"rgba(255,255,255,0.4)":C.muted}}>Lv.{l.level} · {l.pp.toLocaleString()} PP</span>
              </div>;
            })}
            {lockedLevels.slice(0,3).map(l=>(
              <div key={l.level} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                background:C.bg,borderRadius:10,border:`1px solid ${C.border}`,opacity:0.4,filter:"grayscale(1)"}}>
                <span style={{fontSize:20}}>{l.icon}</span>
                <div style={{flex:1}}><span style={{fontWeight:600,fontSize:13,color:C.muted}}>{l.title}</span></div>
                <span style={{fontSize:11,color:C.muted}}>Lv.{l.level} · {l.pp.toLocaleString()} PP</span>
              </div>
            ))}
          </div>
        </div>

        {/* Points legend (collapsible) */}
        <div style={{marginBottom:12}}>
          <button onClick={()=>setShowPointsLegend(s=>!s)} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.muted,width:"100%",textAlign:"left"}}>
            {showPointsLegend?"▾":"▸"} How points are calculated
          </button>
          {showPointsLegend&&<div style={{background:C.bg,borderRadius:"0 0 10px 10px",padding:14,border:`1px solid ${C.border}`,borderTop:"none"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8,letterSpacing:0.5}}>DAILY POINTS</div>
            {[
              {icon:"🌟",label:"Personal best day",val:"+250 ⚡"},
              {icon:"💪",label:"Above target",val:"+200 ⚡"},
              {icon:"✅",label:"At target",val:"+100 ⚡"},
              {icon:"📉",label:"Below target",val:"+50 ⚡"},
              {icon:"🛡️",label:"Shielded day",val:"+25 ⚡"},
              {icon:"❌",label:"Skipped day",val:"-25 ⚡"},
              {icon:"💔",label:"Breaking 7+ streak",val:"-100 ⚡"},
            ].map(r=><div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12}}>{r.icon} {r.label}</span>
              <span style={{fontSize:12,fontWeight:700,color:r.val.startsWith("-")?C.missed:C.done}}>{r.val}</span>
            </div>)}
            <div style={{fontSize:11,fontWeight:700,color:C.muted,margin:"12px 0 8px",letterSpacing:0.5}}>STREAK MULTIPLIERS</div>
            {[
              {streak:"30+ days",mult:"5x"},
              {streak:"14–29 days",mult:"3x"},
              {streak:"7–13 days",mult:"2x"},
              {streak:"3–6 days",mult:"1.5x"},
              {streak:"1–2 days",mult:"1x"},
            ].map(r=><div key={r.streak} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12}}>🔥 {r.streak}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#E8A838"}}>{r.mult}</span>
            </div>)}
            <div style={{fontSize:11,color:C.muted,marginTop:8}}>Multipliers apply to positive points only, not penalties.</div>
          </div>}
        </div>

        {/* All levels legend (collapsible) */}
        <div>
          <button onClick={()=>setShowLevelsLegend(s=>!s)} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.muted,width:"100%",textAlign:"left"}}>
            {showLevelsLegend?"▾":"▸"} View all {PP_LEVELS.length} levels
          </button>
          {showLevelsLegend&&<div style={{background:C.bg,borderRadius:"0 0 10px 10px",border:`1px solid ${C.border}`,borderTop:"none",overflow:"hidden"}}>
            {PP_LEVELS.map((l,i)=>{
              const isCurrentLevel = l.level === level.level;
              const isEarned = total >= l.pp;
              return <div key={l.level} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                background:isCurrentLevel?"#1a1a2e":"transparent",
                borderBottom:i<PP_LEVELS.length-1?`1px solid ${C.border}`:"none",
                opacity:isEarned?1:0.4}}>
                <span style={{fontSize:16,minWidth:24}}>{l.icon}</span>
                <div style={{flex:1}}>
                  <span style={{fontSize:12,fontWeight:isCurrentLevel?700:500,
                    color:isCurrentLevel?"#FFD700":isEarned?C.text:C.muted}}>{l.title}</span>
                  {isCurrentLevel&&<span style={{fontSize:10,color:"#FFD700",marginLeft:6}}>← YOU</span>}
                </div>
                <span style={{fontSize:11,color:isCurrentLevel?"rgba(255,255,255,0.5)":C.muted}}>Lv.{l.level}</span>
                <span style={{fontSize:11,color:isCurrentLevel?"rgba(255,255,255,0.5)":C.muted,minWidth:70,textAlign:"right"}}>{l.pp.toLocaleString()} PP</span>
              </div>;
            })}
          </div>}
        </div>

      </div>
    </div>
  </>;
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

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({member,logs,allMembers,onLogAll,onEdit,onNewBadge,year,month}){
  const today=todayStr();
  const[showCal,setShowCal]=useState(true);
  const[showBadges,setShowBadges]=useState(false);
  const[showStats,setShowStats]=useState(false);
  const[showHeatmap,setShowHeatmap]=useState(false);
  const[showPP,setShowPP]=useState(false);
  const[mysteryReveal,setMysteryReveal]=useState(null); // {normalPP, bonusPP}
  const[modal,setModal]=useState(null);
  const ppData = computePowerPoints(member, logs);
  const ppLevel = getLevel(ppData.total);
  const ppNext = getNextLevel(ppData.total);

  const acts=member.activities||[];
  const avgPct=memberConsPct(member,logs,year,month);
  const streaks=acts.map(a=>streakCount(getActivityLogs(logs,member.id,a.id)));
  const bestStreak=streaks.length?Math.max(...streaks):0;

  const todayStats=acts.map(a=>{const l=getActivityLogs(logs,member.id,a.id)[today];return{act:a,log:l};});
  const doneToday=todayStats.filter(x=>x.log&&x.log.status!=="skipped");
  const loggedCount=doneToday.length;

  const fs=computeFamStats(allMembers,logs);
  const allEarned=new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,member.id,a.id),a.target,a.unit,fs)));
  const personalBadges=BADGES.filter(b=>!FAM_IDS.has(b.id));

  const dCount=daysInMonth(year,month);
  const firstDay=firstDayOfMonth(year,month);
  const calDays=[];
  for(let i=0;i<firstDay;i++) calDays.push(null);
  for(let d=1;d<=dCount;d++) calDays.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  return <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:28}}>{member.emoji}</span>
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
    <div onClick={()=>setShowPP(true)} style={{
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
          if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>bestVal){
            bestVal=l.value;bestDate=d;
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
          <CalCell key={ds} dateStr={ds} member={member} logs={logs} isToday={ds===today} onClick={d=>setModal(d)}/>)}
      </div>
    </div>}

    {/* Badges + Stats footer */}
    <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
      <span style={{fontSize:12,color:C.muted}}><span style={{fontWeight:700,color:C.text}}>{allEarned.size}</span> / {personalBadges.length} badges earned</span>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setShowStats(true)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:600,fontSize:12,color:C.muted}}>📊 Stats</button>
        <button onClick={()=>setShowBadges(true)} style={{background:member.color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>🏆 Badges</button>
      </div>
    </div>
    {showBadges&&<BadgeDrawer member={member} allEarned={allEarned} acts={acts} logs={logs} onClose={()=>setShowBadges(false)}/>}
    {showStats&&<AllTimeStats member={member} logs={logs} onClose={()=>setShowStats(false)}/>}
    {showPP&&<PowerPointsDrawer member={member} logs={logs} onClose={()=>setShowPP(false)}/>}
    {mysteryReveal&&<MysteryBonusReveal normalPP={mysteryReveal.normalPP} bonusPP={mysteryReveal.bonusPP} onClose={()=>setMysteryReveal(null)}/>}

    {modal&&(member.alternating&&acts.length>1
      ?<AlternatingLogModal dateStr={modal} member={member} logs={logs} shieldsLeft={4-shieldsUsed(logs,member.id,acts)}
      onSaveAll={entries=>{
        // Stamp current target onto each entry so history is preserved
        const stampedEntries=entries.map(e=>{
          const act=acts.find(a=>a.id===e.actId);
          return act?{...e,target:act.target}:e;
        });
        const prev=new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,member.id,a.id),a.target,a.unit)));
        onLogAll(member.id,modal,stampedEntries);
        setTimeout(()=>{
          const next=acts.flatMap(a=>{
            const en=stampedEntries.find(e=>e.actId===a.id);if(!en)return[];
            const nl={...getActivityLogs(logs,member.id,a.id),[modal]:{value:en.value,status:en.status,target:en.target}};
            return earnedBadges(nl,a.target,a.unit);
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
                tier:newLevel.level>=21?'gold':newLevel.level>=12?'silver':'bronze'},member.name);
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
  const[startDate,setStartDate]=useState(member?.startDate??"");
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
        <button onClick={()=>onSave({id:member?.id??Date.now().toString(),name,emoji,color,activities:acts,alternating,startDate})} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",background:color,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>Save</button>
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
        entries.push({date:d,member:m,activity:a,log:l,isPB:l.value===best&&l.value>a.target,isAbove:l.value>a.target});
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
function AllTimeStats({member,logs,onClose}){
  const today=todayStr();
  const acts=member.activities||[];

  const stats=acts.map(a=>{
    const al=getActivityLogs(logs,member.id,a.id);
    const entries=Object.entries(al).filter(([d])=>d<=today).sort(([x],[y])=>x.localeCompare(y));
    const done=entries.filter(([,l])=>l.status!=="skipped"&&l.status!=="shielded"&&l.value>0);
    const totalVol=done.reduce((s,[,l])=>s+l.value,0);
    const best=done.reduce((b,[,l])=>Math.max(b,l.value),0);
    const bestDay=done.find(([,l])=>l.value===best)?.[0];
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

  const overallStreak=Math.max(0,...acts.map(a=>streakCount(getActivityLogs(logs,member.id,a.id))));
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
function ConsistencyTrend({members, logs}){
  const today = new Date(todayStr());

  // Build last 8 weeks of data
  const weeks = [];
  for(let w=7; w>=0; w--){
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w*7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const label = weekEnd.toLocaleDateString("en-IN",{day:"numeric",month:"short"});

    const memberPcts = members.map(m=>{
      const acts = m.activities||[];
      const sd = m.startDate||null;
      let done=0, app=0;
      for(let d=0; d<7; d++){
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate()+d);
        const k = dt.toISOString().slice(0,10);
        if(k > todayStr()) continue;
        if(sd && k < sd) continue;
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
    <div style={{fontWeight:700,fontSize:14,color:C.muted,letterSpacing:0.5,marginBottom:4}}>📈 CONSISTENCY TREND · LAST 8 WEEKS</div>
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
    const streaks = acts.map(a=>streakCount(getActivityLogs(logs,m.id,a.id)));
    const curStreak = streaks.length?Math.max(...streaks):0;
    let bestEver=0;
    for(const a of acts){
      const al=getActivityLogs(logs,m.id,a.id);
      const entries=Object.entries(al).filter(([d])=>d<=today).sort(([x],[y])=>x.localeCompare(y));
      let run=0;
      for(const[,l]of entries){if(l.status!=="skipped"&&l.status!=="shielded"&&l.value>0){run++;if(run>bestEver)bestEver=run;}else run=0;}
    }
    const shields = shieldsUsed(logs,m.id,acts);
    const allEarned = new Set(acts.flatMap(a=>earnedBadges(getActivityLogs(logs,m.id,a.id),a.target,a.unit)));
    const personalBadges = BADGES.filter(b=>!FAM_IDS.has(b.id));
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
          <div key={s.m.id} style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:22}}>{s.m.emoji}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{s.m.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{(s.m.activities||[]).map(a=>a.name).join(" · ")}</div>
                </div>
              </div>
              <div style={{fontWeight:800,fontSize:22,color:s.m.color}}>{s.avgPct}%</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[
                {icon:"✅",label:"Done",val:s.done},
                {icon:"❌",label:"Missed",val:s.missed},
                {icon:"🔥",label:"Streak",val:s.curStreak?`${s.curStreak}d`:"—"},
                {icon:"🏆",label:"Badges",val:`${s.badgeCount}/${s.totalBadges}`},
              ].map(stat=>(
                <div key={stat.label} style={{background:C.bg,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontSize:14}}>{stat.icon}</div>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginTop:2}}>{stat.val}</div>
                  <div style={{fontSize:10,color:C.muted}}>{stat.label}</div>
                </div>
              ))}
            </div>
            {/* Best streak row */}
            {s.bestEver>0&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>
              Best ever streak: <span style={{fontWeight:700,color:C.text}}>{s.bestEver} days</span>
              {s.shields>0&&<span style={{marginLeft:10}}>🛡️ {s.shields} shields used</span>}
            </div>}
          </div>
        ))}
      </div>

      {/* All-time volume */}
      <div style={{flex:"1 1 220px",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div style={{fontWeight:700,fontSize:13,color:C.muted,letterSpacing:0.5,marginBottom:12}}>📦 ALL-TIME VOLUME</div>
        {allActivities.map((act,ri)=>(
          <div key={act.id} style={{marginBottom:ri<allActivities.length-1?12:0}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6}}>{act.name}</div>
            {memberStats.map(s=>{
              const vol=s.volumes.find(v=>v.act.name===act.name);
              if(!vol) return null;
              return <div key={s.m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:11,color:s.m.color,fontWeight:600}}>{s.m.name}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.text}}>{vol.formatted}</span>
              </div>;
            })}
            {ri<allActivities.length-1&&<div style={{height:1,background:C.border,marginTop:8}}/>}
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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const[members,setMembers]=useState(DEF_MEMBERS);
  const[logs,setLogs]=useState({});
  const[loaded,setLoaded]=useState(false);
  const[editM,setEditM]=useState(null);
  const[toasts,setToasts]=useState([]);
  const[activeTab,setActiveTab]=useState(null); // null = show all (family summary)
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
        if(d.members&&Array.isArray(d.members)&&d.members.length>0) setMembers(d.members);
        if(d.logs&&typeof d.logs==="object") setLogs(d.logs);
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

  return <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter','Helvetica Neue',sans-serif",color:C.text}}>
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
      <div>
        <div style={{fontWeight:800,fontSize:20,letterSpacing:-0.5}}>🌿 Family Fitness</div>
        <div style={{fontSize:12,color:C.muted}}>{getSmartGreeting(members,logs)}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={prevMo} style={navBtn}>‹</button>
        <span style={{fontWeight:700,fontSize:14,minWidth:100,textAlign:"center"}}>{MONTHS[mo]} {yr}</span>
        <button onClick={nextMo} disabled={isCurMo} style={{...navBtn,opacity:isCurMo?0.3:1}}>›</button>
        <button onClick={()=>setEditM("new")} style={{background:C.done,color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>+ Add member</button>
      </div>
    </div>

    {/* Tab bar */}
    {members.length>0&&<div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:65,zIndex:40}}>
      <div style={{maxWidth:860,margin:"0 auto",padding:"0 16px",display:"flex",gap:0,overflowX:"auto"}}>
        {members.map(m=>(
          <button key={m.id} onClick={()=>setActiveTab(m.id)} style={{
            padding:"12px 20px",border:"none",borderBottom:`3px solid ${activeTab===m.id?m.color:"transparent"}`,
            background:"none",cursor:"pointer",fontWeight:activeTab===m.id?700:500,
            fontSize:14,color:activeTab===m.id?m.color:C.muted,
            whiteSpace:"nowrap",transition:"all 0.15s",
          }}>{m.name}</button>
        ))}
        <button onClick={()=>setActiveTab(null)} style={{
          padding:"12px 20px",border:"none",borderBottom:`3px solid ${activeTab===null?C.done:"transparent"}`,
          background:"none",cursor:"pointer",fontWeight:activeTab===null?700:500,
          fontSize:14,color:activeTab===null?C.done:C.muted,
          whiteSpace:"nowrap",transition:"all 0.15s",
        }}>Family</button>
      </div>
    </div>}

    <div style={{maxWidth:860,margin:"0 auto",padding:"24px 16px",display:"flex",flexDirection:"column",gap:20}}>
      {members.length===0&&<div style={{textAlign:"center",padding:60,color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🌱</div>
        <div style={{fontSize:16,fontWeight:600}}>No members yet. Add one to get started.</div>
      </div>}

      {/* Individual member tab */}
      {activeTab&&members.filter(m=>m.id===activeTab).map(m=>(
        <MemberCard key={m.id} member={m} logs={logs} allMembers={members}
          onLogAll={handleLogAll} onEdit={m=>setEditM(m)} onNewBadge={handleBadge} year={yr} month={mo}/>
      ))}

      {/* Family tab */}
      {activeTab===null&&members.length>0&&<FamilyDashboard members={members} logs={logs} yr={yr} mo={mo} MONTHS={MONTHS}/>}
    </div>

    {celebration&&<CelebrationScreen badge={celebration} memberName={celebration.memberName} onClose={()=>setCelebration(null)}/>}
    {toasts.length>0&&<Toast badge={toasts[0]} onDismiss={()=>setToasts(q=>q.slice(1))}/>}
    {editM&&<EditModal member={editM==="new"?null:editM} isNew={editM==="new"} onSave={handleSave} onDelete={handleDel} onClose={()=>setEditM(null)}/>}
  </div>;
}
