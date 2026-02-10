import api from './client';
import type { Donjon, GrilleCombat } from '../types';

export const donjonsApi = {
  getAll: () => api.get<Donjon[]>('/donjons').then(r => r.data),
  getById: (id: number) => api.get<Donjon>(`/donjons/${id}`).then(r => r.data),
  create: (data: Partial<Donjon> & { salles: { ordre: number; mapId: number }[] }) =>
    api.post<Donjon>('/donjons', data).then(r => r.data),
  update: (id: number, data: Partial<Donjon>) =>
    api.patch<Donjon>(`/donjons/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/donjons/${id}`),
  enter: (donjonId: number, data: { groupeId: number; difficulte: number }) =>
    api.post(`/donjons/${donjonId}/enter`, data).then(r => r.data),
  getRunState: (groupeId: number) =>
    api.get(`/donjons/run/${groupeId}`).then(r => r.data),
  abandonRun: (groupeId: number) =>
    api.post(`/donjons/run/${groupeId}/abandon`).then(r => r.data),
};

export const grillesApi = {
  getAll: () => api.get<GrilleCombat[]>('/grilles').then(r => r.data),
  getById: (id: number) => api.get<GrilleCombat>(`/grilles/${id}`).then(r => r.data),
  create: (data: { nom: string; mapId: number; largeur: number; hauteur: number }) =>
    api.post<GrilleCombat>('/grilles', data).then(r => r.data),
  update: (id: number, data: Partial<GrilleCombat>) =>
    api.put<GrilleCombat>(`/grilles/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/grilles/${id}`),
  setCases: (id: number, cases: { x: number; y: number; bloqueDeplacement: boolean; bloqueLigneDeVue: boolean }[]) =>
    api.put(`/grilles/${id}/cases`, { cases }).then(r => r.data),
  setSpawns: (id: number, spawns: { x: number; y: number; equipe: number; ordre: number }[]) =>
    api.put(`/grilles/${id}/spawns`, { spawns }).then(r => r.data),
};
