import api from './client';
import type { PNJ, MarchandLigne } from '../types';

export const pnjApi = {
  getAll: () => api.get<PNJ[]>('/pnj').then(r => r.data),
  getById: (id: number) => api.get<PNJ>(`/pnj/${id}`).then(r => r.data),
  create: (data: Partial<PNJ>) => api.post<PNJ>('/pnj', data).then(r => r.data),
  update: (id: number, data: Partial<PNJ>) => api.patch<PNJ>(`/pnj/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/pnj/${id}`),
  addLigne: (id: number, data: Partial<MarchandLigne>) => api.post<MarchandLigne>(`/pnj/${id}/lignes`, data).then(r => r.data),
  updateLigne: (id: number, ligneId: number, data: Partial<MarchandLigne>) =>
    api.patch<MarchandLigne>(`/pnj/${id}/lignes/${ligneId}`, data).then(r => r.data),
  deleteLigne: (id: number, ligneId: number) => api.delete(`/pnj/${id}/lignes/${ligneId}`),
  buy: (id: number, data: { personnageId: number; ligneId: number; quantite?: number }) =>
    api.post(`/pnj/${id}/buy`, data).then(r => r.data),
  sell: (id: number, data: { personnageId: number; ligneId: number; quantite?: number; itemId?: number }) =>
    api.post(`/pnj/${id}/sell`, data).then(r => r.data),
  getByMap: (mapId: number) => api.get<PNJ[]>(`/maps/${mapId}/pnj`).then(r => r.data),
};
