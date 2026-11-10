import { Outlet } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span className="mini-package">▣</span> EquipTrack</div>
          <div className="topbar-search"><Search size={17} /><span>Equipment checkout workspace</span></div>
          <div className="topbar-right">
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <div className="topbar-user">{user?.fname || user?.user_name}</div>
          </div>
        </header>
        <section className="page-content"><Outlet /></section>
      </main>
    </div>
  );
}
