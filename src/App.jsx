import { Route, Routes, useLocation, Navigate } from "react-router-dom"
import TreePage from "./pages/TreePage"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/E-Commerce/Home"
import Shop from "./pages/E-Commerce/Shop"
import AboutNoniPage from "./pages/E-Commerce/About-Noni"
import BenefitsPage from "./pages/E-Commerce/Benifits"
import TestimonialsPage from "./pages/E-Commerce/Testimonials"
import Contact from "./pages/E-Commerce/Contact"
import CartPage from "./pages/E-Commerce/Cart"
import LoginPage from "./pages/E-Commerce/Login"
import ProductForm from "./pages/E-Commerce/ProductForm.jsx"
import RegisterPage from "./pages/E-Commerce/Register"

import { useEffect } from "react"
import { useLoader } from "./context/LoaderContext"
import Account from "./pages/E-Commerce/account/Account"
import Profile from "./pages/E-Commerce/account/Profile"
import Orders from "./pages/E-Commerce/account/Orders"
import Addresses from "./pages/E-Commerce/account/Addresses"
import Wishlist from "./pages/E-Commerce/account/Wishlist"
import AffiliateHero from "./pages/Affilate/Affilate"
import AffilateDashboardWrapper from "./pages/Affilate/pages/AffilateDashboardWrapper"
import Analytics from "./pages/Affilate/pages/Analytics.jsx"
import AffilateLayout from "./pages/Affilate/layout/AffilateLayout.jsx"
import MLMNetwork from "./pages/Affilate/pages/MLMNetwork.jsx"
import PaymentDashboard from "./pages/Affilate/pages/PaymentsDashboard.jsx"
import AffilateProfile from "./pages/Affilate/pages/AffilateProfile.jsx"
import KYCPage from "./pages/Affilate/pages/KYC.jsx"
import AdminLayout from "./pages/Admin/Layout/AdminLayout.jsx"
import AdminDashboard from "./pages/Admin/pages/AdminDashboard.jsx"
import AdminLogin from "./pages/Admin/pages/AdminLogin.jsx"
import PayoutManagement from "./pages/Admin/pages/PayoutManagement.jsx"
import PaymentRequests from "./pages/Admin/pages/PaymentRequests.jsx"
import PaymentRequestPage from "./pages/PaymentRequestPage.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import { useUser, UserProvider } from "./context/UserContext.jsx"
import { CartProvider } from "./context/CartContext.jsx"
import { WishlistProvider } from "./context/WishlistContext.jsx"
import Tree from './pages/Affilate/pages/Tree.jsx'
import MyNetwork from "./pages/Affilate/pages/MyNetwork.jsx"
import ProductDetails from "./pages/E-Commerce/ProductDetails.jsx"
import AdminNetworkTree from "./pages/Admin/pages/AdminNetworkTree.jsx"
import KYCVerification from "./pages/Admin/pages/KYCVerification.jsx"
import ManageProducts from "./pages/Admin/pages/ManageProducts.jsx"
import ManageUsers from "./pages/Admin/pages/ManageUsers.jsx"
import AddAdmin from "./pages/Admin/pages/AddAdmin.jsx"
import { FirebaseIndexChecker } from './utils/firebaseIndexChecker';

const App = () => {

 const { currentUser } = useUser(); // Get current user from context

  const { setShow } = useLoader();

  useEffect(() => {
    // Simulate loading
    setShow(false);
    console.log(currentUser)
    
    // Check Firebase index status in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        FirebaseIndexChecker.logIndexStatus();
      }, 2000); // Wait 2 seconds for Firebase to initialize
    }
  
  }, []);

  const location = useLocation();

  // Add all routes you want to hide Navbar/Sidebar on
  const hideUIRoutes = ['/account', '/account/orders', '/account/addresses', '/logout', '/affilate-dashboard', '/admin'];
  const shouldHideUI = hideUIRoutes.some((path) => location.pathname.startsWith(path));





  return (
    <UserProvider>
      <CartProvider>
        <WishlistProvider>
        {!shouldHideUI && <Navbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/aboutnoni" element={<AboutNoniPage />} />
          <Route path="/benifits" element={<BenefitsPage />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/affiliate" element={<AffiliateHero />} />
          <Route path="/payment-request" element={<PaymentRequestPage />} />
          <Route path="/adminlogin" element={<AdminLogin />} />
          <Route path="/prod" element={<ProductForm />} />
          <Route path="/products/:productId" element={<ProductDetails />} />

          <Route path="account" element={<Account />}>
            <Route index element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="wishlist" element={<Wishlist />} />
          </Route>

          <Route path="affilate-dashboard" element={
            <ProtectedRoute requireAffiliate={true}>
              <AffilateLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AffilateDashboardWrapper />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="tree" element={<MLMNetwork />} />
            <Route path="mynetwork" element={<MyNetwork />} />
            <Route path="network" element={<Tree />} />
            <Route path="payment" element={<PaymentDashboard />} />
            <Route path="kyc" element={<KYCPage />} />
            <Route path="profile" element={<AffilateProfile />} />
          </Route>

          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="payment-requests" element={<PaymentRequests />} />
            <Route path="payouts" element={<PayoutManagement />} />
            <Route path="tree" element={<AdminNetworkTree />} />
            <Route path="kyc-verification" element={<KYCVerification />} />
            <Route path="manage-users" element={<ManageUsers />} />
            <Route path="add-admin" element={<AddAdmin />} />
            <Route path="profile" element={<AffilateProfile />} />
            <Route path="add-product" element={<ProductForm />} />
            <Route path="manage-products" element={<ManageProducts />} />
          </Route>



        </Routes>
        {!shouldHideUI && <Footer />}
        </WishlistProvider>
      </CartProvider>
    </UserProvider>
  )
}

export default App
