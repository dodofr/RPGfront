import api from './client';
import type { Race, Sort, Equipment, Effet, Zone, SortEffet, LigneDegatsArme, Ressource, Panoplie, PanoplieBonus, Recette, RecetteIngredient, CompetencePassive } from '../types';

export const racesApi = {
  getAll: () => api.get<Race[]>('/races').then(r => r.data),
  getById: (id: number) => api.get<Race>(`/races/${id}`).then(r => r.data),
  create: (data: Partial<Race>) => api.post<Race>('/races', data).then(r => r.data),
  update: (id: number, data: Partial<Race>) => api.patch<Race>(`/races/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/races/${id}`),
};

export const sortsApi = {
  getAll: () => api.get<Sort[]>('/spells').then(r => r.data),
  getById: (id: number) => api.get<Sort>(`/spells/${id}`).then(r => r.data),
  create: (data: Partial<Sort>) => api.post<Sort>('/spells', data).then(r => r.data),
  update: (id: number, data: Partial<Sort>) => api.patch<Sort>(`/spells/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/spells/${id}`),
  addEffect: (sortId: number, data: { effetId: number; chanceDeclenchement?: number; surCible?: boolean }) =>
    api.post<SortEffet>(`/spells/${sortId}/effects`, data).then(r => r.data),
  removeEffect: (sortId: number, effetId: number) =>
    api.delete(`/spells/${sortId}/effects/${effetId}`),
};

export const equipmentApi = {
  getAll: () => api.get<Equipment[]>('/equipment').then(r => r.data),
  getById: (id: number) => api.get<Equipment>(`/equipment/${id}`).then(r => r.data),
  create: (data: Partial<Equipment>) => api.post<Equipment>('/equipment', data).then(r => r.data),
  update: (id: number, data: Partial<Equipment>) => api.patch<Equipment>(`/equipment/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/equipment/${id}`),
  addLigne: (equipementId: number, data: Partial<LigneDegatsArme>) =>
    api.post<LigneDegatsArme>(`/equipment/${equipementId}/lignes`, data).then(r => r.data),
  updateLigne: (equipementId: number, ligneId: number, data: Partial<LigneDegatsArme>) =>
    api.patch<LigneDegatsArme>(`/equipment/${equipementId}/lignes/${ligneId}`, data).then(r => r.data),
  removeLigne: (equipementId: number, ligneId: number) =>
    api.delete(`/equipment/${equipementId}/lignes/${ligneId}`),
};

export const effetsApi = {
  getAll: () => api.get<Effet[]>('/effects').then(r => r.data),
  getById: (id: number) => api.get<Effet>(`/effects/${id}`).then(r => r.data),
  create: (data: Partial<Effet>) => api.post<Effet>('/effects', data).then(r => r.data),
  update: (id: number, data: Partial<Effet>) => api.patch<Effet>(`/effects/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/effects/${id}`),
};

export const zonesApi = {
  getAll: () => api.get<Zone[]>('/zones').then(r => r.data),
  getById: (id: number) => api.get<Zone>(`/zones/${id}`).then(r => r.data),
  create: (data: Partial<Zone>) => api.post<Zone>('/zones', data).then(r => r.data),
  update: (id: number, data: Partial<Zone>) => api.patch<Zone>(`/zones/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/zones/${id}`),
};

export const resourcesApi = {
  getAll: () => api.get<Ressource[]>('/resources').then(r => r.data),
  getById: (id: number) => api.get<Ressource>(`/resources/${id}`).then(r => r.data),
  create: (data: Partial<Ressource>) => api.post<Ressource>('/resources', data).then(r => r.data),
  update: (id: number, data: Partial<Ressource>) => api.patch<Ressource>(`/resources/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/resources/${id}`),
};

export const setsApi = {
  getAll: () => api.get<Panoplie[]>('/sets').then(r => r.data),
  getById: (id: number) => api.get<Panoplie>(`/sets/${id}`).then(r => r.data),
  create: (data: Partial<Panoplie>) => api.post<Panoplie>('/sets', data).then(r => r.data),
  update: (id: number, data: Partial<Panoplie>) => api.patch<Panoplie>(`/sets/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/sets/${id}`),
  addBonus: (setId: number, data: Partial<PanoplieBonus>) =>
    api.post<PanoplieBonus>(`/sets/${setId}/bonuses`, data).then(r => r.data),
  updateBonus: (setId: number, bonusId: number, data: Partial<PanoplieBonus>) =>
    api.patch<PanoplieBonus>(`/sets/${setId}/bonuses/${bonusId}`, data).then(r => r.data),
  removeBonus: (setId: number, bonusId: number) =>
    api.delete(`/sets/${setId}/bonuses/${bonusId}`),
};

export const passivesApi = {
  getAll: () => api.get<CompetencePassive[]>('/passives').then(r => r.data),
  getById: (id: number) => api.get<CompetencePassive>(`/passives/${id}`).then(r => r.data),
  create: (data: Partial<CompetencePassive>) => api.post<CompetencePassive>('/passives', data).then(r => r.data),
  update: (id: number, data: Partial<CompetencePassive>) => api.patch<CompetencePassive>(`/passives/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/passives/${id}`),
};

export const recipesAdminApi = {
  getAll: () => api.get<Recette[]>('/admin/recipes').then(r => r.data),
  getById: (id: number) => api.get<Recette>(`/admin/recipes/${id}`).then(r => r.data),
  create: (data: Partial<Recette>) => api.post<Recette>('/admin/recipes', data).then(r => r.data),
  update: (id: number, data: Partial<Recette>) => api.patch<Recette>(`/admin/recipes/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/admin/recipes/${id}`),
  addIngredient: (recetteId: number, data: { ressourceId: number; quantite: number }) =>
    api.post<RecetteIngredient>(`/admin/recipes/${recetteId}/ingredients`, data).then(r => r.data),
  removeIngredient: (recetteId: number, ingredientId: number) =>
    api.delete(`/admin/recipes/${recetteId}/ingredients/${ingredientId}`),
};
