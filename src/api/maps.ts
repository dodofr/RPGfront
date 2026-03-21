import api from './client';
import type { Region, GameMap, MonsterTemplate, MonstreDrop, MapCase, MapSpawn, MapConnection, MapRessource } from '../types';

export const regionsApi = {
  getAll: () => api.get<Region[]>('/regions').then(r => r.data),
  getById: (id: number) => api.get<Region>(`/regions/${id}`).then(r => r.data),
  create: (data: Partial<Region>) => api.post<Region>('/regions', data).then(r => r.data),
  update: (id: number, data: Partial<Region>) => api.patch<Region>(`/regions/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/regions/${id}`),
  addMonstre: (regionId: number, data: { monstreId: number; probabilite?: number }) =>
    api.post(`/regions/${regionId}/monstres`, data).then(r => r.data),
  removeMonstre: (regionId: number, monstreId: number) =>
    api.delete(`/regions/${regionId}/monstres/${monstreId}`),
};

export const mapsApi = {
  getAll: () => api.get<GameMap[]>('/maps').then(r => r.data),
  getById: (id: number) => api.get<GameMap>(`/maps/${id}`).then(r => r.data),
  create: (data: Partial<GameMap>) => api.post<GameMap>('/maps', data).then(r => r.data),
  update: (id: number, data: Partial<GameMap>) => api.patch<GameMap>(`/maps/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/maps/${id}`),
  getAllPortals: () => api.get<MapConnection[]>('/maps/portals').then(r => r.data),
  addConnection: (mapId: number, data: { toMapId?: number | null; positionX: number; positionY: number; nom: string }) =>
    api.post(`/maps/${mapId}/connections`, data).then(r => r.data),
  removeConnection: (mapId: number, connId: number) =>
    api.delete(`/maps/${mapId}/connections/${connId}`),
  spawnEnemies: (mapId: number) => api.post(`/maps/${mapId}/spawn-enemies`).then(r => r.data),
  engage: (mapId: number, data: { groupeEnnemiId: number; groupeId?: number; personnageId?: number }) =>
    api.post(`/maps/${mapId}/engage`, data).then(r => r.data),
  respawn: (mapId: number) => api.post(`/maps/${mapId}/respawn`).then(r => r.data),
  getGrid: (mapId: number) => api.get<{ cases: MapCase[]; spawns: MapSpawn[] }>(`/maps/${mapId}/grid`).then(r => r.data),
  setCases: (mapId: number, cases: { x: number; y: number; bloqueDeplacement: boolean; bloqueLigneDeVue: boolean; estExclue: boolean; estPremierPlan: boolean }[]) =>
    api.put(`/maps/${mapId}/grid/cases`, { cases }).then(r => r.data),
  setSpawns: (mapId: number, spawns: { x: number; y: number; equipe: number; ordre: number }[]) =>
    api.put(`/maps/${mapId}/grid/spawns`, { spawns }).then(r => r.data),
  updateWorldPositions: (positions: { mapId: number; worldX: number; worldY: number }[]) =>
    api.put<GameMap[]>('/maps/world-positions', { positions }).then(r => r.data),
  getRessources: (mapId: number) =>
    api.get<MapRessource[]>(`/maps/${mapId}/ressources`).then(r => r.data),
  addRessource: (mapId: number, data: { noeudId: number; caseX: number; caseY: number; respawnMinutes?: number }) =>
    api.post<MapRessource>(`/maps/${mapId}/ressources`, data).then(r => r.data),
  removeRessource: (mapId: number, ressourceId: number) =>
    api.delete(`/maps/${mapId}/ressources/${ressourceId}`),
};

export const uploadApi = {
  mapImage: (file: File): Promise<{ url: string; filename: string }> => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ url: string; filename: string }>('/upload/map-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  entityImage: (file: File, type: 'characters' | 'pnj' | 'monsters' | 'portals' | 'races'): Promise<{ url: string; filename: string }> => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ url: string; filename: string }>(`/upload/entity-image?type=${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const monstresApi = {
  getAll: () => api.get<MonsterTemplate[]>('/monstres').then(r => r.data),
  getById: (id: number) => api.get<MonsterTemplate>(`/monstres/${id}`).then(r => r.data),
  create: (data: Partial<MonsterTemplate>) => api.post<MonsterTemplate>('/monstres', data).then(r => r.data),
  update: (id: number, data: Partial<MonsterTemplate>) => api.patch<MonsterTemplate>(`/monstres/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/monstres/${id}`),
  addSort: (monstreId: number, data: { sortId: number; priorite?: number }) =>
    api.post(`/monstres/${monstreId}/sorts`, data).then(r => r.data),
  removeSort: (monstreId: number, sortId: number) =>
    api.delete(`/monstres/${monstreId}/sorts/${sortId}`),
  addDrop: (monstreId: number, data: Partial<MonstreDrop>) =>
    api.post<MonstreDrop>(`/monstres/${monstreId}/drops`, data).then(r => r.data),
  updateDrop: (monstreId: number, dropId: number, data: Partial<MonstreDrop>) =>
    api.patch<MonstreDrop>(`/monstres/${monstreId}/drops/${dropId}`, data).then(r => r.data),
  removeDrop: (monstreId: number, dropId: number) =>
    api.delete(`/monstres/${monstreId}/drops/${dropId}`),
};
