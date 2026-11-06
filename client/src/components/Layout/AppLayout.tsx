import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'
import { LocationPromptModal } from '../Location/LocationPromptModal'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0c10] text-[#f1f1f5]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <LocationPromptModal />
    </div>
  )
}
