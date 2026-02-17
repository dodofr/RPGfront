import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CharactersPage from './CharactersPage';
import GroupsPage from './GroupsPage';

const tabs = [
  { key: 'characters', label: 'Personnages' },
  { key: 'groups', label: 'Groupes' },
];

const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('playerId');
  const [activeTab, setActiveTab] = useState('characters');

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard {playerId ? `- Joueur #${playerId}` : ''}</h1>
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
        {activeTab === 'characters' && <CharactersPage playerId={playerId ? Number(playerId) : undefined} />}
        {activeTab === 'groups' && <GroupsPage playerId={playerId ? Number(playerId) : undefined} />}
      </div>
    </div>
  );
};

export default DashboardPage;
