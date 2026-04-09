'use strict';

const { readJSONL, writeJSON } = require('./jsonl');
const { AFFINITY_PARAMS } = require('./constants');
const { debugLog } = require('./errors');

/**
 * Compute affinity scores per skill from feedback + telemetry JSONL files.
 *
 * Data sources:
 *   feedback.jsonl: {session_id, helpful_skill, unhelpful_skill, rating, resolved}
 *   telemetry.jsonl: {session_id, action, executed_actual: [...], ts}
 *
 * Algorithm:
 *   1. Parse both JSONL files
 *   2. Build per-skill stats from telemetry (usage count from executed_actual)
 *   3. Enrich with feedback ratings (join by session_id)
 *   4. Compute affinity score = base_usage + rating_boost - cancel_penalty
 *   5. Sort by affinityScore descending
 *
 * Returns: [{skillId, affinityScore, usageCount, avgRating, lastUsed}]
 */
function computeAffinity(feedbackPath, telemetryPath) {
  const { data: feedback } = readJSONL(feedbackPath);
  const { data: telemetry } = readJSONL(telemetryPath);

  if (feedback.length === 0 && telemetry.length === 0) return [];

  // Build feedback index by session_id
  const feedbackBySession = new Map();
  for (const entry of feedback) {
    if (entry.session_id) {
      feedbackBySession.set(entry.session_id, entry);
    }
  }

  // Per-skill accumulator
  const skills = new Map(); // skillId → { usageCount, ratings: [], lastUsed, cancelCount }

  function getOrCreate(skillId) {
    if (!skills.has(skillId)) {
      skills.set(skillId, { usageCount: 0, ratings: [], lastUsed: '', cancelCount: 0 });
    }
    return skills.get(skillId);
  }

  // Process telemetry: extract skills from executed_actual
  for (const entry of telemetry) {
    const isCancelled = entry.action === 'cancelled';
    const executed = Array.isArray(entry.executed_actual) ? entry.executed_actual : [];
    const ts = entry.ts || '';

    for (const skillId of executed) {
      if (typeof skillId !== 'string' || skillId.length === 0) continue;
      const acc = getOrCreate(skillId);
      if (!isCancelled) {
        acc.usageCount++;
        if (ts > acc.lastUsed) acc.lastUsed = ts;
      } else {
        acc.cancelCount++;
      }
    }

    // If cancelled with no executed_actual, track top_skill as cancelled
    if (isCancelled && executed.length === 0 && entry.top_skill) {
      const topId = entry.top_skill.replace(/^\//, ''); // strip leading /
      const acc = getOrCreate(topId);
      acc.cancelCount++;
    }

    // Join with feedback for this session
    const fb = feedbackBySession.get(entry.session_id);
    if (fb) {
      if (fb.helpful_skill && fb.helpful_skill !== 'none') {
        const acc = getOrCreate(fb.helpful_skill);
        if (typeof fb.rating === 'number') acc.ratings.push(fb.rating);
      }
      if (fb.unhelpful_skill && fb.unhelpful_skill !== 'none') {
        const acc = getOrCreate(fb.unhelpful_skill);
        // Unhelpful skill gets a low rating: pipeline rating 2 + unhelpful = skill rating 1
        if (typeof fb.rating === 'number') acc.ratings.push(1);
      }
    }
  }

  // Also process feedback without matching telemetry (orphaned feedback)
  const telemetrySessionIds = new Set(telemetry.map(t => t.session_id).filter(Boolean));
  for (const fb of feedback) {
    if (!fb.session_id || telemetrySessionIds.has(fb.session_id)) continue; // already processed via join
    if (fb.helpful_skill && fb.helpful_skill !== 'none') {
      const acc = getOrCreate(fb.helpful_skill);
      if (typeof fb.rating === 'number') acc.ratings.push(fb.rating);
      acc.usageCount = Math.max(acc.usageCount, 1);
    }
    if (fb.unhelpful_skill && fb.unhelpful_skill !== 'none') {
      const acc = getOrCreate(fb.unhelpful_skill);
      acc.ratings.push(1); // unhelpful = low rating
    }
  }

  // Compute affinity scores
  const result = [];
  for (const [skillId, acc] of skills) {
    const avgRating = acc.ratings.length > 0
      ? acc.ratings.reduce((a, b) => a + b, 0) / acc.ratings.length
      : 3; // neutral default

    // Base score from usage (log scale to prevent dominance of frequently-used skills)
    const usageScore = acc.usageCount > 0 ? Math.min(Math.log2(acc.usageCount + 1) / 4, 1.0) : 0;

    // Rating boost: 5-star → +0.1, 1-star → -0.1 (per AFFINITY_PARAMS)
    const ratingBoost = (avgRating - 3) / 2 * AFFINITY_PARAMS.RATING_BOOST_PER_5STAR;

    // Cancel penalty
    const cancelPenalty = acc.cancelCount * AFFINITY_PARAMS.CANCEL_PENALTY;

    const affinityScore = Math.max(0, Math.min(1, usageScore + ratingBoost - cancelPenalty));

    result.push({
      skillId,
      affinityScore: Math.round(affinityScore * 1000) / 1000,
      usageCount: acc.usageCount,
      avgRating: Math.round(avgRating * 100) / 100,
      lastUsed: acc.lastUsed || '',
    });
  }

  // Sort descending by affinity
  result.sort((a, b) => b.affinityScore - a.affinityScore);
  return result;
}

/**
 * Build affinity from file paths and write to output.
 */
function buildAffinityFromPaths(feedbackPath, telemetryPath, outputPath) {
  const result = computeAffinity(feedbackPath, telemetryPath);
  writeJSON(outputPath, result);
  if (result.length > 0) {
    console.log(`  Affinity scores: ${result.length} skills scored`);
  }
  return result;
}

module.exports = { computeAffinity, buildAffinityFromPaths };
