import { react, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from "./components/ProtectedRoute";

import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import App from './App.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx';
import Home from './pages/Home.jsx';
import Reservations from './pages/Reservations.jsx';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },

  {
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <Home /> },
      { path: "/home", element: <Home /> },
      { path: "/inventory", element: <Inventory /> },
      { path: "/reservations", element: <Reservations /> },
    ],
  },

  {
    path: "*",
    element: <NotFoundPage />,
  },
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
