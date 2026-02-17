import React, { useState } from 'react';
import SortsPage from './SortsPage';
import EffetsPage from './EffetsPage';
import ZonesPage from './ZonesPage';

const tabs = [
  { key: 'sorts', label: 'Sorts' },
  { key: 'effets', label: 'Effets' },
  { key: 'zones', label: 'Zones' },
];

const CombatAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sorts');

  return (
    <div>
      <div className="page-header">
        <h1>Combat</h1>
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
        {activeTab === 'sorts' && <SortsPage />}
        {activeTab === 'effets' && <EffetsPage />}
        {activeTab === 'zones' && <ZonesPage />}
      </div>
    </div>
  );
};

export default CombatAdminPage;
