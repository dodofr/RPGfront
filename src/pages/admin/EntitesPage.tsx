import React, { useState } from 'react';
import RacesPage from './RacesPage';
import MonstresPage from './MonstresPage';

const tabs = [
  { key: 'races', label: 'Races' },
  { key: 'monstres', label: 'Monstres' },
];

const EntitesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('races');

  return (
    <div>
      <div className="page-header">
        <h1>Entites</h1>
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
        {activeTab === 'races' && <RacesPage />}
        {activeTab === 'monstres' && <MonstresPage />}
      </div>
    </div>
  );
};

export default EntitesPage;
