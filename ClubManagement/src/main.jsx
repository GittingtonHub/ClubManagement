import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import App from './App.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';


const router = createBrowserRouter([
  {path: "/login", element: <Login />},
  {path: "/", element: <App />},
  {path: "/inventory", element: <Inventory/>},
  {path: "*", element: <NotFoundPage />},
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
