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

// Game pages
import PlayersPage from './pages/game/PlayersPage'
import DashboardPage from './pages/game/DashboardPage'
import MapPage from './pages/game/MapPage'
import CombatPage from './pages/game/CombatPage'

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/game',
    element: <Layout />,
    children: [
      { index: true, element: <PlayersPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'adventure', element: <MapPage /> },
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
      { path: 'grilles/:id/edit', element: <GridEditorPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
