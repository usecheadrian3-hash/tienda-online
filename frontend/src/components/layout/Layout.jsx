import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import Topbar from './Topbar'
import Navbar from './Navbar'
import SearchOverlay from './SearchOverlay'
import CartDrawer from './CartDrawer'
import Footer from './Footer'
import MobileNav from './MobileNav'
import MobileMenu from './MobileMenu'
import { useStore } from '../../contexts/StoreContext'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const { config } = useStore()
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 })
    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <Outlet />
  }

  const topBanner = (config?.banners_top || []).find((b) => b.is_active)

  return (
    <>
      <Topbar banner={topBanner} />
      <Navbar
        onOpenSearch={() => setSearchOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        user={user}
      />
      <main>
        <Outlet />
      </main>
      <Footer />
      <MobileNav onOpenSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CartDrawer />
    </>
  )
}
