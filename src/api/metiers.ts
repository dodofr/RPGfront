import api from './client';
import type { Metier, PersonnageMetier, NoeudRecolte, NoeudRessource, MapRessource, HarvestResult } from '../types';

export const metiersApi = {
  getAll: () => api.get<Metier[]>('/metiers').then(r => r.data),
  getById: (id: number) => api.get<Metier>(`/metiers/${id}`).then(r => r.data),
  create: (data: { nom: string; description?: string; type?: 'RECOLTE' | 'CRAFT' }) => api.post<Metier>('/metiers', data).then(r => r.data),
  update: (id: number, data: { nom?: string; description?: string; type?: 'RECOLTE' | 'CRAFT' }) => api.patch<Metier>(`/metiers/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/metiers/${id}`),

  // Noeuds
  createNoeud: (metierId: number, data: { nom: string; imageUrl?: string; niveauMinAcces?: number; xpRecolte?: number }) =>
    api.post<NoeudRecolte>(`/metiers/${metierId}/noeuds`, data).then(r => r.data),
  updateNoeud: (noeudId: number, data: { nom?: string; imageUrl?: string | null; niveauMinAcces?: number; xpRecolte?: number }) =>
    api.patch<NoeudRecolte>(`/metiers/noeuds/${noeudId}`, data).then(r => r.data),
  removeNoeud: (noeudId: number) => api.delete(`/metiers/noeuds/${noeudId}`),

  // Loot table
  addNoeudRessource: (noeudId: number, data: { niveauRequis: number; ressourceId: number; quantiteMin: number; quantiteMax: number; tauxDrop?: number }) =>
    api.post<NoeudRessource>(`/metiers/noeuds/${noeudId}/ressources`, data).then(r => r.data),
  updateNoeudRessource: (id: number, data: { niveauRequis?: number; quantiteMin?: number; quantiteMax?: number; tauxDrop?: number }) =>
    api.patch<NoeudRessource>(`/metiers/noeuds/ressources/${id}`, data).then(r => r.data),
  removeNoeudRessource: (id: number) => api.delete(`/metiers/noeuds/ressources/${id}`),

  // PNJ metiers (admin)
  addPnjMetier: (pnjId: number, metierId: number) =>
    api.post(`/pnj/${pnjId}/metiers`, { metierId }).then(r => r.data),
  removePnjMetier: (pnjId: number, metierId: number) =>
    api.delete(`/pnj/${pnjId}/metiers/${metierId}`),

  // Gameplay
  learnMetier: (pnjId: number, personnageId: number, metierId: number) =>
    api.post<PersonnageMetier>(`/pnj/${pnjId}/learn-metier`, { personnageId, metierId }).then(r => r.data),
  getPersonnageMetiers: (personnageId: number) =>
    api.get<PersonnageMetier[]>(`/characters/${personnageId}/metiers`).then(r => r.data),
  harvest: (personnageId: number, mapRessourceId: number) =>
    api.post<HarvestResult>(`/characters/${personnageId}/harvest/${mapRessourceId}`).then(r => r.data),

  // Map resources (also in mapsApi but mirrored here for convenience)
  getMapRessources: (mapId: number) =>
    api.get<MapRessource[]>(`/maps/${mapId}/ressources`).then(r => r.data),
};
