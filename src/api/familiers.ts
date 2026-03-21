import api from './client';
import type { Familier, FamilierFamille, FamilierRace, FamilierCroisement, FamilierEnclosAssignment, EnclosType } from '../types';

export const familiersApi = {
  // Admin — Familles
  getAllFamilles: () => api.get<FamilierFamille[]>('/familier-familles').then(r => r.data),
  createFamille: (nom: string) => api.post<FamilierFamille>('/familier-familles', { nom }).then(r => r.data),
  updateFamille: (id: number, nom: string) => api.patch<FamilierFamille>(`/familier-familles/${id}`, { nom }).then(r => r.data),
  deleteFamille: (id: number) => api.delete(`/familier-familles/${id}`),

  // Admin — Races
  getAllRaces: () => api.get<FamilierRace[]>('/familier-races').then(r => r.data),
  getRaceById: (id: number) => api.get<FamilierRace>(`/familier-races/${id}`).then(r => r.data),
  createRace: (data: Partial<FamilierRace>) => api.post<FamilierRace>('/familier-races', data).then(r => r.data),
  updateRace: (id: number, data: Partial<FamilierRace>) => api.patch<FamilierRace>(`/familier-races/${id}`, data).then(r => r.data),
  deleteRace: (id: number) => api.delete(`/familier-races/${id}`),

  // Admin — Croisements sur une race
  addCroisement: (raceId: number, data: { raceBId: number; raceEnfantId: number; probabilite: number }) =>
    api.post<FamilierCroisement>(`/familier-races/${raceId}/croisements`, data).then(r => r.data),
  deleteCroisement: (raceId: number, croisementId: number) =>
    api.delete(`/familier-races/${raceId}/croisements/${croisementId}`),

  // Admin — Croisements global
  getAllCroisements: (raceAId?: number, raceBId?: number) => {
    const params = new URLSearchParams();
    if (raceAId) params.set('raceAId', String(raceAId));
    if (raceBId) params.set('raceBId', String(raceBId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.get<FamilierCroisement[]>(`/familier-croisements${qs}`).then(r => r.data);
  },
  createCroisement: (data: { raceAId: number; raceBId: number; raceEnfantId: number; probabilite: number }) =>
    api.post<FamilierCroisement>('/familier-croisements', data).then(r => r.data),
  updateCroisement: (id: number, probabilite: number) =>
    api.patch<FamilierCroisement>(`/familier-croisements/${id}`, { probabilite }).then(r => r.data),
  removeCroisement: (id: number) => api.delete(`/familier-croisements/${id}`),

  // Player — Familiers du personnage
  getByCharacter: (charId: number) => api.get<Familier[]>(`/characters/${charId}/familiers`).then(r => r.data),
  equip: (charId: number, famId: number) => api.post<void>(`/characters/${charId}/familiers/${famId}/equip`).then(r => r.data),
  unequip: (charId: number) => api.post<void>(`/characters/${charId}/familiers/unequip`).then(r => r.data),
  rename: (famId: number, personnageId: number, nom: string) =>
    api.patch<Familier>(`/familiers/${famId}`, { personnageId, nom }).then(r => r.data),

  // Enclos
  deposit: (famId: number, body: { enclosType: EnclosType; mapId: number; dureeMinutes: number; personnageId: number }) =>
    api.post(`/familiers/${famId}/deposit`, body).then(r => r.data),
  collect: (famId: number, personnageId: number) =>
    api.post(`/familiers/${famId}/collect`, { personnageId }).then(r => r.data),
  getEnclosByMap: (mapId: number) =>
    api.get<FamilierEnclosAssignment[]>(`/maps/${mapId}/enclos`).then(r => r.data),

  // Breeding
  startBreeding: (data: { familierAId: number; familierBId: number; mapId: number; dureeMinutes: number; personnageId: number }) =>
    api.post('/familiers/breed', data).then(r => r.data),
  collectBreeding: (assignmentId: number, personnageId: number) =>
    api.post('/familiers/breed/collect', { assignmentId, personnageId }).then(r => r.data),
};
