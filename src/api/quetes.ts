import api from './client';
import type { Quete, QueteEtape, QueteRecompense, QuetePersonnage, InteractResponse, AdvanceQuestResponse, QueteEtapeType } from '../types';

export const queteApi = {
  // Admin CRUD
  getAll: () => api.get<Quete[]>('/quetes').then(r => r.data),
  getById: (id: number) => api.get<Quete>(`/quetes/${id}`).then(r => r.data),
  create: (data: { nom: string; description?: string; niveauRequis?: number; pnjDepartId?: number }) =>
    api.post<Quete>('/quetes', data).then(r => r.data),
  update: (id: number, data: { nom?: string; description?: string | null; niveauRequis?: number; pnjDepartId?: number | null }) =>
    api.patch<Quete>(`/quetes/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/quetes/${id}`),

  // Etapes
  addEtape: (queteId: number, data: { ordre: number; description: string; type: QueteEtapeType; pnjId?: number; monstreTemplateId?: number; quantite?: number; ressourceId?: number; equipementId?: number }) =>
    api.post<QueteEtape>(`/quetes/${queteId}/etapes`, data).then(r => r.data),
  updateEtape: (queteId: number, etapeId: number, data: Partial<{ ordre: number; description: string; type: QueteEtapeType; pnjId: number | null; monstreTemplateId: number | null; quantite: number | null; ressourceId: number | null; equipementId: number | null }>) =>
    api.patch<QueteEtape>(`/quetes/${queteId}/etapes/${etapeId}`, data).then(r => r.data),
  deleteEtape: (queteId: number, etapeId: number) => api.delete(`/quetes/${queteId}/etapes/${etapeId}`),

  // Récompenses
  addRecompense: (queteId: number, data: { xp?: number; or?: number; ressourceId?: number; quantiteRessource?: number; equipementId?: number }) =>
    api.post<QueteRecompense>(`/quetes/${queteId}/recompenses`, data).then(r => r.data),
  deleteRecompense: (queteId: number, recompenseId: number) => api.delete(`/quetes/${queteId}/recompenses/${recompenseId}`),

  // Prérequis
  addPrerequisite: (queteId: number, prerequisQueteId: number) =>
    api.post(`/quetes/${queteId}/prerequis`, { prerequisQueteId }),
  removePrerequisite: (queteId: number, prerequisId: number) =>
    api.delete(`/quetes/${queteId}/prerequis/${prerequisId}`),

  // Gameplay (via PNJ endpoints)
  interact: (pnjId: number, personnageId: number) =>
    api.post<InteractResponse>(`/pnj/${pnjId}/interact`, { personnageId }).then(r => r.data),
  acceptQuest: (pnjId: number, personnageId: number, queteId: number) =>
    api.post<{ quetePersonnage: QuetePersonnage }>(`/pnj/${pnjId}/accept-quest`, { personnageId, queteId }).then(r => r.data),
  advanceQuest: (pnjId: number, personnageId: number, quetePersonnageId: number) =>
    api.post<AdvanceQuestResponse>(`/pnj/${pnjId}/advance-quest`, { personnageId, quetePersonnageId }).then(r => r.data),

  // Character quests
  getActiveQuests: (personnageId: number) =>
    api.get<QuetePersonnage[]>(`/characters/${personnageId}/quetes`).then(r => r.data),
};
