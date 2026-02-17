import api from './client';
import type { Group, Direction } from '../types';

export const groupsApi = {
  getAll: () => api.get<Group[]>('/groups').then(r => r.data),
  getById: (id: number) => api.get<Group>(`/groups/${id}`).then(r => r.data),
  create: (data: { nom: string; joueurId: number }) =>
    api.post<Group>('/groups', data).then(r => r.data),
  remove: (id: number) => api.delete(`/groups/${id}`),
  addCharacter: (groupeId: number, characterId: number) =>
    api.post(`/groups/${groupeId}/characters`, { characterId }).then(r => r.data),
  removeCharacter: (groupeId: number, charId: number) =>
    api.delete(`/groups/${groupeId}/characters/${charId}`),
  move: (id: number, x: number, y: number) =>
    api.patch(`/groups/${id}/move`, { x, y }).then(r => r.data),
  enterMap: (id: number, mapId: number) =>
    api.post(`/groups/${id}/enter-map`, { mapId }).then(r => r.data),
  useConnection: (id: number, connectionId: number, difficulte?: number) =>
    api.post(`/groups/${id}/use-connection`, { connectionId, ...(difficulte ? { difficulte } : {}) }).then(r => r.data),
  moveDirection: (id: number, direction: Direction) =>
    api.post(`/groups/${id}/move-direction`, { direction }).then(r => r.data),
  leaveMap: (id: number) =>
    api.post(`/groups/${id}/leave-map`).then(r => r.data),
};
