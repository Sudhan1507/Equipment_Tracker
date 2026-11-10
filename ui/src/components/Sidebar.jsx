import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, CheckSquare, LogOut, Boxes } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logout, isDemo } = useAuth();
  const navigate = useNavigate();

  const technicianLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/equipment", label: "Available Equipment", icon: Package },
    { to: "/my-requests", label: "My Requests", icon: ClipboardList },
  ];
  const supervisorLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/equipment", label: "Equipment", icon: Boxes },
    { to: "/requests", label: "Request Management", icon: CheckSquare },
  ];
  const links = user?.role_type === "SUPERVISOR" ? supervisorLinks : technicianLinks;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Package size={21} /></div><div><strong>EquipTrack</strong><span>Equipment Checkout</span></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {isDemo && <div className="demo-mode-label">Demo mode</div>}
        <div className="profile">
          <div className="avatar">{user?.fname?.[0] ?? user?.user_name?.[0] ?? "U"}</div>
          <div className="profile-copy"><strong>{[user?.fname, user?.lname].filter(Boolean).join(" ") || user?.user_name}</strong><span>{user?.role_type === "SUPERVISOR" ? "Supervisor" : "Technician"}</span></div>
        </div>
        <button className="logout-button" onClick={handleLogout}><LogOut size={17} /><span>Log out</span></button>
      </div>
    </aside>
  );
}
