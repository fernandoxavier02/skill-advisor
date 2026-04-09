'use strict';

const { readJSONL } = require('./jsonl');
const { inferCategory } = require('./build-index');

// Skill names are often descriptive enough for category inference (e.g., "investigate" → debugging).
// For better accuracy, callers can pass an index-derived category map.
const _categoryCache = new Map();
function getSkillCategory(skillName) {
  if (!_categoryCache.has(skillName)) {
    _categoryCache.set(skillName, inferCategory(skillName));
  }
  return _categoryCache.get(skillName);
}

/**
 * Compute session analytics from telemetry JSONL.
 * Returns: { totalSessions, topSkills, categoryDistribution }
 */
function computeStats(telemetryPath) {
  const { data: telemetry } = readJSONL(telemetryPath);
  if (telemetry.length === 0) {
    return { totalSessions: 0, topSkills: [], categoryDistribution: {} };
  }

  const activeSessions = telemetry.filter(e => e.action !== 'cancelled');
  const skillCounts = new Map();
  const categoryCounts = {};

  for (const entry of activeSessions) {
    const executed = Array.isArray(entry.executed_actual) ? entry.executed_actual : [];
    for (const skillId of executed) {
      if (typeof skillId !== 'string') continue;
      skillCounts.set(skillId, (skillCounts.get(skillId) || 0) + 1);

      const cat = getSkillCategory(skillId);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  const topSkills = Array.from(skillCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSessions: activeSessions.length,
    topSkills,
    categoryDistribution: categoryCounts,
  };
}

/**
 * Compute heat map: per-skill usage in 7d/30d/90d windows with trend.
 * Trend: up if 7d > 30d/4, down if 7d==0 AND 30d>0, else flat.
 */
function computeHeatMap(telemetryPath, refDate) {
  const { data: telemetry } = readJSONL(telemetryPath);
  if (telemetry.length === 0) return [];

  const now = refDate ? refDate.getTime() : Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Per-skill accumulator: { usage7d, usage30d, usage90d }
  const skills = new Map();

  for (const entry of telemetry) {
    if (entry.action === 'cancelled') continue;
    const executed = Array.isArray(entry.executed_actual) ? entry.executed_actual : [];
    const ts = entry.ts ? new Date(entry.ts).getTime() : 0;
    if (ts === 0) continue;

    const ageDays = (now - ts) / DAY;
    if (ageDays > 90) continue;

    for (const skillId of executed) {
      if (typeof skillId !== 'string') continue;
      if (!skills.has(skillId)) {
        skills.set(skillId, { usage7d: 0, usage30d: 0, usage90d: 0 });
      }
      const acc = skills.get(skillId);
      acc.usage90d++;
      if (ageDays <= 30) acc.usage30d++;
      if (ageDays <= 7) acc.usage7d++;
    }
  }

  const result = [];
  for (const [skillName, acc] of skills) {
    // Trend: compare 7d against the 8d-30d baseline (exclusive windows)
    const baseline30d = acc.usage30d - acc.usage7d; // usage in days 8-30 only
    let trend = 'flat';
    if (acc.usage7d > 0 && (baseline30d === 0 || acc.usage7d > baseline30d / 3)) trend = 'up';
    else if (acc.usage7d === 0 && acc.usage30d > 0) trend = 'down';

    result.push({
      skillName,
      usage7d: acc.usage7d,
      usage30d: acc.usage30d,
      usage90d: acc.usage90d,
      trend,
    });
  }

  result.sort((a, b) => b.usage90d - a.usage90d);
  return result;
}

/**
 * Compute user profile from telemetry.
 * Returns: { preferredSkills, dominantCategory, totalUsage, uniqueSkills }
 */
function computeProfile(telemetryPath) {
  const stats = computeStats(telemetryPath);
  if (stats.totalSessions === 0) {
    return { preferredSkills: [], dominantCategory: null, totalUsage: 0, uniqueSkills: 0 };
  }

  const top5 = stats.topSkills.slice(0, 5).map(s => s.name);

  // Find dominant category
  let dominant = null;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(stats.categoryDistribution)) {
    if (count > maxCount) { maxCount = count; dominant = cat; }
  }

  const totalUsage = stats.topSkills.reduce((sum, s) => sum + s.count, 0);

  return {
    preferredSkills: top5,
    dominantCategory: dominant,
    totalUsage,
    uniqueSkills: stats.topSkills.length,
  };
}

module.exports = { computeStats, computeHeatMap, computeProfile };
