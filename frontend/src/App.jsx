import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header"
import Footer from "./components/Footer"
import Reservations from "./pages/Reservations"
import Login from "./pages/Login"
import Home from "./pages/Home"
import Admin from "./pages/Admin";
import StaffProfile  from './components/StaffProfile';
import UserProfile from './components/UserProfile';
import NotFoundPage from './pages/NotFoundPage';
import SuccessfulPurchase from "./pages/SuccessfulPurchase";

function App() {
  const normalizedRole = (localStorage.getItem("userRole") || "").toLowerCase();

  const userOrStaff = () => {
    if (normalizedRole == "staff" || normalizedRole == "admin") 
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

          <Route path="/admin" element=
          {
          <ProtectedRoute requiredRole="admin">
             <Admin />
          </ProtectedRoute>
          } 
          />
          
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
          

          {/*Public Routes*/}

          <Route path="/reservations" element={<Reservations />} />
          <Route path="/login" element={<Login />} />
   
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/successful-purchase" element={<SuccessfulPurchase />} />

          <Route path= "/*"element={<NotFoundPage />} />
        
        </Routes>

      <Footer />
    </>
  )
}

export default App
