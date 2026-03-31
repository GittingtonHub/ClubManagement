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
import StaffProfile  from './components/StaffProfile';
import UserProfile from './components/UserProfile';
import NotFoundPage from './pages/NotFoundPage';

function App() {

  const userOrStaff = () => {
    if (localStorage.getItem("userRole") == "staff" || localStorage.getItem("userRole") == "admin") 
    {
      return true;
    }
   
    return false;
  };

  return (
    <>
      <Header />
        <Routes>

          {/* Protected Routes */}

          <Route path="/inventory" element=
          {
          <ProtectedRoute requiredRole="admin">
            <Inventory />
          </ProtectedRoute>
          } />
          
          { userOrStaff() == true && <Route path="/profile" element=
          {
          <ProtectedRoute requiredRole="staff">
             <StaffProfile />
          </ProtectedRoute>
          } 
          />
          }

          { userOrStaff() == false && <Route path="/profile" element=
          {
          <ProtectedRoute requiredRole="user">
             <UserProfile />
          </ProtectedRoute>
          } 
          />
          } 
          
          <Route path="/users" element=
          {
          <ProtectedRoute requiredRole="admin">
             <Users />
          </ProtectedRoute>
          } 
          />

          {/*Public Routes*/}

          <Route path="/reservations" element={<Reservations />} />
          <Route path="/login" element={<Login />} />
   
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />

          <Route path= "/*"element={<NotFoundPage />} />
        
        </Routes>

      <Footer />
    </>
  )
}

export default App
