import api from './client';

export interface ImportCounters {
  regions: number;
  maps: number;
  mapCases: number;
  mapSpawns: number;
  ressources: number;
  effets: number;
  zones: number;
  races: number;
  sorts: number;
  sortEffets: number;
  monstres: number;
  monstreSorts: number;
  monstreDrops: number;
  regionMonstres: number;
  equipements: number;
  lignesDegats: number;
  recettes: number;
  recetteIngredients: number;
  pnj: number;
  marchandLignes: number;
  quetes: number;
  queteEtapes: number;
  queteRecompenses: number;
  quetePrerequisites: number;
}

export interface ImportResult {
  success: true;
  imported: ImportCounters;
}

export const importApi = {
  importPack: (pack: unknown) =>
    api.post<ImportResult>('/import', pack).then(r => r.data),
};

export const exportApi = {
  exportPack: () => api.get<unknown>('/export').then(r => r.data),
};
