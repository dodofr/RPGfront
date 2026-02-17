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

  // BFS flood fill from starting position
  const visited = new Set<string>();
  const startKey = key(from.x, from.y);
  visited.add(startKey);

  const queue: Array<{ x: number; y: number; cost: number }> = [
    { x: from.x, y: from.y, cost: 0 },
  ];

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nk = key(nx, ny);
      const nextCost = current.cost + 1;

      if (nextCost > pm) continue;
      if (!isInBounds(nx, ny, gridWidth, gridHeight)) continue;
      if (visited.has(nk)) continue;
      if (blockedSet.has(nk)) continue;

      visited.add(nk);

      // Can't stop on occupied cells, but can potentially walk through?
      // No — entities block movement, so we can't walk through them
      if (occupiedSet.has(nk)) continue;

      result.add(nk);
      queue.push({ x: nx, y: ny, cost: nextCost });
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
      // Corner case: line passes exactly through a corner between cells.
      // Permissive: the diagonal passes freely between the two corner cells.
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

    case 'LIGNE_PERPENDICULAIRE': {
      if (!casterPos) {
        affected.add(key(target.x, target.y));
        break;
      }
      const lpdx = target.x - casterPos.x;
      const lpdy = target.y - casterPos.y;
      let perpX: number, perpY: number;
      if (Math.abs(lpdx) > Math.abs(lpdy)) {
        perpX = 0; perpY = 1;
      } else {
        perpX = 1; perpY = 0;
      }
      affected.add(key(target.x, target.y));
      for (let i = 1; i <= zone.taille; i++) {
        if (isInBounds(target.x + perpX * i, target.y + perpY * i, gridWidth, gridHeight))
          affected.add(key(target.x + perpX * i, target.y + perpY * i));
        if (isInBounds(target.x - perpX * i, target.y - perpY * i, gridWidth, gridHeight))
          affected.add(key(target.x - perpX * i, target.y - perpY * i));
      }
      break;
    }

    case 'DIAGONALE':
      affected.add(key(target.x, target.y));
      for (let i = 1; i <= zone.taille; i++) {
        const diags: [number, number][] = [
          [target.x + i, target.y - i],
          [target.x - i, target.y - i],
          [target.x + i, target.y + i],
          [target.x - i, target.y + i],
        ];
        for (const [dx, dy] of diags) {
          if (isInBounds(dx, dy, gridWidth, gridHeight))
            affected.add(key(dx, dy));
        }
      }
      break;

    case 'CARRE':
      for (let x = target.x - zone.taille; x <= target.x + zone.taille; x++) {
        for (let y = target.y - zone.taille; y <= target.y + zone.taille; y++) {
          if (isInBounds(x, y, gridWidth, gridHeight))
            affected.add(key(x, y));
        }
      }
      break;

    case 'ANNEAU':
      for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
          if (manhattanDistance(target.x, target.y, x, y) === zone.taille)
            affected.add(key(x, y));
        }
      }
      break;

    case 'CONE_INVERSE': {
      if (!casterPos) {
        affected.add(key(target.x, target.y));
        break;
      }
      const cidx = target.x - casterPos.x;
      const cidy = target.y - casterPos.y;
      let invPX = cidx === 0 ? 0 : cidx > 0 ? -1 : 1;
      let invPY = cidy === 0 ? 0 : cidy > 0 ? -1 : 1;
      if (Math.abs(cidx) > Math.abs(cidy)) invPY = 0;
      else if (Math.abs(cidy) > Math.abs(cidx)) invPX = 0;

      for (let i = 0; i <= zone.taille; i++) {
        const baseX = target.x + invPX * i;
        const baseY = target.y + invPY * i;
        const width = i;
        for (let w = -width; w <= width; w++) {
          const x = invPX !== 0 ? baseX : baseX + w;
          const y = invPX !== 0 ? baseY + w : baseY;
          if (isInBounds(x, y, gridWidth, gridHeight))
            affected.add(key(x, y));
        }
      }
      break;
    }
  }

  return affected;
}
