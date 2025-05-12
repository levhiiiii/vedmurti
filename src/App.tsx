import { BrowserRouter, Route, Routes } from "react-router-dom"
import TreePage from "./pages/TreePage"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/E-Commerce/Home"
import Shop from "./pages/E-Commerce/Shop"
import AboutNoniPage from "./pages/E-Commerce/About-Noni"
import BenefitsPage from "./pages/E-Commerce/Benifits"
import TestimonialsPage from "./pages/E-Commerce/Testimonials"
import Contact from "./pages/E-Commerce/Contact"
import AccountPage from "./pages/E-Commerce/Account/Account"
import CartPage from "./pages/E-Commerce/Cart"
import LoginPage from "./pages/E-Commerce/Login"
import RegisterPage from "./pages/E-Commerce/Register"
import { useEffect } from "react"
import { useLoader } from "./context/LoaderContext"
import OrdersPage from "./pages/E-Commerce/Account/OrdersPage"
import AddressesPage from "./pages/E-Commerce/Account/AddressesPage"
import WishlistPage from "./pages/E-Commerce/Account/WishlistPage"

const App = () => {


  const { setShow } = useLoader();

  useEffect(() => {
    // Simulate loading
    setShow(false);

  }, []);
  return (
    <>

      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/aboutnoni" element={<AboutNoniPage />} />
          <Route path="/benifits" element={<BenefitsPage />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/addresses" element={<AddressesPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
        <Footer />

      </BrowserRouter>
    </>
  )
}

export default App