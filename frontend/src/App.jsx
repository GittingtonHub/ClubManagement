import Header from "./components/Header"
import Inventory from "./pages/Inventory"
import Footer from "./components/Footer"
import ProtectedRoute from "./components/ProtectedRoute"
import SignUp from "./components/SignUp"

function App() {

  return (
    <ProtectedRoute>
      <>
        <Header />
        <SignUp />
        <Footer />
      </>
    </ProtectedRoute>
  )
}

export default App
