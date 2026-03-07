import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const gameLinks = [
  { to: '/game', label: 'Joueurs', end: true },
  { to: '/game/dashboard', label: 'Dashboard' },
  { to: '/game/adventure', label: 'Aventure' },
  { to: '/game/combat', label: 'Combat' },
];

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');

  const toggle = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <div className="app-layout">
      <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <button className="sidebar-toggle" onClick={toggle} title={collapsed ? 'Ouvrir' : 'Réduire'}>
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && (
          <>
            <h2 className="sidebar-title">RPG Tactique</h2>
            <button className="btn btn-sm btn-secondary sidebar-home-btn" onClick={() => navigate('/')}>
              Accueil
            </button>
            <div className="nav-section">
              <h3>Jeu</h3>
              {gameLinks.map(l => (
                <NavLink key={l.to} to={l.to} end={'end' in l}
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
