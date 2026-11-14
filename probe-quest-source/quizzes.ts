import { missions } from './catalog';

export interface StationQuestion {
  question: string;
  choices: [string, string, string, string];
  correct: number;
  source: string;
}
const resource = 'Hackathon Resources document — NASA Data & Resources';
const moonSource = 'NASA Moon mission catalog / original mission guide';
const marsSource = 'NASA Mars Exploration Program / original mission guide';
type Q = [string, [string, string, string, string], number, string?];
const moon: Q[] = [
  ['What did Pioneer 4 do in 1959?', ['Drove on Mars', 'Passed the Moon', 'Landed astronauts', 'Visited Ceres'], 1],
  ['What did successful Ranger probes send before impact?', ['Moon rocks', 'Weather balloons', 'Close-up pictures', 'Astronauts'], 2],
  ['What did Surveyor landers demonstrate?', ['Robotic soft landings were possible', 'Mars had forests', 'The Moon had oceans', 'Helicopters could fly on the Moon'], 0, resource],
  ['How did Lunar Orbiter help Apollo?', ['Built lunar roads', 'Carried astronauts', 'Made oxygen', 'Photographed possible landing sites'], 3],
  ['Which part of an Apollo lunar module stayed behind as a launch pad?', ['Its parachute', 'Its descent stage', 'Its Earth command module', 'Its launch tower'], 1, resource],
  ['How many Lunar Roving Vehicles were left on the Moon?', ['One', 'Two', 'Three', 'Ten'], 2, resource],
  ['Why were ALSEP instrument packages left on the Moon?', ['To continue science after astronauts left', 'To grow trees', 'To bring rovers home', 'To make the Moon warmer'], 0, resource],
  ['What did Lunar Prospector detect near the poles?', ['City lights', 'Trees', 'Oceans of lava', 'Signs of hydrogen'], 3],
  ['What does LRO help scientists do?', ['Drive a crewed rover', 'Map the Moon in detail', 'Move the Moon', 'Grow food on Mars'], 1],
  ['What did LCROSS find evidence of in impact material?', ['Plastic', 'Grass', 'Water', 'Dinosaur bones'], 2],
  ['What did the twin GRAIL spacecraft map?', ['Tiny changes in lunar gravity', 'Martian roads', 'Earth traffic', 'Saturn’s weather'], 0],
  ['What did LADEE study around the Moon?', ['Fish and coral', 'Forest fires', 'Ocean waves', 'Gases and dust'], 3],
  ['What did CAPSTONE test?', ['An ocean submarine', 'A lunar orbit planned for Gateway', 'A Mars railway', 'A lunar helicopter'], 1],
];
const mars: Q[] = [
  ['What did Mariner 4 return from Mars?', ['Close-up pictures', 'Living plants', 'Astronauts', 'Buckets of water'], 0],
  ['How did Mariner 6 and 7 explore Mars?', ['By driving on it', 'By landing astronauts', 'By flying past it', 'By drilling into its core'], 2],
  ['What first did Mariner 9 achieve?', ['First lunar rover', 'First spacecraft to orbit another planet', 'First aircraft on Mars', 'First asteroid landing'], 1],
  ['When did the Viking landers successfully reach Mars?', ['1961', '1997', '2020', '1976'], 3, resource],
  ['What happened to Mars Observer before entering orbit?', ['Contact was lost', 'It landed people', 'It returned samples', 'It became a rover'], 0],
  ['How did Mars Global Surveyor study Mars?', ['From a submarine', 'From a crewed base', 'From orbit', 'From inside a volcano'], 2],
  ['Which lander delivered Sojourner to Mars in 1997?', ['Surveyor', 'Pathfinder', 'Apollo 11', 'Phoenix'], 1, resource],
  ['What important lesson came from losing Mars Climate Orbiter?', ['Never take photographs', 'Mars has no gravity', 'Rovers need sails', 'Always check measurement units'], 3],
  ['What happened to Mars Polar Lander and Deep Space 2?', ['No successful landing signals were received', 'They returned to Earth', 'They landed on the Moon', 'They carried astronauts'], 0],
  ['What did Mars Odyssey find evidence of below the surface?', ['City tunnels', 'Forests', 'Ice', 'Coral reefs'], 2],
  ['What is the status of Spirit and Opportunity in the supplied resources?', ['Flying to Earth', 'Both inactive on Mars', 'Both on the Moon', 'Both orbiting Ceres'], 1, resource],
  ['What is a special strength of Mars Reconnaissance Orbiter’s camera?', ['It sees through the whole planet', 'It only photographs Earth', 'It grows crystals', 'It shows fine surface details'], 3],
  ['What did Phoenix dig into the soil to study?', ['Water ice', 'Tree roots', 'Moon rocks', 'Plastic'], 0, resource],
  ['What question does Curiosity investigate?', ['Can people swim on Mars?', 'Does Mars have cities?', 'Could ancient Mars have supported microbial life?', 'Is Mars made of cheese?'], 2],
  ['What does MAVEN investigate?', ['Moonquakes', 'How Mars lost much of its atmosphere', 'Jupiter’s rings', 'Earth’s oceans'], 1],
  ['What did InSight listen for?', ['Whale songs', 'Radio music', 'Thunder on Earth', 'Marsquakes'], 3, resource],
  ['What first did Ingenuity achieve?', ['Powered, controlled flight on another planet', 'First human landing on Mars', 'First orbit of Earth', 'First lunar drive'], 0, resource],
];

export const stationQuestions: Record<string, StationQuestion> = Object.fromEntries(
  [...moon.map((q, i) => [`moon-${i}`, q] as const), ...mars.map((q, i) => [`mars-${i}`, q] as const)]
    .map(([id, [question, choices, correct, source]]) => [id, { question, choices, correct, source: source ?? (id.startsWith('moon') ? moonSource : marsSource) }]),
);

export const RETRY_MS = 60_000;
export type Cooldowns = Record<string, number>;
export const cooldownSeconds = (cooldowns: Cooldowns, id: string, now = Date.now()) =>
  Math.max(0, Math.ceil(((cooldowns[id] ?? 0) - now) / 1000));

export function loadCooldowns(): Cooldowns {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('pq-station-cooldowns') ?? '{}');
    if (!data || typeof data !== 'object') return {};
    return Object.fromEntries(Object.entries(data).filter(([id, until]) =>
      missions.some(m => m.id === id) && typeof until === 'number' && Number.isFinite(until) && until > Date.now()));
  } catch { return {}; }
}

export function saveCooldowns(cooldowns: Cooldowns): boolean {
  try { localStorage.setItem('pq-station-cooldowns', JSON.stringify(cooldowns)); return true; }
  catch { return false; }
}
