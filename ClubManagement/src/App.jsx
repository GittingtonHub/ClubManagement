import Header from "./components/Header"
import Inventory from "./pages/Inventory"
import Footer from "./components/Footer"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {

  return (
    <ProtectedRoute>
      <>
        <Header />
        <Inventory />
        <Footer />
      </>
    </ProtectedRoute>
  )
}

export default App
