import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CharactersPage from './CharactersPage';

const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('playerId');

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard {playerId ? `- Joueur #${playerId}` : ''}</h1>
      </div>
      <CharactersPage playerId={playerId ? Number(playerId) : undefined} />
    </div>
  );
};

export default DashboardPage;
