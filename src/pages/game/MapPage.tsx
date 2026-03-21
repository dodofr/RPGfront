import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../../api/groups';
import { mapsApi } from '../../api/maps';
import { pnjApi } from '../../api/pnj';
import { charactersApi } from '../../api/characters';
import { playersApi } from '../../api/players';
import { queteApi } from '../../api/quetes';
import { donjonsApi } from '../../api/donjons';
import { metiersApi } from '../../api/metiers';
import { familiersApi } from '../../api/familiers';
import type { Group, GameMap, Direction, MapConnection, MapCase, PNJ, Character, InventoryState, InteractResponse, AdvanceQuestResponse, PnjStatusEntry, MapRessource, PersonnageMetier, HarvestResult, Familier, FamilierEnclosAssignment, EnclosType } from '../../types';
import SpriteAnimator from '../../components/SpriteAnimator';
import type { SpriteAnimState } from '../../utils/spriteConfig';
import '../../styles/index.css';

// Build world grid layout from directional links using BFS
function buildWorldGrid(maps: GameMap[]): { grid: Map<string, GameMap>; minX: number; minY: number; maxX: number; maxY: number } {
  const grid = new Map<string, GameMap>();
  if (maps.length === 0) return { grid, minX: 0, minY: 0, maxX: 0, maxY: 0 };

  const mapById = new Map(maps.map(m => [m.id, m]));
  const posById = new Map<number, { x: number; y: number }>();
  const visited = new Set<number>();

  const queue: Array<{ id: number; x: number; y: number }> = [{ id: maps[0].id, x: 0, y: 0 }];
  visited.add(maps[0].id);
  posById.set(maps[0].id, { x: 0, y: 0 });

  while (queue.length > 0) {
    const { id, x, y } = queue.shift()!;
    const map = mapById.get(id);
    if (!map) continue;
    grid.set(`${x},${y}`, map);

    const neighbors: Array<{ neighborId: number | null; dx: number; dy: number }> = [
      { neighborId: map.nordMapId, dx: 0, dy: -1 },
      { neighborId: map.sudMapId, dx: 0, dy: 1 },
      { neighborId: map.estMapId, dx: 1, dy: 0 },
      { neighborId: map.ouestMapId, dx: -1, dy: 0 },
    ];

    for (const { neighborId, dx, dy } of neighbors) {
      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId);
        const nx = x + dx;
        const ny = y + dy;
        posById.set(neighborId, { x: nx, y: ny });
        queue.push({ id: neighborId, x: nx, y: ny });
      }
    }
  }

  let nextY = 100;
  for (const map of maps) {
    if (!visited.has(map.id)) {
      grid.set(`${0},${nextY}`, map);
      posById.set(map.id, { x: 0, y: nextY });
      nextY++;
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const key of grid.keys()) {
    const [x, y] = key.split(',').map(Number);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { grid, minX, minY, maxX, maxY };
}

function findPath(
  fromX: number, fromY: number,
  toX: number, toY: number,
  blocked: Set<string>,
  width: number, height: number
): { x: number; y: number }[] {
  if (fromX === toX && fromY === toY) return [];
  const visited = new Set<string>([`${fromX},${fromY}`]);
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
    { x: fromX, y: fromY, path: [] }
  ];
  const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
  while (queue.length > 0) {
    const { x, y, path } = queue.shift()!;
    for (const { dx, dy } of dirs) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (visited.has(key) || blocked.has(key)) continue;
      const newPath = [...path, { x: nx, y: ny }];
      if (nx === toX && ny === toY) return newPath;
      visited.add(key);
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }
  return [];
}

const TYPE_COLORS: Record<string, string> = {
  WILDERNESS: '#2e7d32',
  VILLE: '#5c6bc0',
  DONJON: '#8e24aa',
  BOSS: '#c62828',
  SAFE: '#00838f',
};

const GROUP_ADJ = ['Braves', 'Courageux', 'Intrépides', 'Valeureux', 'Téméraires', 'Redoutables', 'Illustres', 'Furtifs', 'Féroces', 'Légendaires'];
const GROUP_NOUN = ['Aventuriers', 'Compagnons', 'Explorateurs', 'Guerriers', 'Chasseurs', 'Voyageurs', 'Pèlerins', 'Mercenaires', 'Sentinelles', 'Croisés'];
const randomGroupName = () => `Les ${GROUP_ADJ[Math.floor(Math.random() * GROUP_ADJ.length)]} ${GROUP_NOUN[Math.floor(Math.random() * GROUP_NOUN.length)]}`;

const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const groupIdParam = searchParams.get('groupId');
  const charIdParam = searchParams.get('charId');
  const navigate = useNavigate();

  const isSoloMode = !!charIdParam && !groupIdParam;

  const [group, setGroup] = useState<Group | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [alliedChars, setAlliedChars] = useState<Character[]>([]);
  const [mapData, setMapData] = useState<GameMap | null>(null);
  const [mapCases, setMapCases] = useState<MapCase[]>([]);
  const [allMaps, setAllMaps] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [animPos, setAnimPos] = useState<{ x: number; y: number } | null>(null);
  const [spriteState, setSpriteState] = useState<SpriteAnimState>('idle');
  const [showWorldMap, setShowWorldMap] = useState(false);

  // Grid scaling (same approach as CombatPage)
  const [gridPixelSize, setGridPixelSize] = useState<{ w: number; h: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);

  // Active dungeon run (solo)
  const [isInDungeon, setIsInDungeon] = useState(false);
  const [dungeonSalleActuelle, setDungeonSalleActuelle] = useState<number | null>(null);

  // Dungeon portal modal state
  const [dungeonModal, setDungeonModal] = useState<{ connection: MapConnection } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(4);

  // Network portal modal state
  const [portalModal, setPortalModal] = useState<{ connection: MapConnection } | null>(null);
  const [allPortals, setAllPortals] = useState<MapConnection[]>([]);

  // MapRessources state
  const [mapRessources, setMapRessources] = useState<MapRessource[]>([]);
  const [personnageMetiers, setPersonnageMetiers] = useState<PersonnageMetier[]>([]);
  const [harvestFeedback, setHarvestFeedback] = useState<HarvestResult | null>(null);
  const [harvestError, setHarvestError] = useState<string | null>(null);
  const [harvesting, setHarvesting] = useState(false);

  // Enclos state (VILLE maps only)
  const [showEnclosPanel, setShowEnclosPanel] = useState(false);
  const [enclosData, setEnclosData] = useState<FamilierEnclosAssignment[]>([]);
  const [enclosFamiliers, setEnclosFamiliers] = useState<Familier[]>([]);
  const [enclosDeposit, setEnclosDeposit] = useState<{ famId: number | ''; type: EnclosType; duree: number; partenaireId: number | '' }>({ famId: '', type: 'ENTRAINEMENT', duree: 60, partenaireId: '' });
  const [enclosError, setEnclosError] = useState<string | null>(null);
  const [enclosLoading, setEnclosLoading] = useState(false);

  // PNJ state
  const [mapPNJs, setMapPNJs] = useState<PNJ[]>([]);
  const [pnjStatus, setPnjStatus] = useState<Map<number, PnjStatusEntry>>(new Map());

  // Unified PNJ modal
  const [pnjModal, setPnjModal] = useState<{
    pnj: PNJ;
    interactData: InteractResponse;
    personnageId: number;
    chars: Character[];
    activeTab: 'dialogue' | 'boutique' | 'enclos';
  } | null>(null);
  const [pnjFeedback, setPnjFeedback] = useState<string | null>(null);
  const [pnjRecompenses, setPnjRecompenses] = useState<AdvanceQuestResponse['recompenses'] | null>(null);
  const [merchantTab, setMerchantTab] = useState<'buy' | 'sell'>('buy');
  const [merchantPersonnageId, setMerchantPersonnageId] = useState<number | null>(null);
  const [merchantFeedback, setMerchantFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [merchantInventory, setMerchantInventory] = useState<InventoryState | null>(null);

  // Current actor position (abstracted over group/solo)
  const posX: number = isSoloMode ? (character?.positionX ?? 0) : (group?.leader?.positionX ?? 0);
  const posY: number = isSoloMode ? (character?.positionY ?? 0) : (group?.leader?.positionY ?? 0);
  const actorName: string = isSoloMode ? (character?.nom ?? 'Aventurier') : (group?.nom ?? 'Groupe');

  // Dynamic grid size via ResizeObserver (same approach as CombatPage)
  useLayoutEffect(() => {
    const container = gridContainerRef.current;
    if (!container || !mapData) return;
    const W = mapData.largeur;
    const H = mapData.hauteur;
    const computeSize = (innerW: number, innerH: number) => {
      if (innerW <= 0 || innerH <= 0) return;
      const byWidth = innerW * H / W;
      const w = byWidth <= innerH ? innerW : innerH * W / H;
      const h = byWidth <= innerH ? byWidth : innerH;
      setGridPixelSize(prev => {
        if (prev && Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1) return prev;
        return { w: Math.floor(w), h: Math.floor(h) };
      });
    };
    const rect = container.getBoundingClientRect();
    computeSize(rect.width - 16, rect.height - 16);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        computeSize(width, height);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [mapData?.largeur, mapData?.hauteur]);

  const loadGroup = useCallback(async (gId: number) => {
    let g: Group | null = null;
    try {
      g = await groupsApi.getById(gId);
    } catch {
      navigate('/game/dashboard', { replace: true });
      return;
    }
    setGroup(g);
    const mapId = g.leader?.mapId;
    if (mapId) {
      const leaderId = g.leaderId;
      const [map, grid, pnjs, playerChars, ressources] = await Promise.all([
        mapsApi.getById(mapId),
        mapsApi.getGrid(mapId),
        pnjApi.getByMap(mapId),
        playersApi.getCharacters(g.joueurId),
        metiersApi.getMapRessources(mapId),
      ]);
      setMapData(map);
      setMapCases(grid.cases ?? []);
      setMapPNJs(pnjs);
      setMapRessources(ressources);
      const memberIds = new Set(g.personnages?.map((gp: any) => gp.personnage.id) ?? []);
      setAlliedChars(
        playerChars.filter((c: Character) => c.mapId === mapId && !memberIds.has(c.id))
      );
      const ids = g.personnages?.map((gp: any) => gp.personnage.id) ?? [];
      if (leaderId) {
        try { setPersonnageMetiers(await metiersApi.getPersonnageMetiers(leaderId)); } catch { /**/ }
      }
      if (pnjs.length > 0 && ids.length > 0) {
        const statuses = await pnjApi.getMapStatus(mapId, ids);
        setPnjStatus(new Map(statuses.map(s => [s.pnjId, s])));
      } else {
        setPnjStatus(new Map());
      }
    } else {
      setMapData(null);
      setMapCases([]);
      setMapPNJs([]);
      setAlliedChars([]);
      setPnjStatus(new Map());
      setMapRessources([]);
    }
  }, [navigate]);

  const loadCharacter = useCallback(async (cId: number) => {
    const c = await charactersApi.getById(cId);
    const allGroups = await groupsApi.getAll();
    const existingGroup = allGroups.find((g: Group) =>
      g.personnages?.some((gp: any) => gp.personnage.id === cId)
    );
    if (existingGroup) {
      navigate(`/game/adventure?groupId=${existingGroup.id}`, { replace: true });
      return;
    }
    setCharacter(c);
    // Check active dungeon run for solo character
    try {
      const runState = await donjonsApi.getRunStateSolo(cId);
      setIsInDungeon(!!runState?.run && !runState.run.termine);
      setDungeonSalleActuelle(runState?.run?.salleActuelle ?? null);
    } catch {
      setIsInDungeon(false);
      setDungeonSalleActuelle(null);
    }
    if (c.mapId) {
      const [map, grid, pnjs, playerChars, ressources, metiers] = await Promise.all([
        mapsApi.getById(c.mapId),
        mapsApi.getGrid(c.mapId),
        pnjApi.getByMap(c.mapId),
        playersApi.getCharacters(c.joueurId),
        metiersApi.getMapRessources(c.mapId),
        metiersApi.getPersonnageMetiers(cId),
      ]);
      setMapData(map);
      setMapCases(grid.cases ?? []);
      setMapPNJs(pnjs);
      setMapRessources(ressources);
      setPersonnageMetiers(metiers);
      setAlliedChars(playerChars.filter((p: Character) => p.id !== cId && p.mapId === c.mapId));
      if (pnjs.length > 0) {
        const statuses = await pnjApi.getMapStatus(c.mapId, [cId]);
        setPnjStatus(new Map(statuses.map(s => [s.pnjId, s])));
      } else {
        setPnjStatus(new Map());
      }
      setEnclosData([]);
      setEnclosFamiliers([]);
    } else {
      setMapData(null);
      setMapCases([]);
      setMapPNJs([]);
      setAlliedChars([]);
      setPnjStatus(new Map());
      setMapRessources([]);
      setPersonnageMetiers([]);
    }
  }, [navigate]);

  const reload = useCallback(async () => {
    if (isSoloMode && charIdParam) {
      await loadCharacter(Number(charIdParam));
    } else if (groupIdParam) {
      await loadGroup(Number(groupIdParam));
    }
  }, [isSoloMode, charIdParam, groupIdParam, loadCharacter, loadGroup]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [maps, portals] = await Promise.all([
        mapsApi.getAll(),
        mapsApi.getAllPortals(),
      ]);
      setAllMaps(maps);
      setAllPortals(portals);
      if (groupIdParam) {
        await loadGroup(Number(groupIdParam));
      } else if (charIdParam) {
        await loadCharacter(Number(charIdParam));
      }
      setLoading(false);
    };
    init();
  }, [groupIdParam, charIdParam, loadGroup, loadCharacter]);

  // Lightweight poll: refresh only character/group data (race sprites) every 3s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isSoloMode && charIdParam) {
        try {
          const c = await charactersApi.getById(Number(charIdParam));
          setCharacter(c);
        } catch { /* ignore */ }
      } else if (!isSoloMode && groupIdParam) {
        try {
          const g = await groupsApi.getById(Number(groupIdParam));
          setGroup(g);
        } catch { /* ignore */ }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isSoloMode, charIdParam, groupIdParam]);

  const worldGrid = useMemo(() => buildWorldGrid(allMaps), [allMaps]);

  const connectionAt = useMemo(() => {
    const map = new Map<string, MapConnection>();
    if (mapData?.connectionsFrom) {
      for (const conn of mapData.connectionsFrom) {
        map.set(`${conn.positionX},${conn.positionY}`, conn);
      }
    }
    return map;
  }, [mapData]);

  const blockedAt = useMemo(() => {
    const set = new Set<string>();
    for (const c of mapCases) {
      if (c.bloqueDeplacement || c.estExclue) set.add(`${c.x},${c.y}`);
    }
    return set;
  }, [mapCases]);

  const losBlockedAt = useMemo(() => {
    const set = new Set<string>();
    for (const c of mapCases) {
      if (c.bloqueLigneDeVue || c.estExclue) set.add(`${c.x},${c.y}`);
    }
    return set;
  }, [mapCases]);

  const pnjAt = useMemo(() => {
    const map = new Map<string, PNJ>();
    for (const p of mapPNJs) {
      map.set(`${p.positionX},${p.positionY}`, p);
    }
    return map;
  }, [mapPNJs]);

  const ressourceAt = useMemo(() => {
    const map = new Map<string, MapRessource>();
    for (const r of mapRessources) {
      map.set(`${r.caseX},${r.caseY}`, r);
    }
    return map;
  }, [mapRessources]);

  const handleHarvest = async (ressource: MapRessource) => {
    const charId = isSoloMode ? character?.id : group?.leaderId;
    if (!charId) return;
    setHarvesting(true);
    setHarvestFeedback(null);
    setHarvestError(null);
    try {
      const result = await metiersApi.harvest(charId, ressource.id);
      setHarvestFeedback(result);
      // Refresh ressources to update lastHarvestAt
      if (mapData) {
        const fresh = await metiersApi.getMapRessources(mapData.id);
        setMapRessources(fresh);
        // Refresh metiers (xp/niveau)
        const freshMetiers = await metiersApi.getPersonnageMetiers(charId);
        setPersonnageMetiers(freshMetiers);
      }
    } catch (err: unknown) {
      setHarvestError((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
    }
    setHarvesting(false);
  };

  const alliedAt = useMemo(() => {
    const map = new Map<string, Character>();
    for (const a of alliedChars) {
      map.set(`${a.positionX},${a.positionY}`, a);
    }
    return map;
  }, [alliedChars]);

  const handleCellClick = async (x: number, y: number) => {
    if ((!group && !character) || !mapData || moving) return;

    const conn = connectionAt.get(`${x},${y}`);
    if (conn && x === posX && y === posY) {
      if (conn.donjonId && conn.donjon) {
        setDungeonModal({ connection: conn });
        return;
      }
      setPortalModal({ connection: conn });
      return;
    }

    const clickedPnj = pnjAt.get(`${x},${y}`);
    if (clickedPnj) {
      const chars: Character[] = isSoloMode
        ? (character ? [character] : [])
        : ((group?.personnages ?? []).map((gp: any) => gp.personnage).filter(Boolean) as Character[]);
      const firstCharId = chars[0]?.id ?? null;
      if (firstCharId) await openPnjModal(clickedPnj, firstCharId, chars);
      return;
    }

    const edgeDir = isEdge(x, y);

    if (edgeDir) {
      const dir: Direction = edgeDir;

      setMoving(true);
      try {
        let result;
        if (isSoloMode && character) {
          result = await charactersApi.navMoveDirection(character.id, dir);
        } else if (group) {
          result = await groupsApi.moveDirection(group.id, dir);
        }
        if (result?.combat) {
          navigate(`/game/combat/${result.combat.id}`);
          return;
        }
        await reload();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message :
          (err as any)?.response?.data?.error || 'Erreur';
        alert(msg);
      }
      setMoving(false);
      return;
    }

    if (x === posX && y === posY) return;

    const path = findPath(posX, posY, x, y, blockedAt, mapData.largeur, mapData.hauteur);
    if (path.length === 0) return;

    setMoving(true);

    await new Promise<void>(resolve => {
      let step = 0;
      let prevPos = { x: posX, y: posY };
      const interval = setInterval(() => {
        const curr = path[step];
        const dx = curr.x - prevPos.x;
        const dy = curr.y - prevPos.y;
        const dir: SpriteAnimState =
          dx > 0 ? 'walk-right' : dx < 0 ? 'walk-left' :
          dy > 0 ? 'walk-down' : 'walk-up';
        setSpriteState(dir);
        setAnimPos(curr);
        prevPos = curr;
        step++;
        if (step >= path.length) {
          clearInterval(interval);
          resolve();
        }
      }, 150);
    });

    setSpriteState('idle');

    try {
      let result;
      if (isSoloMode && character) {
        result = await charactersApi.navMove(character.id, x, y);
      } else if (group) {
        result = await groupsApi.move(group.id, x, y);
      }
      if (result?.combat) {
        setAnimPos(null);
        navigate(`/game/combat/${result.combat.id}`);
        return;
      }
      await reload();
      setAnimPos(null);
    } catch (err: unknown) {
      setAnimPos(null);
      const msg = err instanceof Error ? err.message :
        (err as any)?.response?.data?.error || 'Erreur';
      alert(msg);
    }
    setMoving(false);
  };

  const handleEnterDungeon = async () => {
    if (!dungeonModal) return;
    setMoving(true);
    setDungeonModal(null);
    try {
      if (isSoloMode && character) {
        await charactersApi.navUseConnection(character.id, dungeonModal.connection.id, undefined, selectedDifficulty);
      } else if (group) {
        await groupsApi.useConnection(group.id, dungeonModal.connection.id, selectedDifficulty);
      }
      await reload();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
    setMoving(false);
  };


  const handleAbandonDungeon = async () => {
    if (!character) return;
    if (!window.confirm('Abandonner le donjon ? Vous retournerez à votre point de départ.')) return;
    try {
      await donjonsApi.abandonRunSolo(character.id);
      setIsInDungeon(false);
      setDungeonSalleActuelle(null);
      await reload();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
  };

  const handleUsePortal = async (conn: MapConnection, destinationConnectionId: number) => {
    setPortalModal(null);
    setMoving(true);
    try {
      if (isSoloMode && character) {
        await charactersApi.navUseConnection(character.id, conn.id, destinationConnectionId);
      } else if (group) {
        await groupsApi.useConnection(group.id, conn.id, undefined, destinationConnectionId);
      }
      await reload();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
    setMoving(false);
  };

  const handleEngage = async (groupeEnnemiId: number) => {
    if (!mapData) return;
    try {
      const engageBody: { groupeEnnemiId: number; groupeId?: number; personnageId?: number } = { groupeEnnemiId };
      if (isSoloMode && character) {
        engageBody.personnageId = character.id;
      } else if (group) {
        engageBody.groupeId = group.id;
      }
      const result = await mapsApi.engage(mapData.id, engageBody);
      navigate(`/game/combat/${result.id}`);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
  };

  const handleSpawnEnemies = async () => {
    if (!mapData) return;
    await mapsApi.spawnEnemies(mapData.id);
    await reload();
  };

  const openPnjModal = async (pnj: PNJ, charId: number, chars: Character[]) => {
    try {
      const interactData = await queteApi.interact(pnj.id, charId);
      const hasQuestContent = interactData.quetesDisponibles?.length > 0 || interactData.etapesEnAttente?.length > 0;
      const defaultTab: 'dialogue' | 'boutique' | 'enclos' = interactData.estMarchand && !hasQuestContent && !interactData.dialogues?.length ? 'boutique' : 'dialogue';
      setPnjFeedback(null);
      setPnjRecompenses(null);
      setMerchantFeedback({});
      setMerchantInventory(null);
      setEnclosError(null);
      setEnclosDeposit({ famId: '', type: 'ENTRAINEMENT', duree: 60, partenaireId: '' });
      if (interactData.estMarchand && chars.length > 0) {
        setMerchantPersonnageId(chars[0].id);
        const inv = await charactersApi.getInventory(chars[0].id);
        setMerchantInventory(inv);
      }
      if (pnj.estGardienEnclos && chars.length > 0) {
        const [enclos, fams] = await Promise.all([
          familiersApi.getEnclosByMap(pnj.mapId).catch(() => []),
          familiersApi.getByCharacter(chars[0].id).catch(() => []),
        ]);
        setEnclosData(enclos);
        setEnclosFamiliers(fams);
      }
      setPnjModal({ pnj, interactData, personnageId: charId, chars, activeTab: defaultTab });
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
  };

  const refreshPnjStatus = async (mapId: number, ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const statuses = await pnjApi.getMapStatus(mapId, ids);
      setPnjStatus(new Map(statuses.map(s => [s.pnjId, s])));
    } catch { /* silent */ }
  };

  const handleRemoveMember = async (charId: number) => {
    if (!group) return;
    const isLastMember = (group.personnages?.length ?? 0) <= 1;
    try {
      await groupsApi.removeCharacter(group.id, charId);
      if (isLastMember) {
        navigate(`/game/adventure?charId=${charId}`, { replace: true });
      } else {
        await reload();
      }
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  const handleInviteMember = async (charId: number) => {
    if (!group) return;
    try {
      const allGroups = await groupsApi.getAll();
      const existingGroup = allGroups.find((g: Group) =>
        g.id !== group.id && g.personnages?.some((gp: any) => gp.personnage.id === charId)
      );
      if (existingGroup) {
        await groupsApi.removeCharacter(existingGroup.id, charId);
      }
      await groupsApi.addCharacter(group.id, charId);
      await reload();
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  if (!group && !character) {
    return <div className="loading">Chargement...</div>;
  }

  if (!mapData) {
    return <div className="loading">Chargement de la carte...</div>;
  }

  const enemies = (mapData.groupesEnnemis || []).filter(ge => !ge.vaincu);

  const getCellType = (x: number, y: number) => {
    if (x === posX && y === posY) return 'player';
    if (alliedAt.has(`${x},${y}`)) return 'ally';
    for (const ge of enemies) {
      if (ge.positionX === x && ge.positionY === y) return 'enemy';
    }
    if (connectionAt.has(`${x},${y}`)) return 'connection';
    if (pnjAt.has(`${x},${y}`)) return 'npc';
    if (ressourceAt.has(`${x},${y}`)) return 'resource';
    return 'empty';
  };

  const isRessourceAvailable = (r: MapRessource) => {
    if (!r.lastHarvestAt) return true;
    const elapsed = (Date.now() - new Date(r.lastHarvestAt).getTime()) / 1000 / 60;
    return elapsed >= r.respawnMinutes;
  };

  const getNodeIcon = (nom: string) => {
    const n = nom.toLowerCase();
    if (n.includes('blé') || n.includes('ble') || n.includes('grain') || n.includes('champ')) return '🌾';
    if (n.includes('lin')) return '🌿';
    return '🌳';
  };

  const getEnemyAt = (x: number, y: number) =>
    enemies.find(ge => ge.positionX === x && ge.positionY === y);

  const isEdge = (x: number, y: number) => {
    if (mapData.nordMapId && mapData.nordExitX === x && mapData.nordExitY === y) return 'NORD';
    if (mapData.sudMapId && mapData.sudExitX === x && mapData.sudExitY === y) return 'SUD';
    if (mapData.ouestMapId && mapData.ouestExitX === x && mapData.ouestExitY === y) return 'OUEST';
    if (mapData.estMapId && mapData.estExitX === x && mapData.estExitY === y) return 'EST';
    return null;
  };

  const playerOnConnection = connectionAt.get(`${posX},${posY}`);

  const { grid: worldMap, minX, minY, maxX, maxY } = worldGrid;
  const worldW = maxX - minX + 1;
  const worldH = maxY - minY + 1;

  const getGroupChars = (): Character[] =>
    (group?.personnages ?? []).map((gp: any) => gp.personnage).filter(Boolean) as Character[];

  return (
    <div className="adv-page">
      {/* HEADER */}
      <div className="adv-header">
        <span className="adv-breadcrumb">
          {mapData.region?.nom ? `${mapData.region.nom} › ` : ''}{mapData.nom}
        </span>
        <span className="adv-header-meta">
          {mapData.type} · {mapData.combatMode} · ({posX}, {posY})
          {moving && ' · Déplacement...'}
        </span>
      </div>

      {/* MAIN */}
      <div className="adv-main">
        {/* LEFT: member cards */}
        <div className="adv-left">
          {isSoloMode && character ? (
            <div
              className="adv-member-card"
              onClick={() => navigate(`/game/characters?playerId=${character.joueurId}&charId=${character.id}`)}
              title="Voir la fiche"
            >
              <div className="adv-member-initial">{character.nom.charAt(0).toUpperCase()}</div>
              <div className="adv-member-name">{character.nom}</div>
              <div className="adv-member-level">Niv. {character.niveau}</div>
              <div className="adv-member-xp">
                {Math.max(0, (character.niveau + 1) ** 2 * 50 - character.experience)} XP
              </div>
            </div>
          ) : (
            group?.personnages?.map(({ personnage: p }) => (
              <div key={p.id} style={{ position: 'relative' }}>
                <div
                  className="adv-member-card"
                  onClick={() => navigate(`/game/characters?playerId=${group.joueurId}&groupId=${groupIdParam}&charId=${p.id}`)}
                  title={`Voir la fiche de ${p.nom}`}
                >
                  <div className="adv-member-initial">{p.nom.charAt(0).toUpperCase()}</div>
                  <div className="adv-member-name">{p.nom}</div>
                  <div className="adv-member-level">Niv. {p.niveau}</div>
                  <div className="adv-member-xp">
                    {Math.max(0, (p.niveau + 1) ** 2 * 50 - (p.experience ?? 0))} XP
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ position: 'absolute', top: 2, right: 2, padding: '1px 4px', fontSize: 9, lineHeight: 1.2, minWidth: 0 }}
                  title="Retirer du groupe"
                  onClick={e => { e.stopPropagation(); handleRemoveMember(p.id); }}
                >✕</button>
              </div>
            ))
          )}

          {/* Dissolve button at bottom for group mode */}
          {!isSoloMode && group && (
            <button
              className="btn btn-sm btn-danger"
              style={{ marginTop: 'auto', width: '100%', fontSize: 10, opacity: 0.8 }}
              onClick={async () => {
                if (!confirm('Dissoudre le groupe ?')) return;
                const leaderId = group.leader?.id;
                try {
                  await groupsApi.remove(group.id);
                  if (leaderId) navigate(`/game/adventure?charId=${leaderId}`, { replace: true });
                  else navigate('/game/dashboard', { replace: true });
                } catch (err: unknown) {
                  alert((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
                }
              }}
            >
              Dissoudre
            </button>
          )}
        </div>

        {/* GRID */}
        <div className="adv-grid-container" ref={gridContainerRef}>
          <div
            className="adventure-grid"
            style={{
              gridTemplateColumns: `repeat(${mapData.largeur}, 1fr)`,
              gridTemplateRows: `repeat(${mapData.hauteur}, 1fr)`,
              ...(gridPixelSize
                ? { width: gridPixelSize.w, height: gridPixelSize.h }
                : { width: '100%', aspectRatio: `${mapData.largeur} / ${mapData.hauteur}` }),
              ...(mapData.imageUrl
                ? { backgroundImage: `url(${mapData.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}),
              position: 'relative',
            }}
          >
            {(() => {
              const cellW = gridPixelSize ? gridPixelSize.w / mapData.largeur : 40;
              const cellH = gridPixelSize ? gridPixelSize.h / mapData.hauteur : 40;
              return Array.from({ length: mapData.hauteur }, (_, y) =>
              Array.from({ length: mapData.largeur }, (_, x) => {
                const cellType = getCellType(x, y);
                const edge = isEdge(x, y);
                const enemy = cellType === 'enemy' ? getEnemyAt(x, y) : null;
                const conn = connectionAt.get(`${x},${y}`);
                const npc = pnjAt.get(`${x},${y}`);
                const nodeRessource = ressourceAt.get(`${x},${y}`);
                const renderX = animPos?.x ?? posX;
                const renderY = animPos?.y ?? posY;
                const isPlayerHere = x === renderX && y === renderY;
                const allyHere = alliedAt.get(`${x},${y}`);

                const isBlocked = blockedAt.has(`${x},${y}`);
                const isLosBlocked = losBlockedAt.has(`${x},${y}`);
                let className = 'adventure-cell';
                if (isBlocked) className += isLosBlocked ? ' cell-obstacle-los' : ' cell-obstacle';
                const playerImg = isPlayerHere ? (isSoloMode ? character?.imageUrl : group?.leader?.imageUrl) : null;
                if (isPlayerHere && !playerImg) className += ' cell-player';
                else if (cellType === 'ally' && !allyHere?.imageUrl) className += ' cell-ally';
                else if (cellType === 'enemy' && !enemy?.membres?.[0]?.monstre?.imageUrl) className += ' cell-enemy';
                else if (cellType === 'connection') className += ' cell-connection';
                else if (cellType === 'npc') className += ' cell-npc';
                else if (cellType === 'resource') className += nodeRessource && isRessourceAvailable(nodeRessource) ? ' cell-resource' : ' cell-resource cell-resource-depleted';
                if (edge) className += ' cell-edge';

                // Resolve entity image for this cell
                const edgeImageUrl: string | null | undefined =
                  edge === 'NORD' ? mapData.nordExitImageUrl :
                  edge === 'SUD' ? mapData.sudExitImageUrl :
                  edge === 'EST' ? mapData.estExitImageUrl :
                  edge === 'OUEST' ? mapData.ouestExitImageUrl : null;

                const cellImageUrl: string | null | undefined =
                  isPlayerHere ? (isSoloMode ? character?.imageUrl : group?.leader?.imageUrl) :
                  cellType === 'ally' ? allyHere?.imageUrl :
                  cellType === 'enemy' ? (enemy?.membres?.[0]?.monstre?.imageUrl) :
                  cellType === 'connection' ? conn?.imageUrl :
                  cellType === 'npc' ? npc?.imageUrl :
                  cellType === 'empty' && edge ? edgeImageUrl :
                  null;

                const cellCharPerso = isPlayerHere
                  ? (isSoloMode ? character : group?.leader)
                  : cellType === 'ally' ? allyHere : null;
                const cellRace = cellCharPerso?.race ?? null;
                const cellIsFemme = cellCharPerso?.sexe === 'FEMME';
                const enemyMonstre = cellType === 'enemy' ? enemy?.membres?.[0]?.monstre : null;
                const cellSpriteScale = cellRace
                  ? (cellIsFemme ? (cellRace.spriteScaleFemme ?? cellRace.spriteScale) : cellRace.spriteScale) ?? 1
                  : enemyMonstre?.spriteScale ?? (cellType === 'npc' ? (npc?.spriteScale ?? 1) : 1);
                const cellSpriteOffsetX = cellRace
                  ? (cellIsFemme ? (cellRace.spriteOffsetXFemme ?? cellRace.spriteOffsetX) : cellRace.spriteOffsetX) ?? 0
                  : enemyMonstre?.spriteOffsetX ?? (cellType === 'npc' ? (npc?.spriteOffsetX ?? 0) : 0);
                const cellSpriteOffsetY = cellRace
                  ? (cellIsFemme ? (cellRace.spriteOffsetYFemme ?? cellRace.spriteOffsetY) : cellRace.spriteOffsetY) ?? 0
                  : enemyMonstre?.spriteOffsetY ?? (cellType === 'npc' ? (npc?.spriteOffsetY ?? 0) : 0);

                return (
                  <div
                    key={`${x}-${y}`}
                    className={className}
                    style={{
                      ...(cellType === 'connection' && !isPlayerHere ? { background: conn?.donjonId ? '#ce93d8' : '#90caf9' } : {}),
                      ...(cellType === 'npc' && !isPlayerHere ? { background: '#a5d6a7' } : {}),
                      ...(cellType === 'ally' && !allyHere?.imageUrl ? { background: '#1565c0' } : {}),
                      overflow: 'visible',
                      position: 'relative',
                    }}
                    onClick={() => {
                      setSelectedCell({ x, y });
                      if (cellType !== 'enemy') {
                        handleCellClick(x, y);
                      }
                    }}
                    title={
                      isPlayerHere
                        ? (conn ? `${actorName} - ${conn.nom}` : actorName)
                        : cellType === 'enemy' && enemy
                          ? `Ennemis (${enemy.membres?.map(m => `${m.monstre?.nom} Niv.${m.niveau}`).join(', ')})`
                          : conn
                            ? `${conn.nom}${conn.donjon ? ` [Donjon: ${conn.donjon.nom}]` : ''}`
                            : edge
                              ? `Aller ${edge}`
                              : `(${x}, ${y})`
                    }
                  >
                    {cellImageUrl ? (
                      isPlayerHere ? (
                        <SpriteAnimator
                          imageUrl={cellImageUrl}
                          animState={spriteState}
                          displayHeight={1.4 * cellSpriteScale * cellH}
                          configOverride={cellRace ? (cellIsFemme ? (cellRace.spriteConfigFemme ?? cellRace.spriteConfigHomme) : cellRace.spriteConfigHomme) : undefined}
                          style={{
                            position: 'absolute',
                            bottom: `${cellSpriteOffsetY / 100 * cellH}px`,
                            left: `${cellW * (0.5 + cellSpriteOffsetX / 100)}px`,
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                      ) : (
                        <img
                          src={cellImageUrl}
                          alt=""
                          style={{
                            position: 'absolute',
                            bottom: `${cellSpriteOffsetY / 100 * cellH}px`,
                            left: `${cellW * (0.5 + cellSpriteOffsetX / 100)}px`,
                            transform: 'translateX(-50%)',
                            height: `${1.4 * cellSpriteScale * cellH}px`,
                            width: 'auto',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                      )
                    ) : (
                      <>
                        {isPlayerHere && <span className="cell-icon">{actorName.charAt(0).toUpperCase()}</span>}
                        {cellType === 'ally' && <span className="cell-icon" title={allyHere?.nom}>{allyHere?.nom.charAt(0).toUpperCase() ?? 'A'}</span>}
                        {cellType === 'enemy' && <span className="cell-icon">E</span>}
                        {cellType === 'connection' && !isPlayerHere && (
                          <span className="cell-icon">{conn?.donjonId ? '⚔' : '🚪'}</span>
                        )}
                        {cellType === 'resource' && nodeRessource && (
                          <span
                            className="cell-icon"
                            title={`${nodeRessource.noeud.nom} (${nodeRessource.noeud.metier?.nom}) — ${isRessourceAvailable(nodeRessource) ? 'Disponible' : 'En repousse'}`}
                            style={{ opacity: isRessourceAvailable(nodeRessource) ? 1 : 0.4, fontSize: '1.1em' }}
                          >
                            {getNodeIcon(nodeRessource.noeud.nom)}
                          </span>
                        )}
                        {cellType === 'npc' && !isPlayerHere && (
                          <span className="cell-icon" style={{ position: 'relative' }} title={npc?.nom}>
                            💬
                            {pnjStatus.get(npc!.id)?.hasPending && (
                              <span style={{ position: 'absolute', top: -4, right: -4, background: '#ff9800', color: '#000', borderRadius: '50%', width: 14, height: 14, fontSize: 9, lineHeight: '14px', textAlign: 'center', fontWeight: 'bold', display: 'block' }}>?</span>
                            )}
                            {!pnjStatus.get(npc!.id)?.hasPending && pnjStatus.get(npc!.id)?.hasAvailable && (
                              <span style={{ position: 'absolute', top: -4, right: -4, background: '#4caf50', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 9, lineHeight: '14px', textAlign: 'center', fontWeight: 'bold', display: 'block' }}>!</span>
                            )}
                          </span>
                        )}
                        {cellType === 'empty' && edge && (
                          <span className="cell-edge-arrow">
                            {edge === 'NORD' ? '↑' : edge === 'SUD' ? '↓' : edge === 'OUEST' ? '←' : '→'}
                          </span>
                        )}
                      </>
                    )}
                    {/* Badge quête sur PNJ même avec image */}
                    {cellImageUrl && cellType === 'npc' && npc && (
                      <>
                        {pnjStatus.get(npc.id)?.hasPending && (
                          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ff9800', color: '#000', borderRadius: '50%', width: 14, height: 14, fontSize: 9, lineHeight: '14px', textAlign: 'center', fontWeight: 'bold', display: 'block', zIndex: 3 }}>?</span>
                        )}
                        {!pnjStatus.get(npc.id)?.hasPending && pnjStatus.get(npc.id)?.hasAvailable && (
                          <span style={{ position: 'absolute', top: 0, right: 0, background: '#4caf50', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 9, lineHeight: '14px', textAlign: 'center', fontWeight: 'bold', display: 'block', zIndex: 3 }}>!</span>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            );
            })()}
            {/* Premier-plan overlay: rendered on top of entities */}
            {mapCases.filter(c => c.estPremierPlan).map(c => (
              <div
                key={`pp-${c.x}-${c.y}`}
                className="premier-plan-cell"
                style={{
                  gridColumn: c.x + 1,
                  gridRow: c.y + 1,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="adv-right">
          {/* PNJs */}
          {mapPNJs.length > 0 && (
            <div className="adv-panel-section">
              <h4>PNJs ({mapPNJs.length})</h4>
              {mapPNJs.map(pnj => {
                const status = pnjStatus.get(pnj.id);
                return (
                  <div key={pnj.id} className="adv-panel-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 11 }}>
                        💬 {pnj.nom}
                        {status?.hasPending && <span style={{ marginLeft: 4, color: '#ff9800' }}>?</span>}
                        {!status?.hasPending && status?.hasAvailable && <span style={{ marginLeft: 4, color: '#4caf50' }}>!</span>}
                      </span>
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        onClick={async () => {
                          const chars = isSoloMode ? (character ? [character] : []) : getGroupChars();
                          if (chars.length > 0) await openPnjModal(pnj, chars[0].id, chars);
                        }}
                      >Parler</button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>({pnj.positionX}, {pnj.positionY})</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Enemies */}
          {enemies.length > 0 && (
            <div className="adv-panel-section">
              <h4>Ennemis ({enemies.length})</h4>
              {enemies.map(ge => (
                <div key={ge.id} className="adv-panel-card">
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>({ge.positionX}, {ge.positionY})</div>
                  <div style={{ fontSize: 11 }}>{ge.membres?.map(m => `${m.monstre?.nom} x${m.quantite} Niv.${m.niveau}`).join(', ')}</div>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ fontSize: 10, padding: '2px 6px', marginTop: 2 }}
                    onClick={() => handleEngage(ge.id)}
                  >Engager</button>
                </div>
              ))}
            </div>
          )}


          {/* Allied chars on same map */}
          {alliedChars.length > 0 && (
            <div className="adv-panel-section">
              <h4>Sur cette map</h4>
              {alliedChars.map(a => (
                <div key={a.id} className="adv-panel-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11 }}>{a.nom} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Niv.{a.niveau}</span></span>
                  {isSoloMode ? (
                    <button
                      className="btn btn-sm btn-success"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={async () => {
                        if (!character) return;
                        try {
                          const grp = await groupsApi.create({
                            nom: randomGroupName(),
                            joueurId: character.joueurId,
                            leaderId: character.id,
                          });
                          const allGroups = await groupsApi.getAll();
                          const existingGroup = allGroups.find((g: Group) =>
                            g.personnages?.some((gp: any) => gp.personnage.id === a.id)
                          );
                          if (existingGroup) await groupsApi.removeCharacter(existingGroup.id, a.id);
                          await groupsApi.addCharacter(grp.id, a.id);
                          navigate(`/game/adventure?groupId=${grp.id}`);
                        } catch (err: unknown) {
                          alert((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
                        }
                      }}
                    >+ Groupe</button>
                  ) : (
                    <button
                      className="btn btn-sm btn-success"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => handleInviteMember(a.id)}
                    >+ Inviter</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="adv-bottom-bar">
        <div className="adv-bottom-actions">
          <button className="btn btn-sm btn-info" onClick={() => setShowWorldMap(true)}>Carte du monde</button>
          {mapData.combatMode === 'MANUEL' && (
            <button className="btn btn-sm btn-secondary" onClick={handleSpawnEnemies}>Spawn ennemis</button>
          )}
          {isSoloMode && isInDungeon && (
            <>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salle {dungeonSalleActuelle}/4</span>
              <button className="btn btn-sm btn-danger" onClick={handleAbandonDungeon}>Abandonner le donjon</button>
            </>
          )}
        </div>

        <div className="adv-bottom-info">
          {playerOnConnection ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>
                {playerOnConnection.donjonId ? '⚔️' : '🚪'} {playerOnConnection.nom}
                {playerOnConnection.donjon && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>
                    Niv.{playerOnConnection.donjon.niveauMin}-{playerOnConnection.donjon.niveauMax}
                  </span>
                )}
              </span>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  if (playerOnConnection.donjonId && playerOnConnection.donjon) {
                    setDungeonModal({ connection: playerOnConnection });
                  } else {
                    setPortalModal({ connection: playerOnConnection });
                  }
                }}
              >
                {playerOnConnection.donjonId ? 'Entrer dans le donjon' : 'Utiliser le portail'}
              </button>
            </div>
          ) : selectedCell ? (() => {
            const { x, y } = selectedCell;
            const selEnemy = enemies.find(ge => ge.positionX === x && ge.positionY === y);
            const selConn = connectionAt.get(`${x},${y}`);
            const selPnj = pnjAt.get(`${x},${y}`);
            const selAlly = alliedAt.get(`${x},${y}`);
            const selRessource = ressourceAt.get(`${x},${y}`);

            if (selRessource) {
              const noeud = selRessource.noeud;
              const metierPerso = personnageMetiers.find(pm => pm.metierId === noeud.metierId);
              const available = isRessourceAvailable(selRessource);
              const canHarvest = metierPerso && metierPerso.niveau >= noeud.niveauMinAcces && available;
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{getNodeIcon(noeud.nom)} {noeud.nom}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                      {noeud.metier?.nom} Niv.{noeud.niveauMinAcces}
                      {metierPerso ? ` (vous : Niv.${metierPerso.niveau})` : ' (métier non appris)'}
                    </span>
                    {!available && (
                      <span style={{ color: '#ff9800', fontSize: 11, marginLeft: 8 }}>En repousse…</span>
                    )}
                    {harvestError && <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 8 }}>{harvestError}</span>}
                    {harvestFeedback && (
                      <span style={{ color: 'var(--success)', fontSize: 12, marginLeft: 8 }}>
                        +{harvestFeedback.loot.map(l => `${l.quantite}× ${l.ressource.nom}`).join(', ')}
                        {harvestFeedback.metier.levelUp && ` 🎉 Niveau ${harvestFeedback.metier.niveau} !`}
                      </span>
                    )}
                  </div>
                  {canHarvest && (
                    <button
                      className="btn btn-sm btn-success"
                      disabled={harvesting}
                      onClick={() => handleHarvest(selRessource)}
                    >
                      {harvesting ? '…' : 'Récolter'}
                    </button>
                  )}
                </div>
              );
            }

            if (selEnemy) {
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>⚔ {selEnemy.membres?.map(m => `${m.monstre?.nom} x${m.quantite} Niv.${m.niveau}`).join(', ')}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => handleEngage(selEnemy.id)}>Engager</button>
                </div>
              );
            }
            if (selConn) {
              return (
                <span>
                  {selConn.donjonId ? '⚔️' : '🚪'} <strong>{selConn.nom}</strong>
                  {selConn.donjon && ` — Donjon Niv.${selConn.donjon.niveauMin}-${selConn.donjon.niveauMax}`}
                  {selConn.toMap && !selConn.donjonId && ` → ${selConn.toMap.nom}`}
                </span>
              );
            }
            if (selPnj) {
              const status = pnjStatus.get(selPnj.id);
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    💬 {selPnj.nom}
                    {status?.hasPending && <span style={{ color: '#ff9800', marginLeft: 4 }}>?</span>}
                    {!status?.hasPending && status?.hasAvailable && <span style={{ color: '#4caf50', marginLeft: 4 }}>!</span>}
                  </span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={async () => {
                      const chars = isSoloMode ? (character ? [character] : []) : getGroupChars();
                      if (chars.length > 0) await openPnjModal(selPnj, chars[0].id, chars);
                    }}
                  >Parler</button>
                </div>
              );
            }
            if (selAlly) {
              return <span>Allié : {selAlly.nom} — Niv. {selAlly.niveau}</span>;
            }
            return <span style={{ color: 'var(--text-muted)' }}>Case ({x}, {y})</span>;
          })() : (
            <span style={{ color: 'var(--text-muted)' }}>Cliquez une case pour voir les détails</span>
          )}
        </div>
      </div>

      {/* World map modal */}
      {showWorldMap && (
        <div className="modal-overlay" onClick={() => setShowWorldMap(false)}>
          <div className="worldmap-modal" onClick={e => e.stopPropagation()}>
            <div className="worldmap-header">
              <h2>Carte du monde</h2>
              <button className="btn btn-secondary" onClick={() => setShowWorldMap(false)}>Fermer</button>
            </div>
            <div className="worldmap-legend">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <span key={type} className="worldmap-legend-item">
                  <span className="worldmap-legend-dot" style={{ background: color }} />
                  {type}
                </span>
              ))}
            </div>
            <div className="worldmap-content">
              <div
                className="minimap-grid"
                style={{
                  gridTemplateColumns: `repeat(${worldW}, 1fr)`,
                  gridTemplateRows: `repeat(${worldH}, 1fr)`,
                }}
              >
                {Array.from({ length: worldH }, (_, gy) =>
                  Array.from({ length: worldW }, (_, gx) => {
                    const wx = gx + minX;
                    const wy = gy + minY;
                    const wMap = worldMap.get(`${wx},${wy}`);
                    const isCurrent = wMap?.id === mapData.id;

                    if (!wMap) {
                      return <div key={`${gx}-${gy}`} className="worldmap-cell worldmap-cell-empty" />;
                    }

                    return (
                      <div
                        key={`${gx}-${gy}`}
                        className={`worldmap-cell ${isCurrent ? 'worldmap-cell-current' : ''}`}
                        style={{ borderColor: TYPE_COLORS[wMap.type] || 'var(--border)' }}
                      >
                        <div className="worldmap-cell-name">{wMap.nom}</div>
                        <div className="worldmap-cell-type" style={{ color: TYPE_COLORS[wMap.type] }}>{wMap.type}</div>
                        {wMap.region && <div className="worldmap-cell-region">{wMap.region.nom}</div>}
                        <div className="worldmap-cell-size">{wMap.largeur}x{wMap.hauteur}</div>
                        {isCurrent && <div className="worldmap-cell-marker">Vous etes ici</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dungeon entry modal */}
      {dungeonModal && (
        <div className="modal-overlay" onClick={() => setDungeonModal(null)}>
          <div className="worldmap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="worldmap-header">
              <h2>{dungeonModal.connection.donjon?.nom || 'Donjon'}</h2>
              <button className="btn btn-secondary" onClick={() => setDungeonModal(null)}>Fermer</button>
            </div>
            <div style={{ padding: 20 }}>
              {dungeonModal.connection.donjon?.description && (
                <p style={{ marginBottom: 16, color: '#ccc', fontSize: 14 }}>
                  {dungeonModal.connection.donjon.description}
                </p>
              )}
              <div style={{ marginBottom: 16 }}>
                <strong>Niveau :</strong> {dungeonModal.connection.donjon?.niveauMin} - {dungeonModal.connection.donjon?.niveauMax}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Difficulte (nombre d'ennemis par salle) :
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[4, 6, 8].map(d => (
                    <button
                      key={d}
                      className={`btn ${selectedDifficulty === d ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedDifficulty(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleEnterDungeon}>
                Entrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network portal selection modal */}
      {portalModal && (
        <div className="modal-overlay" onClick={() => setPortalModal(null)}>
          <div className="worldmap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="worldmap-header">
              <h2>Portail — {portalModal.connection.nom}</h2>
              <button className="btn btn-secondary" onClick={() => setPortalModal(null)}>Fermer</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ marginBottom: 12, fontSize: 14 }}>Choisissez la destination :</p>
              {allPortals
                .filter(p => p.id !== portalModal.connection.id && !p.donjonId)
                .map(dest => (
                  <button
                    key={dest.id}
                    className="btn btn-secondary"
                    style={{ display: 'block', width: '100%', marginBottom: 8, textAlign: 'left' }}
                    onClick={() => handleUsePortal(portalModal.connection, dest.id)}
                  >
                    {dest.nom}
                    {dest.fromMap && <span className="meta" style={{ marginLeft: 8 }}>({dest.fromMap.nom})</span>}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Unified PNJ modal */}
      {pnjModal && (() => {
        const { pnj, interactData, personnageId, chars, activeTab } = pnjModal;
        const hasQuestContent = (interactData.quetesDisponibles?.length ?? 0) > 0 || (interactData.etapesEnAttente?.length ?? 0) > 0;
        const dialogueTexte = interactData.dialogueTexte ?? null;

        const currentMapId = isSoloMode ? character?.mapId : group?.leader?.mapId;
        const currentMemberIds = isSoloMode ? (character ? [character.id] : []) : ((group?.personnages ?? []).map((gp: any) => gp.personnage.id));

        return (
          <div className="modal-overlay" onClick={() => setPnjModal(null)}>
            <div className="worldmap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="worldmap-header">
                <h2>💬 {pnj.nom}</h2>
                <button className="btn btn-secondary" onClick={() => setPnjModal(null)}>Fermer</button>
              </div>

              {(interactData.estMarchand || pnj.estGardienEnclos) && (
                <div style={{ display: 'flex', gap: 4, padding: '0 20px 0', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
                  {([
                    { key: 'dialogue', label: 'Dialogue' },
                    ...(interactData.estMarchand ? [{ key: 'boutique', label: 'Boutique' }] : []),
                    ...(pnj.estGardienEnclos ? [{ key: 'enclos', label: '🐾 Enclos' }] : []),
                  ] as { key: 'dialogue' | 'boutique' | 'enclos'; label: string }[]).map(tab => (
                    <button
                      key={tab.key}
                      className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ borderRadius: '4px 4px 0 0', marginBottom: -1 }}
                      onClick={() => setPnjModal(prev => prev ? { ...prev, activeTab: tab.key } : null)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding: 20 }}>
                {activeTab === 'dialogue' && (
                  <>
                    {dialogueTexte && (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 16, borderLeft: '3px solid var(--border)', paddingLeft: 12 }}>
                        "{dialogueTexte}"
                      </p>
                    )}

                    {chars.length > 1 && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Personnage :</label>
                        <select
                          value={personnageId}
                          onChange={async e => {
                            const newCharId = Number(e.target.value);
                            const newInteract = await queteApi.interact(pnj.id, newCharId);
                            setPnjFeedback(null);
                            setPnjRecompenses(null);
                            setPnjModal(prev => prev ? { ...prev, personnageId: newCharId, interactData: newInteract } : null);
                            if (currentMapId && currentMemberIds.length > 0) refreshPnjStatus(currentMapId, currentMemberIds);
                          }}
                          style={{ minWidth: 180 }}
                        >
                          {chars.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                      </div>
                    )}

                    {pnjFeedback && (
                      <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--success-bg, #1b5e20)', borderRadius: 6, color: 'var(--success, #a5d6a7)', fontSize: 13 }}>
                        {pnjFeedback}
                      </div>
                    )}
                    {pnjRecompenses && (
                      <div style={{ padding: '8px 12px', marginBottom: 12, background: '#3e2700', borderRadius: 6, color: '#ffca28', fontSize: 13 }}>
                        <strong>Recompenses :</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {pnjRecompenses.xp > 0 && <li>{pnjRecompenses.xp} XP</li>}
                          {pnjRecompenses.or > 0 && <li>{pnjRecompenses.or} or</li>}
                          {pnjRecompenses.ressources.map((r, i) => <li key={i}>{r.quantite}x {r.nom}</li>)}
                          {pnjRecompenses.items.map((it, i) => <li key={i}>{it.nom}</li>)}
                        </ul>
                      </div>
                    )}

                    {interactData.quetesDisponibles?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: '0 0 8px' }}>Quetes disponibles</h4>
                        {interactData.quetesDisponibles.map((q: any) => (
                          <div key={q.id} style={{ marginBottom: 8, padding: 10, background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600 }}>{q.nom}</div>
                            {q.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{q.description}</div>}
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ marginTop: 6 }}
                              onClick={async () => {
                                try {
                                  await queteApi.acceptQuest(pnj.id, personnageId, q.id);
                                  const newInteract = await queteApi.interact(pnj.id, personnageId);
                                  setPnjFeedback(`Quete "${q.nom}" acceptee !`);
                                  setPnjModal(prev => prev ? { ...prev, interactData: newInteract } : null);
                                  if (currentMapId && currentMemberIds.length > 0) refreshPnjStatus(currentMapId, currentMemberIds);
                                } catch (err: unknown) {
                                  setPnjFeedback((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
                                }
                              }}
                            >
                              Accepter
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {interactData.etapesEnAttente?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: '0 0 8px' }}>Etapes en attente</h4>
                        {interactData.etapesEnAttente.map((ep: any) => (
                          <div key={ep.id} style={{ marginBottom: 8, padding: 10, background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ep.quete?.nom} — Etape {ep.etapeActuelle}</div>
                            <div style={{ fontWeight: 600, marginTop: 2 }}>{ep.etapeInfo?.description ?? ep.etapeInfo?.type}</div>
                            {(ep.etapeInfo?.type === 'APPORTER_RESSOURCE' || ep.etapeInfo?.type === 'APPORTER_EQUIPEMENT') && ep.etapeInfo?.quantite && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Requis : {ep.etapeInfo.quantite}× {ep.etapeInfo.ressource?.nom ?? ep.etapeInfo.equipement?.nom}
                              </div>
                            )}
                            <button
                              className="btn btn-sm btn-success"
                              style={{ marginTop: 6 }}
                              onClick={async () => {
                                try {
                                  const res = await queteApi.advanceQuest(pnj.id, personnageId, ep.id);
                                  setPnjFeedback(res.questComplete ? 'Quete terminee !' : 'Etape validee !');
                                  if (res.recompenses) setPnjRecompenses(res.recompenses);
                                  const newInteract = await queteApi.interact(pnj.id, personnageId);
                                  setPnjModal(prev => prev ? { ...prev, interactData: newInteract } : null);
                                  if (currentMapId && currentMemberIds.length > 0) refreshPnjStatus(currentMapId, currentMemberIds);
                                } catch (err: unknown) {
                                  setPnjFeedback((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
                                }
                              }}
                            >
                              Remettre / Valider
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {pnj.metiers && pnj.metiers.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: '0 0 8px' }}>Métiers disponibles</h4>
                        {pnj.metiers.map(pm => {
                          const alreadyLearned = personnageMetiers.some(p => p.metierId === pm.metierId);
                          return (
                            <div key={pm.id} style={{ marginBottom: 8, padding: 10, background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>⚒ {pm.metier.nom}</span>
                                {pm.metier.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pm.metier.description}</div>}
                                {alreadyLearned && <span style={{ fontSize: 11, color: 'var(--success)' }}>✓ Déjà appris</span>}
                              </div>
                              {!alreadyLearned && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={async () => {
                                    try {
                                      await metiersApi.learnMetier(pnj.id, personnageId, pm.metierId);
                                      const charId = isSoloMode ? character?.id : group?.leaderId;
                                      if (charId) setPersonnageMetiers(await metiersApi.getPersonnageMetiers(charId));
                                      setPnjFeedback(`Vous avez appris le métier "${pm.metier.nom}" !`);
                                    } catch (err: unknown) {
                                      setPnjFeedback((err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur'));
                                    }
                                  }}
                                >Apprendre</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!hasQuestContent && !interactData.estMarchand && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{dialogueTexte ? '' : 'Rien de special pour l\'instant.'}</p>
                    )}
                  </>
                )}

                {activeTab === 'boutique' && (
                  <>
                    <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ fontWeight: 600 }}>Personnage :</label>
                      <select
                        value={merchantPersonnageId ?? ''}
                        onChange={async e => {
                          const id = Number(e.target.value);
                          setMerchantPersonnageId(id);
                          setMerchantFeedback({});
                          const inv = await charactersApi.getInventory(id);
                          setMerchantInventory(inv);
                        }}
                        style={{ minWidth: 160 }}
                      >
                        {chars.map(c => (
                          <option key={c.id} value={c.id}>{c.nom} ({merchantInventory && merchantPersonnageId === c.id ? `${merchantInventory.or} or` : '...'})</option>
                        ))}
                      </select>
                      {merchantInventory && <span className="meta">{merchantInventory.or} or disponible</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                      {(['buy', 'sell'] as const).map(t => (
                        <button key={t} className={`btn btn-sm ${merchantTab === t ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setMerchantTab(t)}>
                          {t === 'buy' ? 'Acheter' : 'Vendre'}
                        </button>
                      ))}
                    </div>
                    {merchantTab === 'buy' && pnj.lignes && (
                      <div>
                        {pnj.lignes.map((ligne: any) => {
                          const nom = ligne.equipement?.nom ?? ligne.ressource?.nom ?? ligne.familierRace?.nom ?? '?';
                          const key = `buy-${ligne.id}`;
                          const fb = merchantFeedback[key];
                          return (
                            <div key={ligne.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{nom}</span>
                                {ligne.ressource && <span className="meta" style={{ marginLeft: 6 }}>Ressource</span>}
                                {ligne.equipement && <span className="meta" style={{ marginLeft: 6 }}>{ligne.equipement.slot}</span>}
                                {ligne.familierRace && <span className="meta" style={{ marginLeft: 6 }}>🐾 Familier</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {fb && <span style={{ fontSize: 12, color: fb.ok ? 'var(--success)' : 'var(--danger)' }}>{fb.msg}</span>}
                                <span style={{ color: '#ffca28', fontWeight: 600 }}>{ligne.prixMarchand} or</span>
                                <button className="btn btn-sm btn-primary" onClick={async () => {
                                  if (!merchantPersonnageId) return;
                                  try {
                                    await pnjApi.buy(pnj.id, { personnageId: merchantPersonnageId, ligneId: ligne.id, quantite: 1 });
                                    setMerchantFeedback(prev => ({ ...prev, [key]: { ok: true, msg: 'Acheté !' } }));
                                    const inv = await charactersApi.getInventory(merchantPersonnageId);
                                    setMerchantInventory(inv);
                                  } catch (err: unknown) {
                                    const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
                                    setMerchantFeedback(prev => ({ ...prev, [key]: { ok: false, msg } }));
                                  }
                                }}>Acheter</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {merchantTab === 'sell' && merchantInventory && (
                      <div>
                        {merchantInventory.items.map((item: any) => {
                          const key = `sell-item-${item.id}`;
                          const fb = merchantFeedback[key];
                          const ligne = pnj.lignes?.find((l: any) => l.equipementId === item.equipementId);
                          const prixRachat = ligne?.prixRachat ?? 0;
                          return (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{item.nom}</span>
                                <span className="meta" style={{ marginLeft: 6 }}>{item.slot}</span>
                                {item.estEquipe && <span style={{ color: 'var(--warning)', fontSize: 11, marginLeft: 4 }}>Equipe</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {fb && <span style={{ fontSize: 12, color: fb.ok ? 'var(--success)' : 'var(--danger)' }}>{fb.msg}</span>}
                                <span style={{ color: '#ffca28', fontWeight: 600 }}>{prixRachat} or</span>
                                <button className="btn btn-sm btn-warning" disabled={item.estEquipe} onClick={async () => {
                                  if (!merchantPersonnageId) return;
                                  try {
                                    await pnjApi.sell(pnj.id, { personnageId: merchantPersonnageId, itemId: item.id, ligneId: 0 });
                                    setMerchantFeedback(prev => ({ ...prev, [key]: { ok: true, msg: 'Vendu !' } }));
                                    const inv = await charactersApi.getInventory(merchantPersonnageId);
                                    setMerchantInventory(inv);
                                  } catch (err: unknown) {
                                    const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
                                    setMerchantFeedback(prev => ({ ...prev, [key]: { ok: false, msg } }));
                                  }
                                }}>Vendre</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'enclos' && (
                  <div>
                    {enclosError && (
                      <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>
                        {enclosError}
                        <button style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setEnclosError(null)}>✕</button>
                      </div>
                    )}

                    {/* Familiers en enclos */}
                    {enclosData.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>En enclos :</div>
                        {enclosData.map(a => {
                          const elapsed = Math.floor((Date.now() - new Date(a.debutAt).getTime()) / 60000);
                          const done = elapsed >= a.dureeMinutes;
                          const famNom = a.familier?.nom || a.familier?.race?.nom || `Familier #${a.familierId}`;
                          return (
                            <div key={a.id} style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{famNom}</span>
                                <span className={`badge badge-${done ? 'info' : 'muted'}`} style={{ fontSize: 10 }}>{a.enclosType}</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {Math.min(elapsed, a.dureeMinutes)}/{a.dureeMinutes} min
                                {a.enclosType === 'ENTRAINEMENT' && ` (+${Math.min(elapsed, a.dureeMinutes)} XP)`}
                                {a.enclosType === 'BONHEUR' && ` (+${Math.min(elapsed, a.dureeMinutes)} bonheur)`}
                              </div>
                              {done && a.enclosType !== 'RENCONTRE' && (
                                <button className="btn btn-sm btn-success" disabled={enclosLoading} onClick={async () => {
                                  setEnclosLoading(true);
                                  try {
                                    await familiersApi.collect(a.familierId, personnageId);
                                    const [newEnclos, newFams] = await Promise.all([
                                      familiersApi.getEnclosByMap(pnj.mapId),
                                      familiersApi.getByCharacter(personnageId),
                                    ]);
                                    setEnclosData(newEnclos);
                                    setEnclosFamiliers(newFams);
                                  } catch (e: any) {
                                    setEnclosError(e?.response?.data?.error || 'Erreur');
                                  } finally {
                                    setEnclosLoading(false);
                                  }
                                }}>Collecter</button>
                              )}
                              {done && a.enclosType === 'RENCONTRE' && a.partenaireAssignmentId != null && (
                                <button className="btn btn-sm btn-success" disabled={enclosLoading} onClick={async () => {
                                  setEnclosLoading(true);
                                  try {
                                    await familiersApi.collectBreeding(a.id, personnageId);
                                    const [newEnclos, newFams] = await Promise.all([
                                      familiersApi.getEnclosByMap(pnj.mapId),
                                      familiersApi.getByCharacter(personnageId),
                                    ]);
                                    setEnclosData(newEnclos);
                                    setEnclosFamiliers(newFams);
                                  } catch (e: any) {
                                    setEnclosError(e?.response?.data?.error || 'Erreur');
                                  } finally {
                                    setEnclosLoading(false);
                                  }
                                }}>Collecter enfants</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Formulaire dépôt */}
                    {enclosFamiliers.filter(f => !f.enclosAssignment && !f.estEquipe).length > 0 ? (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Déposer un familier :</div>
                        <select value={enclosDeposit.famId} onChange={e => setEnclosDeposit(d => ({ ...d, famId: e.target.value ? Number(e.target.value) : '' }))} style={{ width: '100%', marginBottom: 6, fontSize: 12 }}>
                          <option value="">-- Choisir --</option>
                          {enclosFamiliers.filter(f => !f.enclosAssignment && !f.estEquipe).map(f => (
                            <option key={f.id} value={f.id}>{f.nom || f.race?.nom || `#${f.id}`}</option>
                          ))}
                        </select>
                        <select value={enclosDeposit.type} onChange={e => setEnclosDeposit(d => ({ ...d, type: e.target.value as EnclosType, partenaireId: '' }))} style={{ width: '100%', marginBottom: 6, fontSize: 12 }}>
                          <option value="ENTRAINEMENT">Entraînement (+XP)</option>
                          <option value="BONHEUR">Bonheur (+❤)</option>
                          <option value="RENCONTRE">Rencontre (accouplement)</option>
                        </select>
                        {enclosDeposit.type === 'RENCONTRE' && (
                          <select value={enclosDeposit.partenaireId} onChange={e => setEnclosDeposit(d => ({ ...d, partenaireId: e.target.value ? Number(e.target.value) : '' }))} style={{ width: '100%', marginBottom: 6, fontSize: 12 }}>
                            <option value="">-- 2e familier --</option>
                            {enclosFamiliers.filter(f => !f.enclosAssignment && !f.estEquipe && f.id !== Number(enclosDeposit.famId)).map(f => (
                              <option key={f.id} value={f.id}>{f.nom || f.race?.nom || `#${f.id}`}</option>
                            ))}
                          </select>
                        )}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                          <input type="number" min={1} value={enclosDeposit.duree} onChange={e => setEnclosDeposit(d => ({ ...d, duree: Number(e.target.value) }))} style={{ width: 70, fontSize: 12 }} />
                          <span style={{ color: 'var(--text-muted)' }}>minutes</span>
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          style={{ width: '100%' }}
                          disabled={enclosLoading || !enclosDeposit.famId || (enclosDeposit.type === 'RENCONTRE' && !enclosDeposit.partenaireId)}
                          onClick={async () => {
                            if (!enclosDeposit.famId) return;
                            setEnclosLoading(true);
                            setEnclosError(null);
                            try {
                              if (enclosDeposit.type === 'RENCONTRE' && enclosDeposit.partenaireId) {
                                await familiersApi.startBreeding({ familierAId: Number(enclosDeposit.famId), familierBId: Number(enclosDeposit.partenaireId), mapId: pnj.mapId, dureeMinutes: enclosDeposit.duree, personnageId });
                              } else {
                                await familiersApi.deposit(Number(enclosDeposit.famId), { enclosType: enclosDeposit.type, mapId: pnj.mapId, dureeMinutes: enclosDeposit.duree, personnageId });
                              }
                              setEnclosDeposit({ famId: '', type: 'ENTRAINEMENT', duree: 60, partenaireId: '' });
                              const [newEnclos, newFams] = await Promise.all([
                                familiersApi.getEnclosByMap(pnj.mapId),
                                familiersApi.getByCharacter(personnageId),
                              ]);
                              setEnclosData(newEnclos);
                              setEnclosFamiliers(newFams);
                            } catch (e: any) {
                              setEnclosError(e?.response?.data?.error || 'Erreur');
                            } finally {
                              setEnclosLoading(false);
                            }
                          }}
                        >Déposer</button>
                      </div>
                    ) : enclosData.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun familier disponible.</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MapPage;
