import React, { useState } from 'react';
import RegionsPage from './RegionsPage';
import MapsPage from './MapsPage';
import DonjonsPage from './DonjonsPage';
import WorldMapEditor from './WorldMapEditor';

const tabs = [
  { key: 'regions', label: 'Regions' },
  { key: 'maps', label: 'Maps' },
  { key: 'donjons', label: 'Donjons' },
  { key: 'worldmap', label: 'Carte du monde' },
];

const MondePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('regions');

  return (
    <div>
      <div className="page-header">
        <h1>Monde</h1>
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
        {activeTab === 'regions' && <RegionsPage />}
        {activeTab === 'maps' && <MapsPage />}
        {activeTab === 'donjons' && <DonjonsPage />}
        {activeTab === 'worldmap' && <WorldMapEditor />}
      </div>
    </div>
  );
};

export default MondePage;
