import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const adminLinks = [
  { to: '/admin/races', label: 'Races' },
  { to: '/admin/sorts', label: 'Sorts' },
  { to: '/admin/equipements', label: 'Equipements' },
  { to: '/admin/effets', label: 'Effets' },
  { to: '/admin/zones', label: 'Zones' },
  { to: '/admin/regions', label: 'Regions' },
  { to: '/admin/maps', label: 'Maps' },
  { to: '/admin/monstres', label: 'Monstres' },
  { to: '/admin/grilles', label: 'Grilles' },
  { to: '/admin/donjons', label: 'Donjons' },
];

const gameLinks = [
  { to: '/game/players', label: 'Joueurs' },
  { to: '/game/characters', label: 'Personnages' },
  { to: '/game/groups', label: 'Groupes' },
  { to: '/game/map', label: 'Exploration' },
  { to: '/game/combat', label: 'Combat' },
];

const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h2 className="sidebar-title">RPG Tactique</h2>
        <div className="nav-section">
          <h3>Jeu</h3>
          {gameLinks.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-section">
          <h3>Admin</h3>
          {adminLinks.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
