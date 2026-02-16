import api from './client';
import type { Character, InventoryState, SlotType } from '../types';

export const charactersApi = {
  getAll: () => api.get<Character[]>('/characters').then(r => r.data),
  getById: (id: number) => api.get<Character>(`/characters/${id}`).then(r => r.data),
  create: (data: { nom: string; joueurId: number; raceId: number }) =>
    api.post<Character>('/characters', data).then(r => r.data),
  update: (id: number, data: Partial<Character>) =>
    api.patch<Character>(`/characters/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/characters/${id}`),
  equip: (id: number, slot: string, equipmentId: number | null) =>
    api.put<Character>(`/characters/${id}/equipment`, { slot, equipmentId }).then(r => r.data),
  getSpells: (id: number) => api.get(`/characters/${id}/spells`).then(r => r.data),
  allocateStats: (id: number, stats: Record<string, number>) =>
    api.post(`/characters/${id}/allocate-stats`, stats).then(r => r.data),
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

  // Craft
  craft: (id: number, recetteId: number) =>
    api.post(`/characters/${id}/craft/${recetteId}`).then(r => r.data),
};
