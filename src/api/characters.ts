import api from './client';
import type { Character } from '../types';

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
};
