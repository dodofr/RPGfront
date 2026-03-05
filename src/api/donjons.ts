import api from './client';
import type { Donjon, DonjonSalleComposition } from '../types';

export const donjonsApi = {
  getAll: () => api.get<Donjon[]>('/donjons').then(r => r.data),
  getById: (id: number) => api.get<Donjon>(`/donjons/${id}`).then(r => r.data),
  create: (data: Partial<Donjon>) =>
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
  setPortail: (id: number, data: { fromMapId: number; positionX: number; positionY: number; nom?: string }) =>
    api.put(`/donjons/${id}/portail`, data).then(r => r.data),
  deletePortail: (id: number) =>
    api.delete(`/donjons/${id}/portail`),
};

export const compositionsApi = {
  getAll: (donjonId: number, salleId: number) =>
    api.get<DonjonSalleComposition[]>(`/donjons/${donjonId}/salles/${salleId}/compositions`).then(r => r.data),
  create: (donjonId: number, salleId: number, data: { difficulte: number; monstreTemplateId: number; niveau: number; quantite: number }) =>
    api.post<DonjonSalleComposition>(`/donjons/${donjonId}/salles/${salleId}/compositions`, data).then(r => r.data),
  update: (donjonId: number, salleId: number, compId: number, data: Partial<DonjonSalleComposition>) =>
    api.patch<DonjonSalleComposition>(`/donjons/${donjonId}/salles/${salleId}/compositions/${compId}`, data).then(r => r.data),
  remove: (donjonId: number, salleId: number, compId: number) =>
    api.delete(`/donjons/${donjonId}/salles/${salleId}/compositions/${compId}`),
};

