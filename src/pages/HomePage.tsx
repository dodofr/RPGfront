import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">RPG Tactique</h1>
        <p className="home-subtitle">Jeu de role tactique au tour par tour</p>
        <div className="home-buttons">
          <button className="home-btn home-btn-play" onClick={() => navigate('/game')}>
            <span className="home-btn-icon">J</span>
            <span className="home-btn-label">Jouer</span>
            <span className="home-btn-desc">Gerer vos personnages, groupes et partir a l'aventure</span>
          </button>
          <button className="home-btn home-btn-admin" onClick={() => navigate('/admin/monde')}>
            <span className="home-btn-icon">A</span>
            <span className="home-btn-label">Administration</span>
            <span className="home-btn-desc">Gerer le monde, les entites, le combat et les objets</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
