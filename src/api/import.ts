import api from './client';

export interface ImportCounters {
  ressources: number;
  effets: number;
  zones: number;
  races: number;
  sorts: number;
  sortEffets: number;
  monstres: number;
  monstreSorts: number;
  monstreDrops: number;
  equipements: number;
  lignesDegats: number;
  recettes: number;
  recetteIngredients: number;
}

export interface ImportResult {
  success: true;
  imported: ImportCounters;
}

export const importApi = {
  importPack: (pack: unknown) =>
    api.post<ImportResult>('/import', pack).then(r => r.data),
};
