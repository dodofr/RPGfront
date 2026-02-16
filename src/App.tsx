import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

// Admin pages
import RacesPage from './pages/admin/RacesPage'
import SortsPage from './pages/admin/SortsPage'
import EquipementsPage from './pages/admin/EquipementsPage'
import EffetsPage from './pages/admin/EffetsPage'
import ZonesPage from './pages/admin/ZonesPage'
import RegionsPage from './pages/admin/RegionsPage'
import MapsPage from './pages/admin/MapsPage'
import MonstresPage from './pages/admin/MonstresPage'
import GrillesPage from './pages/admin/GrillesPage'
import GridEditorPage from './pages/admin/GridEditorPage'
import DonjonsPage from './pages/admin/DonjonsPage'
import RessourcesPage from './pages/admin/RessourcesPage'
import PanopliesPage from './pages/admin/PanopliesPage'
import RecettesPage from './pages/admin/RecettesPage'

// Game pages
import PlayersPage from './pages/game/PlayersPage'
import CharactersPage from './pages/game/CharactersPage'
import GroupsPage from './pages/game/GroupsPage'
import MapPage from './pages/game/MapPage'
import CombatPage from './pages/game/CombatPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/game/players" replace /> },
      // Admin
      { path: 'admin/races', element: <RacesPage /> },
      { path: 'admin/sorts', element: <SortsPage /> },
      { path: 'admin/equipements', element: <EquipementsPage /> },
      { path: 'admin/effets', element: <EffetsPage /> },
      { path: 'admin/zones', element: <ZonesPage /> },
      { path: 'admin/regions', element: <RegionsPage /> },
      { path: 'admin/maps', element: <MapsPage /> },
      { path: 'admin/monstres', element: <MonstresPage /> },
      { path: 'admin/grilles', element: <GrillesPage /> },
      { path: 'admin/grilles/:id/edit', element: <GridEditorPage /> },
      { path: 'admin/donjons', element: <DonjonsPage /> },
      { path: 'admin/ressources', element: <RessourcesPage /> },
      { path: 'admin/panoplies', element: <PanopliesPage /> },
      { path: 'admin/recettes', element: <RecettesPage /> },
      // Game
      { path: 'game/players', element: <PlayersPage /> },
      { path: 'game/characters', element: <CharactersPage /> },
      { path: 'game/groups', element: <GroupsPage /> },
      { path: 'game/map', element: <MapPage /> },
      { path: 'game/combat', element: <CombatPage /> },
      { path: 'game/combat/:id', element: <CombatPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
