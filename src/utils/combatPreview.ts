import type { CombatCase, CombatEntity, ZoneType } from '../types';

// --- Basic helpers ---

export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

// --- Reachable cells (movement) ---

export function getReachableCells(
  from: { x: number; y: number },
  pm: number,
  gridWidth: number,
  gridHeight: number,
  entities: CombatEntity[],
  obstacles: CombatCase[]
): Set<string> {
  const result = new Set<string>();
  const occupiedSet = new Set<string>();
  const blockedSet = new Set<string>();

  entities.filter(e => e.pvActuels > 0).forEach(e => occupiedSet.add(key(e.position.x, e.position.y)));
  obstacles.filter(c => c.bloqueDeplacement).forEach(c => blockedSet.add(key(c.x, c.y)));

  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      if (x === from.x && y === from.y) continue;
      const dist = manhattanDistance(from.x, from.y, x, y);
      if (dist > pm) continue;
      const k = key(x, y);
      if (blockedSet.has(k)) continue;
      if (occupiedSet.has(k)) continue;
      result.add(k);
    }
  }

  return result;
}

// --- Range cells (spell/weapon) ---

export function getCellsInRange(
  from: { x: number; y: number },
  porteeMin: number,
  porteeMax: number,
  gridWidth: number,
  gridHeight: number
): Set<string> {
  const result = new Set<string>();

  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      const dist = manhattanDistance(from.x, from.y, x, y);
      if (dist >= porteeMin && dist <= porteeMax) {
        result.add(key(x, y));
      }
    }
  }

  return result;
}

// --- Line of Sight (Bresenham supercover) ---

function getLineOfSightCells(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];

  let dx = Math.abs(to.x - from.x);
  let dy = Math.abs(to.y - from.y);

  const sx = to.x > from.x ? 1 : (to.x < from.x ? -1 : 0);
  const sy = to.y > from.y ? 1 : (to.y < from.y ? -1 : 0);

  let x = from.x;
  let y = from.y;
  let error = dx - dy;

  dx *= 2;
  dy *= 2;

  while (true) {
    cells.push({ x, y });

    if (x === to.x && y === to.y) break;

    if (error > 0) {
      x += sx;
      error -= dy;
    } else if (error < 0) {
      y += sy;
      error += dx;
    } else {
      // Corner case: both adjacent cells are potential blockers
      cells.push({ x: x + sx, y });
      cells.push({ x, y: y + sy });
      x += sx;
      y += sy;
      error += dx - dy;
    }
  }

  return cells;
}

export function hasLineOfSight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  entities: CombatEntity[],
  obstacles: CombatCase[]
): boolean {
  const cells = getLineOfSightCells(from, to);

  const losBlockedSet = new Set<string>();
  obstacles.filter(c => c.bloqueLigneDeVue).forEach(c => losBlockedSet.add(key(c.x, c.y)));

  const entitySet = new Set<string>();
  entities.filter(e => e.pvActuels > 0).forEach(e => entitySet.add(key(e.position.x, e.position.y)));

  for (const pos of cells) {
    // Skip source and destination
    if (pos.x === from.x && pos.y === from.y) continue;
    if (pos.x === to.x && pos.y === to.y) continue;

    if (losBlockedSet.has(key(pos.x, pos.y))) return false;
    if (entitySet.has(key(pos.x, pos.y))) return false;
  }

  return true;
}

// --- Area of Effect ---

interface ZoneConfig {
  type: ZoneType;
  taille: number;
}

export function getAffectedCells(
  target: { x: number; y: number },
  zone: ZoneConfig,
  gridWidth: number,
  gridHeight: number,
  casterPos?: { x: number; y: number }
): Set<string> {
  const affected = new Set<string>();

  switch (zone.type) {
    case 'CASE':
      if (isInBounds(target.x, target.y, gridWidth, gridHeight)) {
        affected.add(key(target.x, target.y));
      }
      break;

    case 'CROIX':
      affected.add(key(target.x, target.y));
      for (let i = 1; i <= zone.taille; i++) {
        if (isInBounds(target.x, target.y - i, gridWidth, gridHeight))
          affected.add(key(target.x, target.y - i));
        if (isInBounds(target.x, target.y + i, gridWidth, gridHeight))
          affected.add(key(target.x, target.y + i));
        if (isInBounds(target.x + i, target.y, gridWidth, gridHeight))
          affected.add(key(target.x + i, target.y));
        if (isInBounds(target.x - i, target.y, gridWidth, gridHeight))
          affected.add(key(target.x - i, target.y));
      }
      break;

    case 'CERCLE':
      for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
          if (manhattanDistance(target.x, target.y, x, y) <= zone.taille) {
            affected.add(key(x, y));
          }
        }
      }
      break;

    case 'LIGNE': {
      if (!casterPos) {
        affected.add(key(target.x, target.y));
        break;
      }
      const dx = target.x - casterPos.x;
      const dy = target.y - casterPos.y;
      let dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      let dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
      if (Math.abs(dx) > Math.abs(dy)) dirY = 0;
      else if (Math.abs(dy) > Math.abs(dx)) dirX = 0;

      for (let i = 0; i <= zone.taille; i++) {
        const x = target.x + dirX * i;
        const y = target.y + dirY * i;
        if (isInBounds(x, y, gridWidth, gridHeight)) {
          affected.add(key(x, y));
        }
      }
      break;
    }

    case 'CONE': {
      if (!casterPos) {
        affected.add(key(target.x, target.y));
        break;
      }
      const cdx = target.x - casterPos.x;
      const cdy = target.y - casterPos.y;
      let primaryX = cdx === 0 ? 0 : cdx > 0 ? 1 : -1;
      let primaryY = cdy === 0 ? 0 : cdy > 0 ? 1 : -1;
      if (Math.abs(cdx) > Math.abs(cdy)) primaryY = 0;
      else if (Math.abs(cdy) > Math.abs(cdx)) primaryX = 0;

      for (let i = 0; i <= zone.taille; i++) {
        const baseX = target.x + primaryX * i;
        const baseY = target.y + primaryY * i;
        const width = i;
        for (let w = -width; w <= width; w++) {
          const x = primaryX !== 0 ? baseX : baseX + w;
          const y = primaryX !== 0 ? baseY + w : baseY;
          if (isInBounds(x, y, gridWidth, gridHeight)) {
            affected.add(key(x, y));
          }
        }
      }
      break;
    }
  }

  return affected;
}
