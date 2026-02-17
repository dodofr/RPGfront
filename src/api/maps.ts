import api from './client';
import type { Region, GameMap, MonsterTemplate, MonstreDrop } from '../types';

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
  addConnection: (mapId: number, data: { toMapId: number; positionX: number; positionY: number; nom: string }) =>
    api.post(`/maps/${mapId}/connections`, data).then(r => r.data),
  removeConnection: (mapId: number, connId: number) =>
    api.delete(`/maps/${mapId}/connections/${connId}`),
  spawnEnemies: (mapId: number) => api.post(`/maps/${mapId}/spawn-enemies`).then(r => r.data),
  engage: (mapId: number, data: { groupeId: number; groupeEnnemiId: number }) =>
    api.post(`/maps/${mapId}/engage`, data).then(r => r.data),
  respawn: (mapId: number) => api.post(`/maps/${mapId}/respawn`).then(r => r.data),
  getGrilles: (mapId: number) => api.get<import('../types').GrilleCombat[]>(`/maps/${mapId}/grilles`).then(r => r.data),
  updateWorldPositions: (positions: { mapId: number; worldX: number; worldY: number }[]) =>
    api.put<GameMap[]>('/maps/world-positions', { positions }).then(r => r.data),
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
