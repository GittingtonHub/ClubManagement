import { Routes, Route } from 'react-router-dom';

import Profile from "./pages/Profile"

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
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
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
