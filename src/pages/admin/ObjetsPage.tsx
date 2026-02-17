import React, { useState } from 'react';
import EquipementsPage from './EquipementsPage';
import RessourcesPage from './RessourcesPage';
import PanopliesPage from './PanopliesPage';
import RecettesPage from './RecettesPage';

const tabs = [
  { key: 'equipements', label: 'Equipements' },
  { key: 'ressources', label: 'Ressources' },
  { key: 'panoplies', label: 'Panoplies' },
  { key: 'recettes', label: 'Recettes' },
];

const ObjetsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('equipements');

  return (
    <div>
      <div className="page-header">
        <h1>Objets</h1>
      </div>
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeTab === 'equipements' && <EquipementsPage />}
        {activeTab === 'ressources' && <RessourcesPage />}
        {activeTab === 'panoplies' && <PanopliesPage />}
        {activeTab === 'recettes' && <RecettesPage />}
      </div>
    </div>
  );
};

export default ObjetsPage;
