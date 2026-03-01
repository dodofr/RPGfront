import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const adminLinks = [
  { to: '/admin/monde', label: 'Monde', desc: 'Regions, Maps, Grilles, Donjons' },
  { to: '/admin/entites', label: 'Entites', desc: 'Races, Monstres' },
  { to: '/admin/combat', label: 'Combat', desc: 'Sorts, Effets, Zones' },
  { to: '/admin/objets', label: 'Objets', desc: 'Equipements, Ressources, Panoplies, Recettes' },
  { to: '/admin/passives', label: 'Passives', desc: 'Compétences passives par niveau' },
  { to: '/admin/pnj', label: 'PNJ', desc: 'Marchands et PNJ de map' },
  { to: '/admin/import', label: 'Import', desc: 'Import en masse par fichier JSON' },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h2 className="sidebar-title">RPG Tactique</h2>
        <button className="btn btn-sm btn-secondary sidebar-home-btn" onClick={() => navigate('/')}>
          Accueil
        </button>
        <div className="nav-section">
          <h3>Administration</h3>
          {adminLinks.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span>{l.label}</span>
              <span className="nav-link-desc">{l.desc}</span>
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

export default AdminLayout;
