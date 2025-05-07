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

const App = () => {
  return (
   <BrowserRouter>
   <Navbar/>
     <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/tree" element={<TreePage/>} />
        <Route path="/shop" element={<Shop/>} />
        <Route path="/aboutnoni" element={<AboutNoniPage/>} />
        <Route path="/benifits" element={<BenefitsPage/>} />
        <Route path="/testimonials" element={<TestimonialsPage/>} />
        <Route path="/contact" element={<Contact/>} />
     </Routes>
     <Footer/>
   </BrowserRouter>
  )
}

export default App