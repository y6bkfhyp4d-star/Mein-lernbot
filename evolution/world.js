export const SIZE = 20;
export function rng(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createWorld(seed = 2027) {
  const random = rng(seed);
  const cells = Array.from({length: SIZE * SIZE}, () => {
    const r = random();
    return r < .12 ? 'wall' : r < .22 ? 'food' : r < .28 ? 'hazard' : 'floor';
  });
  const start = Math.floor(SIZE / 2) * SIZE + Math.floor(SIZE / 2);
  cells[start] = 'floor';
  for (const p of [start - 1, start + 1, start - SIZE, start + SIZE]) cells[p] = 'floor';
  return {seed, cells, agent: start, energy: 100, steps: 0, foods: 0, hits: 0, alive: true, visits: {[start]: 1}};
}
export function observe(world) {
  const x = world.agent % SIZE, y = Math.floor(world.agent / SIZE);
  const at = (dx, dy) => {
    const nx = x + dx, ny = y + dy;
    return nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE ? 'wall' : world.cells[ny * SIZE + nx];
  };
  return {position: {x, y}, energy: world.energy, nearby: {up: at(0,-1), down: at(0,1), left: at(-1,0), right: at(1,0)}};
}
export const ACTIONS = ['up','down','left','right'];
export function stepWorld(world, action) {
  if (!world.alive) return {event: 'Agent ohne Energie', observation: observe(world)};
  if (!ACTIONS.includes(action)) throw new Error('Ungültige Aktion');
  const x = world.agent % SIZE, y = Math.floor(world.agent / SIZE);
  const dx = action === 'left' ? -1 : action === 'right' ? 1 : 0;
  const dy = action === 'up' ? -1 : action === 'down' ? 1 : 0;
  const nx = x + dx, ny = y + dy;
  let event = 'Bewegung';
  world.steps++;
  world.energy = Math.max(0, world.energy - 1);
  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || world.cells[ny * SIZE + nx] === 'wall') {
    world.hits++;
    event = 'Hindernis';
  } else {
    const target = ny * SIZE + nx;
    world.agent = target;
    world.visits[target] = (world.visits[target] || 0) + 1;
    if (world.cells[target] === 'food') {
      world.foods++;
      world.energy = Math.min(100, world.energy + 25);
      world.cells[target] = 'floor';
      event = 'Ressource entdeckt (+25 Energie)';
    } else if (world.cells[target] === 'hazard') {
      world.energy = Math.max(0, world.energy - 15);
      event = 'Gefahr (-15 Energie)';
    }
  }
  if (world.energy === 0) {world.alive = false; event += ' · Energie aufgebraucht';}
  return {event, observation: observe(world)};
}
