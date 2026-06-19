import React, { useState, useEffect, useCallback, useRef } from "react";

// ── Palette & helpers ──────────────────────────────────────────────────────────
const C = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  text: "#1A1A1A",
  muted: "#8A8580",
  done: "#3D9E6E",       // forest green – activity done
  partial: "#E8A838",    // amber – done but below target
  missed: "#E05C5C",     // soft red – skipped
  empty: "#D9D5CD",      // warm grey – no log yet (future/today)
  accent: "#3D9E6E",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isFuture(dateStr) {
  return dateStr > todayStr();
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function streakCount(memberLogs) {
  let count = 0;
  const d = new Date(todayStr());
  while (true) {
    const key = d.toISOString().slice(0,10);
    const log = memberLogs[key];
    if (!log || log.status === "skipped") break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function consistencyPct(logs, memberId, year, month) {
  const total = daysInMonth(year, month);
  const today = todayStr();
  let done = 0, applicable = 0;
  for (let d = 1; d <= total; d++) {
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if (key > today) continue;
    applicable++;
    const log = logs[memberId]?.[key];
    if (log && log.status !== "skipped") done++;
  }
  return applicable === 0 ? 0 : Math.round((done / applicable) * 100);
}

// ── Milestone Badge Engine ────────────────────────────────────────────────────
const BADGE_DEFS = [
  // ── 🔥 Streak badges (current streak)
  { id: "streak_3",    emoji: "🌱", label: "Seedling",          desc: "3-day streak",              tier: "bronze", check: (s) => s.streak >= 3 },
  { id: "streak_7",    emoji: "🔥", label: "On Fire",           desc: "7-day streak",              tier: "silver", check: (s) => s.streak >= 7 },
  { id: "streak_14",   emoji: "⚡", label: "Electric",          desc: "14-day streak",             tier: "silver", check: (s) => s.streak >= 14 },
  { id: "streak_21",   emoji: "🌊", label: "In the Flow",       desc: "21-day streak",             tier: "gold",   check: (s) => s.streak >= 21 },
  { id: "streak_30",   emoji: "🏆", label: "Unstoppable",       desc: "30-day streak",             tier: "gold",   check: (s) => s.streak >= 30 },
  { id: "streak_60",   emoji: "🦁", label: "Lion Heart",        desc: "60-day streak",             tier: "gold",   check: (s) => s.streak >= 60 },
  { id: "streak_90",   emoji: "🌋", label: "Force of Nature",   desc: "90-day streak",             tier: "gold",   check: (s) => s.streak >= 90 },

  // ── 📅 Total days logged
  { id: "days_1",      emoji: "👣", label: "First Step",        desc: "Logged your very first day", tier: "bronze", check: (s) => s.totalDone >= 1 },
  { id: "days_7",      emoji: "🎯", label: "Week One",          desc: "7 total days logged",        tier: "bronze", check: (s) => s.totalDone >= 7 },
  { id: "days_14",     emoji: "💪", label: "Two Weeks In",      desc: "14 total days logged",       tier: "bronze", check: (s) => s.totalDone >= 14 },
  { id: "days_30",     emoji: "🥉", label: "Month Strong",      desc: "30 total days logged",       tier: "silver", check: (s) => s.totalDone >= 30 },
  { id: "days_60",     emoji: "🥈", label: "Two Months",        desc: "60 total days logged",       tier: "silver", check: (s) => s.totalDone >= 60 },
  { id: "days_100",    emoji: "🥇", label: "Century",           desc: "100 total days logged",      tier: "gold",   check: (s) => s.totalDone >= 100 },
  { id: "days_200",    emoji: "🚀", label: "Launch Pad",        desc: "200 total days logged",      tier: "gold",   check: (s) => s.totalDone >= 200 },
  { id: "days_365",    emoji: "🌍", label: "Around the Sun",    desc: "365 total days logged",      tier: "gold",   check: (s) => s.totalDone >= 365 },

  // ── ⭐ Perfect streaks (consecutive days at/above target)
  { id: "perfect_3",   emoji: "✨", label: "Spark",             desc: "3 days at or above target in a row",  tier: "bronze", check: (s) => s.bestPerfectStreak >= 3 },
  { id: "perfect_7",   emoji: "⭐", label: "Perfect Week",      desc: "7 days at or above target in a row",  tier: "silver", check: (s) => s.bestPerfectStreak >= 7 },
  { id: "perfect_14",  emoji: "🌟", label: "Perfect Fortnight", desc: "14 days at or above target in a row", tier: "gold",   check: (s) => s.bestPerfectStreak >= 14 },
  { id: "perfect_30",  emoji: "💫", label: "Perfect Month",     desc: "30 days at or above target in a row", tier: "gold",   check: (s) => s.bestPerfectStreak >= 30 },

  // ── 📈 Monthly consistency
  { id: "cons_50",     emoji: "🌤️", label: "Getting There",    desc: "50%+ consistency in a month",  tier: "bronze", check: (s) => s.bestMonthPct >= 50 },
  { id: "cons_80",     emoji: "📈", label: "On Track",          desc: "80%+ consistency in a month",  tier: "silver", check: (s) => s.bestMonthPct >= 80 },
  { id: "cons_100",    emoji: "💎", label: "Flawless Month",    desc: "100% consistency in a month",  tier: "gold",   check: (s) => s.bestMonthPct >= 100 },
  { id: "cons_3mo",    emoji: "🏅", label: "Hat Trick",         desc: "3 months with 80%+ consistency", tier: "gold", check: (s) => s.highConsMonths >= 3 },
  { id: "cons_6mo",    emoji: "🎖️", label: "Half Year Hero",   desc: "6 months with 80%+ consistency", tier: "gold", check: (s) => s.highConsMonths >= 6 },

  // ── 🎯 Personal best value milestones
  { id: "pb_first",    emoji: "🎉", label: "New Record",        desc: "Beat your initial target at least once",  tier: "bronze", check: (s) => s.hasPB },
  { id: "pb_110",      emoji: "📊", label: "110%",              desc: "Hit 110% of your target",                 tier: "silver", check: (s) => s.bestPct >= 110 },
  { id: "pb_150",      emoji: "🚀", label: "150% Club",         desc: "Hit 150% of your target",                 tier: "gold",   check: (s) => s.bestPct >= 150 },
  { id: "pb_200",      emoji: "🌠", label: "Double Down",       desc: "Hit 200% of your target",                 tier: "gold",   check: (s) => s.bestPct >= 200 },

  // ── 📆 Weekly volume (total in a single week)
  { id: "week_5",      emoji: "🗓️", label: "5-Day Week",       desc: "5 logged days in a single week",  tier: "bronze", check: (s) => s.bestWeekDays >= 5 },
  { id: "week_7",      emoji: "🗃️", label: "Full Week",        desc: "All 7 days logged in a week",     tier: "silver", check: (s) => s.bestWeekDays >= 7 },
  { id: "week_4x",     emoji: "📆", label: "4-Week Run",        desc: "5+ days logged for 4 weeks straight", tier: "gold", check: (s) => s.consec5DayWeeks >= 4 },

  // ── 🌅 Early bird / comeback / bounce-back
  { id: "comeback",    emoji: "🦅", label: "Comeback King",     desc: "Logged 3+ days after a 7+ day gap",  tier: "silver", check: (s) => s.hasComebackStreak },
  { id: "monday",      emoji: "☀️", label: "Monday Warrior",   desc: "Logged every Monday in a month",     tier: "silver", check: (s) => s.perfectMondayMonth },
  { id: "weekend",     emoji: "🏖️", label: "Weekend Warrior",  desc: "Logged both Sat & Sun for 4 weeks",  tier: "silver", check: (s) => s.perfectWeekends >= 4 },

  // ── 🎂 Time-based milestones
  { id: "month_1",     emoji: "🎂", label: "One Month Club",    desc: "Been tracking for 1 month",           tier: "bronze", check: (s) => s.trackingDays >= 30 },
  { id: "month_3",     emoji: "🏋️", label: "Quarter Strong",   desc: "Been tracking for 3 months",          tier: "silver", check: (s) => s.trackingDays >= 90 },
  { id: "month_6",     emoji: "🌿", label: "Half Year",         desc: "Been tracking for 6 months",          tier: "gold",   check: (s) => s.trackingDays >= 180 },
  { id: "month_12",    emoji: "🌳", label: "One Full Year",     desc: "Been tracking for 12 months",         tier: "gold",   check: (s) => s.trackingDays >= 365 },

  // ── 📦 Cumulative volume (unit-agnostic totals)
  { id: "vol_50",      emoji: "🪣", label: "Half Century",      desc: "50 total units accumulated",          tier: "bronze", check: (s) => s.totalVolume >= 50 },
  { id: "vol_100",     emoji: "💯", label: "100 Club",          desc: "100 total units accumulated",         tier: "bronze", check: (s) => s.totalVolume >= 100 },
  { id: "vol_500",     emoji: "🏗️", label: "Builder",          desc: "500 total units accumulated",         tier: "silver", check: (s) => s.totalVolume >= 500 },
  { id: "vol_1000",    emoji: "🏰", label: "Grand Total",       desc: "1,000 total units accumulated",       tier: "silver", check: (s) => s.totalVolume >= 1000 },
  { id: "vol_5000",    emoji: "🌐", label: "The Long Game",     desc: "5,000 total units accumulated",       tier: "gold",   check: (s) => s.totalVolume >= 5000 },
  { id: "vol_10000",   emoji: "🌌", label: "Legendary",         desc: "10,000 total units accumulated",      tier: "gold",   check: (s) => s.totalVolume >= 10000 },

  // ── 🎯 Effort quality badges
  { id: "overachiever",emoji: "🦸", label: "Overachiever",      desc: "Exceeded target by 20%+ for 7 days in a row", tier: "silver", check: (s) => s.bestOverachieveStreak >= 7 },
  { id: "steady_7",    emoji: "🎻", label: "Steady Eddie",      desc: "Within 10% of target for 7 days straight",    tier: "silver", check: (s) => s.bestSteadyStreak >= 7 },
  { id: "steady_14",   emoji: "🎯", label: "Dead Accurate",     desc: "Within 10% of target for 14 days straight",   tier: "gold",   check: (s) => s.bestSteadyStreak >= 14 },
  { id: "no_excuses",  emoji: "☀️", label: "No Excuses",        desc: "Logged every Sunday in a calendar month",      tier: "silver", check: (s) => s.perfectSundayMonth },

  // ── 👨‍👩‍👦 Family badges (cross-member — computed separately, injected via allLogged/allActive)
  { id: "fam_day",     emoji: "🤝", label: "Family Day",        desc: "All members logged on the same day",           tier: "bronze", check: (s) => s.familyDays >= 1 },
  { id: "fam_10days",  emoji: "👨‍👩‍👦", label: "Family Strong",  desc: "10 days where all members logged",             tier: "silver", check: (s) => s.familyDays >= 10 },
  { id: "fam_week",    emoji: "🏡", label: "Family Week",       desc: "All members logged 5+ days in the same week",  tier: "silver", check: (s) => s.familyWeeks >= 1 },
  { id: "fam_trio",    emoji: "🌈", label: "The Trio",          desc: "All 3 members have 7+ total days logged",       tier: "bronze", check: (s) => s.familyAllActive },
];

// Family-only badge ids (shown in family summary, not per-member cards)
const FAMILY_BADGE_IDS = new Set(["fam_day","fam_10days","fam_week","fam_trio"]);

const TIER_COLORS = {
  bronze: { bg: "#FDF0E0", border: "#C97D3A", text: "#7A4A1E", glow: "#C97D3A33" },
  silver: { bg: "#F0F4F8", border: "#8A9BB0", text: "#3A4A5E", glow: "#8A9BB033" },
  gold:   { bg: "#FFFAE0", border: "#C9A800", text: "#7A6200", glow: "#C9A80033" },
};

function computeStats(memberLogs, target) {
  if (!memberLogs) return {
    totalDone: 0, bestValue: 0, bestPct: 0, streak: 0,
    bestPerfectStreak: 0, bestMonthPct: 0, highConsMonths: 0,
    hasPB: false, bestWeekDays: 0, consec5DayWeeks: 0,
    hasComebackStreak: false, perfectMondayMonth: false,
    perfectWeekends: 0, trackingDays: 0,
  };
  const today = todayStr();
  const entries = Object.entries(memberLogs).filter(([d]) => d <= today).sort(([a],[b]) => a.localeCompare(b));

  // ── Basic: totalDone, bestValue
  let totalDone = 0, bestValue = 0;
  for (const [, log] of entries) {
    if (log.status !== "skipped" && log.value > 0) {
      totalDone++;
      if (log.value > bestValue) bestValue = log.value;
    }
  }
  const bestPct = target > 0 ? Math.round((bestValue / target) * 100) : 0;

  // ── Current streak
  let streak = 0;
  const sd = new Date(today);
  while (true) {
    const key = sd.toISOString().slice(0,10);
    const log = memberLogs[key];
    if (!log || log.status === "skipped") break;
    streak++;
    sd.setDate(sd.getDate() - 1);
  }

  // ── Best perfect streak (consecutive at/above target)
  let bestPerfectStreak = 0, curP = 0;
  for (const [, log] of entries) {
    if (log.status !== "skipped" && log.value >= target) { curP++; if (curP > bestPerfectStreak) bestPerfectStreak = curP; }
    else curP = 0;
  }

  // ── Monthly stats
  const months = [...new Set(entries.map(([d]) => d.slice(0,7)))];
  let bestMonthPct = 0, highConsMonths = 0;
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const pct = consistencyPct({ _: memberLogs }, "_", y, m - 1);
    if (pct > bestMonthPct) bestMonthPct = pct;
    if (pct >= 80) highConsMonths++;
  }

  // ── Tracking span (days from first log to today)
  let trackingDays = 0;
  if (entries.length > 0) {
    const firstDate = new Date(entries[0][0] + "T00:00:00");
    const todayDate = new Date(today + "T00:00:00");
    trackingDays = Math.round((todayDate - firstDate) / 86400000) + 1;
  }

  // ── Best week (Mon-Sun): max logged days in any ISO week
  const weekMap = {};
  for (const [dateStr, log] of entries) {
    if (log.status === "skipped" || !log.value) continue;
    const d = new Date(dateStr + "T00:00:00");
    const dow = (d.getDay() + 6) % 7; // Mon=0
    const mon = new Date(d); mon.setDate(d.getDate() - dow);
    const wk = mon.toISOString().slice(0,10);
    weekMap[wk] = (weekMap[wk] || 0) + 1;
  }
  const bestWeekDays = Math.max(0, ...Object.values(weekMap));

  // ── Consecutive 5+ day weeks
  const weekKeys = Object.keys(weekMap).sort();
  let consec5DayWeeks = 0, cur5 = 0;
  for (const wk of weekKeys) {
    if (weekMap[wk] >= 5) { cur5++; if (cur5 > consec5DayWeeks) consec5DayWeeks = cur5; }
    else cur5 = 0;
  }

  // ── Comeback: logged 3+ days after a 7+ day gap
  let hasComebackStreak = false;
  let lastLoggedDate = null, gapDays = 0, postGapCount = 0;
  for (const [dateStr, log] of entries) {
    if (log.status === "skipped" || !log.value) {
      if (lastLoggedDate) {
        const gap = Math.round((new Date(dateStr) - new Date(lastLoggedDate)) / 86400000);
        if (gap >= 7) { gapDays = gap; postGapCount = 0; }
      }
      continue;
    }
    if (gapDays >= 7) {
      postGapCount++;
      if (postGapCount >= 3) { hasComebackStreak = true; break; }
    }
    lastLoggedDate = dateStr;
  }

  // ── Monday warrior: all Mondays logged in any month
  let perfectMondayMonth = false;
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const daysInM = new Date(y, m, 0).getDate();
    let allMondaysLogged = true, hasMon = false;
    for (let day = 1; day <= daysInM; day++) {
      const dt = new Date(y, m - 1, day);
      if (dt.getDay() !== 1) continue;
      hasMon = true;
      const key = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      if (key > today) continue;
      const log = memberLogs[key];
      if (!log || log.status === "skipped") { allMondaysLogged = false; break; }
    }
    if (hasMon && allMondaysLogged) { perfectMondayMonth = true; break; }
  }

  // ── Weekend warrior: logged both Sat & Sun for 4+ weekends
  const weekendMap = {};
  for (const [dateStr, log] of entries) {
    if (log.status === "skipped" || !log.value) continue;
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) continue;
    // Key = the Saturday of that weekend
    const sat = new Date(d);
    sat.setDate(d.getDate() - (dow === 0 ? 1 : 0));
    const wkKey = sat.toISOString().slice(0,10);
    weekendMap[wkKey] = (weekendMap[wkKey] || new Set()).add(dow);
  }
  const perfectWeekends = Object.values(weekendMap).filter(s => s.size === 2).length;

  // ── Cumulative volume
  let totalVolume = 0;
  for (const [, log] of entries) {
    if (log.status !== "skipped" && log.value > 0) totalVolume += log.value;
  }

  // ── Overachiever streak (20%+ above target for N consecutive days)
  let bestOverachieveStreak = 0, curOA = 0;
  for (const [, log] of entries) {
    if (log.status !== "skipped" && log.value >= target * 1.2) { curOA++; if (curOA > bestOverachieveStreak) bestOverachieveStreak = curOA; }
    else curOA = 0;
  }

  // ── Steady Eddie streak (within 10% of target for N consecutive days)
  let bestSteadyStreak = 0, curSS = 0;
  for (const [, log] of entries) {
    const inBand = log.status !== "skipped" && log.value >= target * 0.9 && log.value <= target * 1.1;
    if (inBand) { curSS++; if (curSS > bestSteadyStreak) bestSteadyStreak = curSS; }
    else curSS = 0;
  }

  // ── No Excuses: all Sundays logged in any calendar month
  let perfectSundayMonth = false;
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const daysInM = new Date(y, m, 0).getDate();
    let allSundaysLogged = true, hasSun = false;
    for (let day = 1; day <= daysInM; day++) {
      const dt = new Date(y, m - 1, day);
      if (dt.getDay() !== 0) continue;
      hasSun = true;
      const key = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      if (key > today) continue;
      const log = memberLogs[key];
      if (!log || log.status === "skipped") { allSundaysLogged = false; break; }
    }
    if (hasSun && allSundaysLogged) { perfectSundayMonth = true; break; }
  }

  return {
    totalDone, bestValue, bestPct, streak,
    bestPerfectStreak, bestMonthPct, highConsMonths,
    hasPB: bestValue > target, bestWeekDays, consec5DayWeeks,
    hasComebackStreak, perfectMondayMonth, perfectWeekends, trackingDays,
    totalVolume, bestOverachieveStreak, bestSteadyStreak, perfectSundayMonth,
    // Family stats — defaults; overridden by computeFamilyStats
    familyDays: 0, familyWeeks: 0, familyAllActive: false,
  };
}

// ── Compute cross-member family stats and inject into each member's stats ──
function computeFamilyStats(members, logs) {
  if (!members || members.length < 2) return { familyDays: 0, familyWeeks: 0, familyAllActive: false };
  const today = todayStr();

  // Days where ALL members logged
  const allDates = members.map(m => new Set(
    Object.entries(logs[m.id] || {})
      .filter(([d, l]) => d <= today && l.status !== "skipped" && l.value > 0)
      .map(([d]) => d)
  ));
  let familyDays = 0;
  const intersection = [...allDates[0]].filter(d => allDates.every(s => s.has(d)));
  familyDays = intersection.length;

  // Weeks where ALL members logged 5+ days
  let familyWeeks = 0;
  const weekSets = {};
  for (const m of members) {
    for (const [dateStr, log] of Object.entries(logs[m.id] || {})) {
      if (dateStr > today || log.status === "skipped" || !log.value) continue;
      const d = new Date(dateStr + "T00:00:00");
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      const wk = mon.toISOString().slice(0,10);
      if (!weekSets[wk]) weekSets[wk] = {};
      if (!weekSets[wk][m.id]) weekSets[wk][m.id] = 0;
      weekSets[wk][m.id]++;
    }
  }
  for (const wk of Object.values(weekSets)) {
    if (members.every(m => (wk[m.id] || 0) >= 5)) familyWeeks++;
  }

  // All members have 7+ total days
  const familyAllActive = members.every(m => {
    const done = Object.entries(logs[m.id] || {}).filter(([d,l]) => d <= today && l.status !== "skipped" && l.value > 0).length;
    return done >= 7;
  });

  return { familyDays, familyWeeks, familyAllActive };
}

function getEarnedBadges(memberLogs, target, familyStats = {}) {
  const stats = { ...computeStats(memberLogs, target), ...familyStats };
  return BADGE_DEFS.filter(b => b.check(stats)).map(b => b.id);
}

function getEarnedFamilyBadges(members, logs) {
  const fStats = computeFamilyStats(members, logs);
  // Use first member's stats as base, inject family stats
  if (!members.length) return [];
  const base = computeStats(logs[members[0].id], members[0].target);
  const stats = { ...base, ...fStats };
  return BADGE_DEFS.filter(b => FAMILY_BADGE_IDS.has(b.id) && b.check(stats));
}


// ── Default members ─────────────────────────────────────────────────────────
const DEFAULT_MEMBERS = [
  {
    id: "son",
    name: "Son",
    emoji: "🧗",
    activity: "Dead Hang",
    unit: "sec",
    target: 75,
    color: "#5B8FD4",
  },
  {
    id: "wife",
    name: "Wife",
    emoji: "🚶‍♀️",
    activity: "Walking",
    unit: "km",
    target: 3,
    color: "#D47B9E",
  },
];

// ── JSONBin Storage ────────────────────────────────────────────────────────────
const JSONBIN_BIN_ID  = import.meta.env.VITE_JSONBIN_BIN_ID;
const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY;
const JSONBIN_URL     = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

let saveTimer = null;
let cachedRemote = null; // in-memory cache to avoid redundant GETs

async function loadFromCloud() {
  if (!JSONBIN_BIN_ID || !JSONBIN_API_KEY) return null;
  try {
    const res = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY, 'X-Bin-Meta': 'false' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedRemote = data;
    // Mirror to localStorage as offline fallback
    try { localStorage.setItem('ff_cloud_cache', JSON.stringify(data)); } catch {}
    return data;
  } catch { return null; }
}

async function saveToCloud(payload) {
  if (!JSONBIN_BIN_ID || !JSONBIN_API_KEY) return;
  cachedRemote = payload;
  try { localStorage.setItem('ff_cloud_cache', JSON.stringify(payload)); } catch {}
  try {
    await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) { console.warn('JSONBin save failed (will retry on next change):', e); }
}

// Debounced save — batches rapid state changes into one PUT
function scheduleSave(payload) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToCloud(payload), 800);
}

function loadLocalFallback() {
  try {
    const raw = localStorage.getItem('ff_cloud_cache');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}


function CalendarDay({ dateStr, log, member, onClick, isToday }) {
  const future = isFuture(dateStr);
  let bg = C.empty;
  let label = "";

  if (!future && log) {
    if (log.status === "skipped") { bg = C.missed; }
    else if (log.value >= member.target) { bg = C.done; }
    else { bg = C.partial; }
    label = log.value + member.unit;
  }

  return (
    <div
      onClick={() => !future && onClick(dateStr)}
      style={{
        background: future ? "transparent" : bg,
        border: isToday ? `2px solid ${member.color}` : `1px solid ${C.border}`,
        borderRadius: 8,
        minHeight: 52,
        padding: "4px 5px",
        cursor: future ? "default" : "pointer",
        opacity: future ? 0.35 : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        transition: "transform 0.1s",
        boxSizing: "border-box",
      }}
      onMouseEnter={e => { if (!future) e.currentTarget.style.transform = "scale(1.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 11, color: future ? C.muted : (!log ? C.muted : "#fff"), fontWeight: 600 }}>
        {new Date(dateStr + "T00:00:00").getDate()}
      </span>
      {!future && log && log.status !== "skipped" && (
        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{label}</span>
      )}
      {!future && log && log.status === "skipped" && (
        <span style={{ fontSize: 14 }}>—</span>
      )}
    </div>
  );
}

function ConsistencyBar({ pct, color }) {
  return (
    <div style={{ width: "100%", background: C.border, borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: pct >= 80 ? C.done : pct >= 50 ? C.partial : C.missed,
          borderRadius: 99,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}

function StreakBadge({ count, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: count > 0 ? color + "18" : C.border,
      border: `1px solid ${count > 0 ? color + "55" : C.border}`,
      borderRadius: 99, padding: "3px 10px",
    }}>
      <span style={{ fontSize: 16 }}>{count > 0 ? "🔥" : "💤"}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? color : C.muted }}>
        {count} day streak
      </span>
    </div>
  );
}

// ── Badge Toast (pops up when a new badge is earned) ────────────────────────
function BadgeToast({ badge, onDismiss }) {
  const tc = TIER_COLORS[badge.tier];
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, background: tc.bg, border: `2px solid ${tc.border}`,
      borderRadius: 16, padding: "14px 22px", boxShadow: `0 8px 40px ${tc.glow}, 0 2px 8px rgba(0,0,0,0.12)`,
      display: "flex", alignItems: "center", gap: 14, minWidth: 280, maxWidth: 400,
      animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(60px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }`}</style>
      <span style={{ fontSize: 36, lineHeight: 1 }}>{badge.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: tc.text, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>
          {badge.tier} badge unlocked!
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: tc.text }}>{badge.label}</div>
        <div style={{ fontSize: 12, color: tc.text, opacity: 0.7, marginTop: 2 }}>{badge.desc}</div>
      </div>
      <button onClick={onDismiss} style={{
        background: "none", border: "none", cursor: "pointer", fontSize: 18, color: tc.text, opacity: 0.5, padding: 0,
      }}>×</button>
    </div>
  );
}

// ── Badges Panel (shown in member card) ──────────────────────────────────────
function BadgesPanel({ member, logs, allMembers }) {
  const familyStats = computeFamilyStats(allMembers || [], logs);
  const earned = getEarnedBadges(logs[member.id], member.target, familyStats);
  const [showAll, setShowAll] = useState(false);
  const earnedSet = new Set(earned);

  const display = showAll ? BADGE_DEFS : BADGE_DEFS.filter(b => earnedSet.has(b.id)).slice(0, 8);
  const hasAny = earned.length > 0;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.5 }}>
          BADGES · {earned.length} / {BADGE_DEFS.length} earned
        </div>
        <button onClick={() => setShowAll(s => !s)} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 12, color: member.color, fontWeight: 600, padding: 0,
        }}>{showAll ? "Show earned only" : "Show all"}</button>
      </div>

      {!hasAny && !showAll && (
        <div style={{ fontSize: 13, color: C.muted, padding: "10px 0", textAlign: "center" }}>
          Start logging to earn your first badge 🌱
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {display.map(badge => {
          const isEarned = earnedSet.has(badge.id);
          const tc = TIER_COLORS[badge.tier];
          return (
            <div key={badge.id} title={badge.desc} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: isEarned ? tc.bg : C.bg,
              border: `1.5px solid ${isEarned ? tc.border : C.border}`,
              borderRadius: 10, padding: "6px 10px",
              opacity: isEarned ? 1 : 0.4,
              cursor: "default",
              transition: "all 0.2s",
              filter: isEarned ? "none" : "grayscale(1)",
            }}
            onMouseEnter={e => { if (isEarned) e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{ fontSize: 18 }}>{badge.emoji}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isEarned ? tc.text : C.muted }}>{badge.label}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{badge.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberCard({ member, logs, allMembers, onLog, onEditMember, onNewBadge, year, month }) {
  const today = todayStr();
  const todayLog = logs[member.id]?.[today];
  const streak = streakCount(logs, member.id);
  const pct = consistencyPct(logs, member.id, year, month);
  const [showCal, setShowCal] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [logModal, setLogModal] = useState(null); // dateStr

  const dCount = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= dCount; d++) {
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    calDays.push(key);
  }

  return (
    <div style={{
      background: C.surface,
      border: `1.5px solid ${C.border}`,
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{member.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{member.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{member.activity} · target: {member.target} {member.unit}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <StreakBadge count={streak} color={member.color} />
          <button
            onClick={() => onEditMember(member)}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: C.muted }}
          >✏️ Edit</button>
        </div>
      </div>

      {/* Consistency */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Month consistency</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 80 ? C.done : pct >= 50 ? C.partial : C.missed }}>{pct}%</span>
        </div>
        <ConsistencyBar pct={pct} color={member.color} />
      </div>

      {/* Today quick-log */}
      <div style={{
        background: member.color + "0F",
        border: `1px solid ${member.color + "30"}`,
        borderRadius: 10, padding: "10px 14px", marginBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Today</div>
          {todayLog ? (
            todayLog.status === "skipped"
              ? <span style={{ fontSize: 14, color: C.missed, fontWeight: 600 }}>Skipped</span>
              : <span style={{ fontSize: 14, fontWeight: 700, color: member.color }}>{todayLog.value} {member.unit} logged ✓</span>
          ) : (
            <span style={{ fontSize: 14, color: C.muted }}>Not logged yet</span>
          )}
        </div>
        <button
          onClick={() => setLogModal(today)}
          style={{
            background: member.color, color: "#fff", border: "none",
            borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}
        >{todayLog ? "Edit" : "Log"}</button>
      </div>

      {/* Calendar toggle */}
      <button
        onClick={() => setShowCal(s => !s)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: member.color, fontWeight: 600, padding: 0, marginBottom: 8 }}
      >{showCal ? "▾ Hide calendar" : "▸ Show calendar"}</button>

      {showCal && (
        <div>
          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: C.muted, fontWeight: 600 }}>{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {calDays.map((dateStr, i) =>
              dateStr === null
                ? <div key={`empty-${i}`} />
                : <CalendarDay
                    key={dateStr}
                    dateStr={dateStr}
                    log={logs[member.id]?.[dateStr]}
                    member={member}
                    isToday={dateStr === today}
                    onClick={(d) => setLogModal(d)}
                  />
            )}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { color: C.done, label: "At/above target" },
              { color: C.partial, label: "Below target" },
              { color: C.missed, label: "Skipped" },
              { color: C.empty, label: "Not logged" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: 11, color: C.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges section */}
      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14 }}>
        <button
          onClick={() => setShowBadges(s => !s)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: member.color, fontWeight: 600, padding: 0, marginBottom: showBadges ? 10 : 0 }}
        >{showBadges ? "▾ Hide badges" : `▸ Badges (${getEarnedBadges(logs[member.id], member.target, computeFamilyStats(allMembers||[], logs)).length}/${BADGE_DEFS.length - FAMILY_BADGE_IDS.size} personal + family)`}</button>
        {showBadges && <BadgesPanel member={member} logs={logs} allMembers={allMembers} />}
      </div>

      {/* Log Modal */}
      {logModal && (
        <LogModal
          dateStr={logModal}
          member={member}
          existing={logs[member.id]?.[logModal]}
          onSave={(val, status) => {
              const prevEarned = new Set(getEarnedBadges(logs[member.id], member.target, computeFamilyStats(allMembers||[], logs)));
              onLog(member.id, logModal, val, status);
              // Detect newly earned badges after a tick (state update needs to propagate)
              setTimeout(() => {
                const nextLogs = { ...(logs[member.id] || {}), [logModal]: { value: val, status } };
                const nextEarned = getEarnedBadges(nextLogs, member.target, computeFamilyStats(allMembers||[], { ...(logs||{}), [member.id]: nextLogs }));
                const newOnes = nextEarned.filter(id => !prevEarned.has(id));
                newOnes.forEach(id => {
                  const badge = BADGE_DEFS.find(b => b.id === id);
                  if (badge) onNewBadge(badge);
                });
              }, 50);
              setLogModal(null);
            }}
          onClose={() => setLogModal(null)}
        />
      )}
    </div>
  );
}

function LogModal({ dateStr, member, existing, onSave, onClose }) {
  const [val, setVal] = useState(existing?.value ?? member.target);
  const [status, setStatus] = useState(existing?.status ?? "done");

  const displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 28, width: 320,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
          {member.emoji} {member.name}
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{displayDate}</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["done", "skipped"].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${status === s ? member.color : C.border}`,
              background: status === s ? member.color : "transparent",
              color: status === s ? "#fff" : C.muted,
              fontWeight: 600, cursor: "pointer", fontSize: 13, textTransform: "capitalize",
            }}>{s === "done" ? "✓ Logged" : "✗ Skipped"}</button>
          ))}
        </div>

        {status === "done" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: C.muted, display: "block", marginBottom: 6 }}>
              {member.activity} ({member.unit})
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="number"
                min={0}
                step={member.unit === "sec" ? 1 : 0.1}
                value={val}
                onChange={e => setVal(parseFloat(e.target.value) || 0)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8,
                  border: `1.5px solid ${C.border}`, fontSize: 18, fontWeight: 700,
                  color: C.text, outline: "none",
                }}
              />
              <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>{member.unit}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Target: {member.target} {member.unit}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${C.border}`,
            background: "none", cursor: "pointer", fontWeight: 600, color: C.muted,
          }}>Cancel</button>
          <button onClick={() => onSave(val, status)} style={{
            flex: 2, padding: "10px 0", borderRadius: 8, border: "none",
            background: member.color, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function EditMemberModal({ member, onSave, onDelete, onClose, isNew }) {
  const [name, setName] = useState(member?.name ?? "");
  const [emoji, setEmoji] = useState(member?.emoji ?? "🏃");
  const [activity, setActivity] = useState(member?.activity ?? "");
  const [unit, setUnit] = useState(member?.unit ?? "min");
  const [target, setTarget] = useState(member?.target ?? 30);
  const [color, setColor] = useState(member?.color ?? "#5B8FD4");

  const unitOptions = ["sec", "min", "km", "reps", "sets", "cal"];
  const emojiOptions = ["🧗","🚶","🏃","🚴","🏋️","🤸","🧘","🏊","⚽","🏓","🎯","💪"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 28, width: 360,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>
          {isNew ? "Add new member" : `Edit ${member.name}`}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Abilash" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Emoji icon</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {emojiOptions.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{
                fontSize: 20, padding: "4px 8px", borderRadius: 8,
                border: `2px solid ${emoji === e ? color : C.border}`,
                background: emoji === e ? color + "18" : "none", cursor: "pointer",
              }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Activity name</label>
          <input value={activity} onChange={e => setActivity(e.target.value)} style={inputStyle} placeholder="e.g. Push-ups" />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Daily target</label>
            <input type="number" value={target} onChange={e => setTarget(parseFloat(e.target.value)||0)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
              {unitOptions.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Colour</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["#5B8FD4","#D47B9E","#3D9E6E","#E8A838","#9B6FD4","#E05C5C","#5BC4C4"].map(c => (
              <div key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                border: color === c ? `3px solid ${C.text}` : "3px solid transparent",
                boxSizing: "border-box",
              }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {!isNew && (
            <button onClick={() => { if (window.confirm("Remove this member?")) onDelete(member.id); }} style={{
              padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.missed}`,
              background: "none", cursor: "pointer", color: C.missed, fontWeight: 600,
            }}>Delete</button>
          )}
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${C.border}`,
            background: "none", cursor: "pointer", fontWeight: 600, color: C.muted,
          }}>Cancel</button>
          <button onClick={() => onSave({ id: member?.id ?? Date.now().toString(), name, emoji, activity, unit, target, color })} style={{
            flex: 2, padding: "10px 0", borderRadius: 8, border: "none",
            background: color, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 12, color: C.muted, display: "block", marginBottom: 6, fontWeight: 600 };
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, boxSizing: "border-box",
  outline: "none", background: C.bg,
};

// ── Main App ──────────────────────────────────────────────────────────────────


// ── Main App ──────────────────────────────────────────────────────────────────
export default function FitnessTracker() {
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [logs, setLogs]       = useState({});
  const [loaded, setLoaded]   = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const membersInitRef = useRef(false);
  const logsInitRef    = useRef(false);
  const [editMember, setEditMember] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // ── Load once on mount
  useEffect(() => {
    (async () => {
      const cloud = await loadFromCloud();
      const data  = cloud || loadLocalFallback();
      if (data) {
        if (data.ft_members && Array.isArray(data.ft_members) && data.ft_members.length > 0)
          setMembers(data.ft_members);
        if (data.ft_logs && typeof data.ft_logs === 'object')
          setLogs(data.ft_logs);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Save whenever members or logs change (skip load echo)
  const membersRef = useRef(members);
  const logsRef    = useRef(logs);
  membersRef.current = members;
  logsRef.current    = logs;

  useEffect(() => {
    if (!loaded) return;
    if (!membersInitRef.current) { membersInitRef.current = true; return; }
    setSaveStatus('saving');
    scheduleSave({ ft_members: membersRef.current, ft_logs: logsRef.current });
    const t = setTimeout(() => setSaveStatus('saved'), 1200);
    return () => clearTimeout(t);
  }, [members, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (!logsInitRef.current) { logsInitRef.current = true; return; }
    setSaveStatus('saving');
    scheduleSave({ ft_members: membersRef.current, ft_logs: logsRef.current });
    const t = setTimeout(() => setSaveStatus('saved'), 1200);
    return () => clearTimeout(t);
  }, [logs, loaded]);

  const handleLog = useCallback((memberId, dateStr, value, status) => {
    setLogs(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], [dateStr]: { value, status } },
    }));
  }, []);

  const handleSaveMember = useCallback((m) => {
    setMembers(prev => {
      const exists = prev.find(x => x.id === m.id);
      if (exists) return prev.map(x => x.id === m.id ? m : x);
      return [...prev, m];
    });
    setEditMember(null);
  }, []);

  const handleDeleteMember = useCallback((id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setEditMember(null);
  }, []);

  const handleNewBadge = useCallback((badge) => {
    setToastQueue(q => [...q, { ...badge, key: Date.now() + Math.random() }]);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // ── Not configured screen
  if (!JSONBIN_BIN_ID || !JSONBIN_API_KEY) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
        <div style={{ background: C.surface, borderRadius: 16, padding: 36, maxWidth: 420, textAlign: 'center', border: `1.5px solid ${C.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Setup Required</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            Add your JSONBin credentials as GitHub repository secrets:<br/><br/>
            <code style={{ background: C.bg, padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>VITE_JSONBIN_BIN_ID</code><br/>
            <code style={{ background: C.bg, padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>VITE_JSONBIN_API_KEY</code><br/><br/>
            Then redeploy via GitHub Actions.
          </div>
        </div>
      </div>
    );
  }

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 16 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter','Helvetica Neue',sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>🌿 Family Fitness</div>
          <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            Keep showing up, together.
            {saveStatus === 'saving' && <span style={{ color: C.partial }}>● saving…</span>}
            {saveStatus === 'saved'  && <span style={{ color: C.done   }}>✓ saved</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 14, minWidth: 100, textAlign: 'center' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth} style={{ ...navBtnStyle, opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
          <button
            onClick={() => setEditMember('new')}
            style={{ background: C.done, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
          >+ Add member</button>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {members.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            logs={logs}
            onLog={handleLog}
            onEditMember={(m) => setEditMember(m)}
            onNewBadge={handleNewBadge}
            allMembers={members}
            year={viewYear}
            month={viewMonth}
          />
        ))}

        {members.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No members yet.</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add your first member to get started.</div>
          </div>
        )}

        {/* Summary row */}
        {members.length > 0 && (
          <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: C.muted }}>FAMILY SUMMARY · {MONTH_NAMES[viewMonth].toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {members.map(m => {
                const pct    = consistencyPct(logs, m.id, viewYear, viewMonth);
                const streak = streakCount(logs, m.id);
                return (
                  <div key={m.id} style={{ flex: 1, minWidth: 140, background: m.color + '10', border: `1px solid ${m.color + '30'}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{m.emoji}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{m.activity}</div>
                    <ConsistencyBar pct={pct} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: pct >= 80 ? C.done : pct >= 50 ? C.partial : C.missed, marginTop: 6 }}>{pct}%</div>
                    {streak > 0 && <div style={{ fontSize: 12, color: C.muted }}>🔥 {streak}-day streak</div>}
                  </div>
                );
              })}
            </div>
            {/* Family badges */}
            {(() => {
              const famBadges    = getEarnedFamilyBadges(members, logs);
              const allFamBadges = BADGE_DEFS.filter(b => FAMILY_BADGE_IDS.has(b.id));
              const earnedIds    = new Set(famBadges.map(b => b.id));
              return (
                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginBottom: 10 }}>
                    👨‍👩‍👦 FAMILY BADGES · {famBadges.length} / {allFamBadges.length} earned
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {allFamBadges.map(badge => {
                      const isEarned = earnedIds.has(badge.id);
                      const tc = TIER_COLORS[badge.tier];
                      return (
                        <div key={badge.id} title={badge.desc} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isEarned ? tc.bg : C.bg,
                          border: `1.5px solid ${isEarned ? tc.border : C.border}`,
                          borderRadius: 10, padding: '6px 10px',
                          opacity: isEarned ? 1 : 0.4,
                          filter: isEarned ? 'none' : 'grayscale(1)',
                          transition: 'all 0.2s',
                        }}>
                          <span style={{ fontSize: 18 }}>{badge.emoji}</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: isEarned ? tc.text : C.muted }}>{badge.label}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{badge.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Badge toast */}
      {toastQueue.length > 0 && (
        <BadgeToast badge={toastQueue[0]} onDismiss={() => setToastQueue(q => q.slice(1))} />
      )}

      {/* Edit/Add modal */}
      {editMember && (
        <EditMemberModal
          member={editMember === 'new' ? null : editMember}
          isNew={editMember === 'new'}
          onSave={handleSaveMember}
          onDelete={handleDeleteMember}
          onClose={() => setEditMember(null)}
        />
      )}
    </div>
  );
}

const navBtnStyle = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16, color: C.text,
};
