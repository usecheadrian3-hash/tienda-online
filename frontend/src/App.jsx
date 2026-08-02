import { Routes, Route, useParams } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { StoreProvider } from './contexts/StoreContext'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'

import Layout from './components/layout/Layout'
import RequireAuth from './components/ui/RequireAuth'

import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderStatus from './pages/OrderStatus'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

import AccountLayout from './pages/account/AccountLayout'
import Profile from './pages/account/Profile'
import Orders from './pages/account/Orders'
import OrderDetail from './pages/account/OrderDetail'
import Favorites from './pages/account/Favorites'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminCategories from './pages/admin/AdminCategories'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminInventory from './pages/admin/AdminInventory'
import AdminContent from './pages/admin/AdminContent'
import AdminSettings from './pages/admin/AdminSettings'

function CategoryPage() {
  const { slug } = useParams()
  return <Shop type="category" slug={slug} />
}

function BrandPage() {
  const { slug } = useParams()
  return <Shop type="brand" slug={slug} />
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/tienda" element={<Shop />} />
                  <Route path="/categoria/:slug" element={<CategoryPage />} />
                  <Route path="/marca/:slug" element={<BrandPage />} />
                  <Route path="/producto/:slug" element={<ProductDetail />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/carrito" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/pago/:orderNumber" element={<Payment />} />
                  <Route path="/pedido/exitoso" element={<OrderStatus status="exitoso" />} />
                  <Route path="/pedido/pendiente" element={<OrderStatus status="pendiente" />} />
                  <Route path="/pedido/error" element={<OrderStatus status="error" />} />
                  <Route path="/pedido/cancelado" element={<OrderStatus status="cancelado" />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/contacto" element={<Contact />} />

                  <Route path="/cuenta" element={<RequireAuth><AccountLayout /></RequireAuth>}>
                    <Route index element={<Profile />} />
                    <Route path="pedidos" element={<Orders />} />
                    <Route path="pedidos/:orderNumber" element={<OrderDetail />} />
                    <Route path="favoritos" element={<Favorites />} />
                  </Route>
                </Route>

                <Route
                  path="/admin"
                  element={
                    <RequireAuth admin>
                      <AdminLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="productos" element={<AdminProducts />} />
                  <Route path="pedidos" element={<AdminOrders />} />
                  <Route path="clientes" element={<AdminCustomers />} />
                  <Route path="categorias" element={<AdminCategories />} />
                  <Route path="cupones" element={<AdminCoupons />} />
                  <Route path="inventario" element={<AdminInventory />} />
                  <Route path="contenido" element={<AdminContent />} />
                  <Route path="configuracion" element={<AdminSettings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </ToastProvider>
  )
}
