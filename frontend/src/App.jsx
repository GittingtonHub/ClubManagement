import ProtectedRoute from "./components/ProtectedRoute"
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Header from "./components/Header"
import Footer from "./components/Footer"

import Reservations from "./pages/Reservations"
import Login from "./pages/Login"
import Home from "./pages/Home"
import Inventory from "./pages/Inventory"

function App() {

  return (
    <>
      <Header />

        <Routes>
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Home />} />
        </Routes>

      <Footer />
    </>
  )
}

export default App
