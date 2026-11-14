export type World = 'moon' | 'mars';
export type MissionKind = 'surface' | 'orbit' | 'signals';

export interface Mission {
  id: string;
  name: string;
  type: string;
  fact: string;
  year: number;
  world: World;
  kind: MissionKind;
  x: number;
  z: number;
}

export const worlds = {
  moon: { title: 'Moon', gravity: 1.62, subtitle: 'A giant leap for a little explorer' },
  mars: { title: 'Mars', gravity: 3.71, subtitle: 'Follow the tracks of robotic explorers' },
} as const;

type Entry = [name: string, type: string, fact: string, year: number, kind: MissionKind];

// Mission groups from the user's supplied Probe Quest source document.
// Archive beacons are not claims that failed or flyby spacecraft landed.
const moon: Entry[] = [
  ['Pioneer lunar probes', 'Flyby attempts', 'Early American attempts to reach the Moon. Pioneer 4 passed the Moon in 1959. These early missions helped engineers learn how to navigate in deep space.', 1958, 'signals'],
  ['Ranger 1–9', 'Test flights / impactors', 'The successful Ranger probes sent close-up pictures before hitting the Moon. Their pictures helped scientists understand the surface before astronauts visited.', 1961, 'signals'],
  ['Surveyor 1–7', 'Robotic landers', 'Surveyor demonstrated that robotic spacecraft could make soft landings. Five successful landers examined lunar soil and sent back pictures.', 1966, 'surface'],
  ['Lunar Orbiter 1–5', 'Orbiters', 'These orbiters photographed the Moon and helped identify safe Apollo landing sites. We collect their records at a ground relay, not by finding an orbiter parked on the surface.', 1966, 'orbit'],
  ['Apollo lunar modules', 'Crewed equipment', 'Descent stages like Eagle’s stayed on the Moon and served as launch pads for the upper stage. Apollo 11 brought the first people to the lunar surface in 1969.', 1969, 'surface'],
  ['Lunar Roving Vehicles', 'Crewed equipment', 'Astronauts drove three electric Moon buggies on Apollo 15, 16 and 17, then parked them on the Moon. The rovers helped astronauts explore farther from their landers.', 1971, 'surface'],
  ['ALSEP stations', 'Surface instruments', 'Apollo astronauts left scientific instrument packages to keep working after they departed. Seismometers measured moonquakes, helping scientists investigate the Moon’s inside.', 1969, 'surface'],
  ['Lunar Prospector', 'Orbiter', 'It mapped the Moon and found signs of hydrogen near the poles. Hydrogen can be a clue to water ice hiding in cold, shadowed places.', 1998, 'orbit'],
  ['LRO', 'Orbiter', 'Lunar Reconnaissance Orbiter has mapped the surface in detail. Its cameras have photographed Apollo landing sites and helped scientists study places for future exploration.', 2009, 'orbit'],
  ['LCROSS', 'Impactor', 'It studied material thrown up by a planned impact near the lunar south pole and found evidence of water. This archive beacon represents the experiment, not an intact lander.', 2009, 'signals'],
  ['GRAIL', 'Twin orbiters', 'Ebb and Flow mapped tiny changes in the Moon’s gravity. Measuring the distance between the two spacecraft helped reveal structures beneath the surface.', 2011, 'orbit'],
  ['LADEE', 'Orbiter', 'It studied gases and dust around the Moon. The Moon has an extremely thin envelope of gases called an exosphere, very different from Earth’s atmosphere.', 2013, 'orbit'],
  ['CAPSTONE', 'Orbiter', 'This small spacecraft tested a special lunar orbit planned for Gateway. It also tested ways spacecraft could work out their position using another spacecraft.', 2022, 'orbit'],
];

const mars: Entry[] = [
  ['Mariner 3 & 4', 'Flyby attempts', 'Mariner 3 did not reach Mars. Mariner 4 returned the first close-up pictures of Mars in 1965, revealing craters on a world people had never seen up close.', 1964, 'signals'],
  ['Mariner 6 & 7', 'Flybys', 'These twin spacecraft flew past Mars and photographed its surface in 1969. They also measured the atmosphere, helping scientists plan later missions.', 1969, 'signals'],
  ['Mariner 8 & 9', 'Orbiter attempts', 'Mariner 8 failed at launch. Mariner 9 became the first spacecraft to orbit another planet and revealed huge volcanoes and a vast canyon system.', 1971, 'orbit'],
  ['Viking 1 & 2', 'Landers / orbiters', 'The first U.S. landers to operate successfully on Mars reached it in 1976. They photographed the surface, measured the weather and performed experiments on the soil.', 1975, 'surface'],
  ['Mars Observer', 'Orbiter attempt', 'Contact was lost shortly before the spacecraft was due to enter orbit in 1993. This historical record remembers an unsuccessful mission and the lessons it offered.', 1992, 'signals'],
  ['Mars Global Surveyor', 'Orbiter', 'It mapped the surface and studied Mars from orbit. Its measurements helped reveal the planet’s shape, weather and magnetic traces in ancient rocks.', 1996, 'orbit'],
  ['Pathfinder & Sojourner', 'Lander / rover', 'Pathfinder delivered Sojourner, the first rover on Mars, in 1997. The small six-wheeled robot examined nearby rocks and showed that a rover could explore another planet.', 1996, 'surface'],
  ['Mars Climate Orbiter', 'Orbiter attempt', 'The spacecraft was lost during its approach to Mars in 1999. A mismatch between measurement units contributed to the loss: careful teamwork and checking units matter in science.', 1998, 'signals'],
  ['Mars Polar Lander & Deep Space 2', 'Lander / impact probes', 'NASA lost contact with the lander and did not hear back from the two tiny impact probes. They were intended to investigate the cold south-polar region and soil.', 1999, 'signals'],
  ['Mars Odyssey', 'Orbiter', 'It mapped minerals and found evidence of ice below the surface. Odyssey also helped relay messages between spacecraft on Mars and people on Earth.', 2001, 'orbit'],
  ['Spirit & Opportunity', 'Twin rovers', 'These twin rovers explored Mars for years and are now inactive. They found rock and mineral clues that liquid water once changed parts of the Martian surface.', 2003, 'surface'],
  ['Mars Reconnaissance Orbiter', 'Orbiter', 'Its high-resolution camera shows fine details on the Martian surface. It studies rocks, ice and weather and helps choose landing sites for new explorers.', 2005, 'orbit'],
  ['Phoenix', 'Lander', 'Phoenix dug into the soil near the north pole to study water ice. Its robotic arm uncovered bright material that helped confirm ice just below the ground.', 2007, 'surface'],
  ['Curiosity', 'Rover', 'It studies whether ancient Mars could have supported microbial life. Curiosity found that Gale Crater once had environments with water and ingredients needed by living things.', 2011, 'surface'],
  ['MAVEN', 'Orbiter', 'It studies how Mars lost much of its atmosphere. Understanding gases escaping into space helps scientists explain how Mars changed over billions of years.', 2013, 'orbit'],
  ['InSight & MarCO', 'Lander / flyby CubeSats', 'InSight listened for marsquakes to investigate the planet’s interior. MarCO’s two small spacecraft relayed landing data during their flyby; they did not land with InSight.', 2018, 'surface'],
  ['Perseverance & Ingenuity', 'Rover / helicopter', 'Perseverance collects rock samples and looks for signs of ancient microbial life. Ingenuity completed the first powered, controlled flight on another planet and ended its flight mission in 2024.', 2020, 'surface'],
];

function makeMissions(world: World, entries: Entry[]): Mission[] {
  return entries.map(([name, type, fact, year, kind], index) => {
    // A broad, explorable grid; the first beacon is close to the landing zone.
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      id: `${world}-${index}`, name, type, fact, year, world, kind,
      x: (col - 1) * 13,
      z: -8 - row * 14,
    };
  });
}

export const missions: Mission[] = [...makeMissions('moon', moon), ...makeMissions('mars', mars)];
