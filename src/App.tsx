import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'

// Home
import HomePage from './pages/HomePage'

// Admin wrapper pages
import MondePage from './pages/admin/MondePage'
import EntitesPage from './pages/admin/EntitesPage'
import CombatAdminPage from './pages/admin/CombatAdminPage'
import ObjetsPage from './pages/admin/ObjetsPage'
import GridEditorPage from './pages/admin/GridEditorPage'

// Admin detail pages
import MonstreDetailPage from './pages/admin/MonstreDetailPage'
import SortDetailPage from './pages/admin/SortDetailPage'
import EquipementDetailPage from './pages/admin/EquipementDetailPage'
import PassivesPage from './pages/admin/PassivesPage'
import PNJPage from './pages/admin/PNJPage'
import PNJDetailPage from './pages/admin/PNJDetailPage'
import ImportPage from './pages/admin/ImportPage'
import QuetesPage from './pages/admin/QuetesPage'
import QueteDetailPage from './pages/admin/QueteDetailPage'
import RaceDetailPage from './pages/admin/RaceDetailPage'

// Game pages
import PlayersPage from './pages/game/PlayersPage'
import DashboardPage from './pages/game/DashboardPage'
import MapPage from './pages/game/MapPage'
import CombatPage from './pages/game/CombatPage'
import CharactersPage from './pages/game/CharactersPage'

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/game',
    element: <Layout />,
    children: [
      { index: true, element: <PlayersPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'adventure', element: <MapPage /> },
      { path: 'characters', element: <CharactersPage /> },
      { path: 'combat', element: <CombatPage /> },
      { path: 'combat/:id', element: <CombatPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/monde" replace /> },
      { path: 'monde', element: <MondePage /> },
      { path: 'entites', element: <EntitesPage /> },
      { path: 'combat', element: <CombatAdminPage /> },
      { path: 'objets', element: <ObjetsPage /> },
      { path: 'maps/:mapId/grid', element: <GridEditorPage /> },
      // Pages dédiées
      { path: 'monstres/:id', element: <MonstreDetailPage /> },
      { path: 'sorts/:id', element: <SortDetailPage /> },
      { path: 'equipements/:id', element: <EquipementDetailPage /> },
      { path: 'passives', element: <PassivesPage /> },
      { path: 'pnj', element: <PNJPage /> },
      { path: 'pnj/:id', element: <PNJDetailPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'quetes', element: <QuetesPage /> },
      { path: 'quetes/:id', element: <QueteDetailPage /> },
      { path: 'races/:id', element: <RaceDetailPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
