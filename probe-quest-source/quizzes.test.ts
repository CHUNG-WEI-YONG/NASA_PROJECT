import assert from 'node:assert/strict';
import { missions } from './catalog';
import { stationQuestions, cooldownSeconds, RETRY_MS } from './quizzes';
import { collectMission, INITIAL_PROGRESS } from './rules';

assert.equal(Object.keys(stationQuestions).length, missions.length);
for (const mission of missions) {
  const quiz = stationQuestions[mission.id];
  assert.ok(quiz, `Missing question for ${mission.name}`);
  assert.equal(quiz.choices.length, 4);
  assert.equal(new Set(quiz.choices).size, 4);
  assert.ok(Number.isInteger(quiz.correct) && quiz.correct >= 0 && quiz.correct < 4);
  assert.ok(quiz.source);
}
const start = 1_000_000;
const locked = { 'moon-0': start + RETRY_MS };
assert.equal(cooldownSeconds(locked, 'moon-0', start), 60);
assert.equal(cooldownSeconds(locked, 'moon-0', start + 59_999), 1);
assert.equal(cooldownSeconds(locked, 'moon-0', start + 60_000), 0);
assert.equal(cooldownSeconds(locked, 'moon-1', start), 0);
assert.equal(cooldownSeconds(locked, 'mars-0', start), 0);
const collected = collectMission(INITIAL_PROGRESS, 'moon-0');
assert.equal(collected.progress.points, 100);
assert.equal(collectMission(collected.progress, 'moon-0').awarded, false);
assert.equal(collectMission(INITIAL_PROGRESS, 'invalid-id').awarded, false);
console.log('Passed: all 30 four-choice questions, exact 60-second per-station cooldown, independent stations, and duplicate reward protection.');
