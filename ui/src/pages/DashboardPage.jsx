import { ClipboardList, Package, RotateCcw, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const isSupervisor = user?.role_type === "SUPERVISOR";
  const cards = isSupervisor
    ? [
        { label: "Equipment items", value: "24", icon: Package, note: "Across all categories" },
        { label: "Pending requests", value: "08", icon: ClipboardList, note: "Awaiting your review" },
        { label: "Returns to process", value: "03", icon: RotateCcw, note: "Check returned items" },
        { label: "Technicians", value: "12", icon: Users, note: "Registered users" },
      ]
    : [
        { label: "Available equipment", value: "18", icon: Package, note: "Ready to request" },
        { label: "My requests", value: "04", icon: ClipboardList, note: "All submitted requests" },
        { label: "Approved requests", value: "02", icon: RotateCcw, note: "Approved for checkout" },
      ];

  return (
    <div>
      <div className="page-heading">
        <div><span className="eyebrow">OVERVIEW</span><h1>Good day, {user?.fname || user?.user_name}.</h1><p>Here’s what’s happening in your equipment workspace.</p></div>
        <span className={`role-badge ${isSupervisor ? "supervisor" : ""}`}>{user?.role_type}</span>
      </div>
      <div className="stat-grid">
        {cards.map(({ label, value, icon: Icon, note }) => (
          <article className="stat-card" key={label}>
            <div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={19} /></div></div>
            <strong className="stat-value">{value}</strong><span className="stat-note">{note}</span>
          </article>
        ))}
      </div>
      <div className="info-panel">
        <h3>Workspace ready</h3>
        <p>These are sample prototype counts. Replace them with live values from your summary APIs.</p>
      </div>
    </div>
  );
}
