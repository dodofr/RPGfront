import api from './client';
import type { Character, InventoryState, SlotType, Recette, Direction } from '../types';

export const charactersApi = {
  getAll: () => api.get<Character[]>('/characters').then(r => r.data),
  getById: (id: number) => api.get<Character>(`/characters/${id}`).then(r => r.data),
  create: (data: { nom: string; joueurId: number; raceId: number; sexe?: string }) =>
    api.post<Character>('/characters', data).then(r => r.data),
  update: (id: number, data: Partial<Character>) =>
    api.patch<Character>(`/characters/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/characters/${id}`),
  getSpells: (id: number) => api.get(`/characters/${id}/spells`).then(r => r.data),
  allocateStats: (id: number, stats: Record<string, number>) =>
    api.post(`/characters/${id}/allocate-stats`, stats).then(r => r.data),
  resetStats: (id: number) =>
    api.post(`/characters/${id}/reset-stats`, {}).then(r => r.data),
  getProgression: (id: number) => api.get(`/characters/${id}/progression`).then(r => r.data),

  // Inventory
  getInventory: (id: number) =>
    api.get<InventoryState>(`/characters/${id}/inventory`).then(r => r.data),
  destroyItem: (id: number, itemId: number) =>
    api.delete(`/characters/${id}/inventory/items/${itemId}`),
  destroyResource: (id: number, ressourceId: number, quantite?: number) =>
    api.delete(`/characters/${id}/inventory/resources/${ressourceId}`, { params: quantite ? { quantite } : undefined }),
  equipItem: (id: number, itemId: number) =>
    api.post(`/characters/${id}/inventory/equip/${itemId}`).then(r => r.data),
  unequipItem: (id: number, slot: SlotType) =>
    api.post(`/characters/${id}/inventory/unequip`, { slot }).then(r => r.data),
  sendToCharacter: (id: number, body: { destinataireId: number; or?: number; ressources?: { ressourceId: number; quantite: number }[]; items?: number[] }) =>
    api.post(`/characters/${id}/inventory/send`, body).then(r => r.data),

  syncSpells: (id: number) =>
    api.post<{ message: string; sorts: { sortId: number; nom: string }[] }>(`/characters/${id}/sync-spells`).then(r => r.data),

  // Craft
  craft: (id: number, recetteId: number) =>
    api.post(`/characters/${id}/craft/${recetteId}`).then(r => r.data),

  // Navigation solo
  navEnterMap: (id: number, mapId: number, startX?: number, startY?: number) =>
    api.post(`/characters/${id}/enter-map`, { mapId, ...(startX !== undefined ? { startX } : {}), ...(startY !== undefined ? { startY } : {}) }).then(r => r.data),
  navMove: (id: number, x: number, y: number) =>
    api.patch(`/characters/${id}/move`, { x, y }).then(r => r.data),
  navMoveDirection: (id: number, direction: Direction) =>
    api.post(`/characters/${id}/move-direction`, { direction }).then(r => r.data),
  navUseConnection: (id: number, connectionId: number, destinationConnectionId?: number, difficulte?: number) =>
    api.post(`/characters/${id}/use-connection`, { connectionId, ...(destinationConnectionId ? { destinationConnectionId } : {}), ...(difficulte ? { difficulte } : {}) }).then(r => r.data),
};

export const recipesApi = {
  getAll: () => api.get<Recette[]>('/recipes').then(r => r.data),
};
