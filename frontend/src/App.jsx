import { Routes, Route } from 'react-router-dom';
// Add this near your other imports at the top!
import ProtectedRoute from "./components/ProtectedRoute";

import Header from "./components/Header"
import Footer from "./components/Footer"

import Reservations from "./pages/Reservations"
import Login from "./pages/Login"
import Home from "./pages/Home"
import Inventory from "./pages/Inventory"
import Profile from "./pages/Profile"
import Users from "./pages/Users"

function App() {

  return (
    <>
      <Header />

        <Routes>
          <Route 
          path="/inventory" element={
          <ProtectedRoute requiredRole="admin">
            <Inventory />
          </ProtectedRoute>
          } />
          <Route path="/reservations" element={<Reservations />} />
          <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
          />
          <Route 
            path="/staff-profile" 
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffProfile />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/users" element={<Users />} />
          <Route path="/*" element={<Home />} />
        </Routes>

      <Footer />
    </>
  )
}

export default App
