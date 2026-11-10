import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import DataTable from "../components/DataTable";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const emptyForm = { equipment_name: "", total_quantity: 1 };

export default function EquipmentPage() {
  const { user, isDemo } = useAuth();
  const isSupervisor = user?.role_type === "SUPERVISOR";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [requestItem, setRequestItem] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState(1);

  async function loadEquipment() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/equipment");
      const payload = response.data?.data ?? response.data;
      const equipment = Array.isArray(payload) ? payload : payload?.equipment ?? payload?.items;
      if (Array.isArray(equipment)) setRows(equipment);
    } catch (err) {
      if (!isDemo) setError(err?.response?.data?.message || "Could not load equipment. Showing sample data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEquipment(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      equipment_name: row.equipment_name ?? row.name ?? "",
      total_quantity: row.total_quantity ?? row.quantity ?? 1,
    });
    setFormOpen(true);
  }

  async function saveEquipment(event) {
    event.preventDefault();
    setError("");
    try {
      if (isDemo) {
        if (editing) {
          setRows((prev) => prev.map((row) => row.id === editing.id ? { ...row, ...form, total_quantity: Number(form.total_quantity), available_quantity: Number(form.total_quantity) } : row));
        } else {
          const newRow = { ...form, id: `EQ-${Date.now()}`, total_quantity: Number(form.total_quantity), available_quantity: Number(form.total_quantity) };
          setRows((prev) => [newRow, ...prev]);
        }
      } else if (editing) {
        await api.put(`/api/equipment/${editing.id}`, { ...form, total_quantity: Number(form.total_quantity) });
        await loadEquipment();
      } else {
        await api.post("/api/equipment", { ...form, total_quantity: Number(form.total_quantity) });
        await loadEquipment();
      }
      setFormOpen(false);
      setNotice(editing ? "Equipment updated." : "Equipment created.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save equipment. Check the backend field names.");
    }
  }

  async function deleteEquipment(row) {
    if (!window.confirm(`Delete ${row.equipment_name}?`)) return;
    try {
      if (isDemo) setRows((prev) => prev.filter((item) => item.id !== row.id));
      else {
        await api.delete(`/api/equipment/${row.id}`);
        await loadEquipment();
      }
      setNotice("Equipment deleted.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete equipment.");
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setError("");
    try {
      if (!isDemo) {
        await api.post("/api/requests", {
          equipment_id: requestItem.id,
          quantity: Number(requestQuantity),
        });
      } else {
        setNotice(`Demo request submitted for ${requestItem.equipment_name}.`);
      }
      setRequestItem(null);
      setRequestQuantity(1);
      if (!isDemo) setNotice("Equipment request submitted.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to submit request. Verify the request payload fields.");
    }
  }

  const columns = [
    { key: "equipment_name", header: "Equipment", searchableValue: (row) => `${row.equipment_name ?? row.name ?? ""} ${row.description ?? ""}`, render: (row) => <div className="equipment-cell"><div className="equipment-thumb">▦</div><div><strong>{row.equipment_name ?? row.name ?? "Unnamed equipment"}</strong></div></div> },
    { key: "available_quantity", header: "Available", render: (row) => <span className={`quantity-pill ${(row.available_quantity ?? row.quantity_available ?? 0) > 0 ? "in-stock" : "out-stock"}`}>{row.available_quantity ?? row.quantity_available ?? 0}</span> },
    { key: "total_quantity", header: "Total quantity", render: (row) => row.total_quantity ?? row.quantity ?? "—" },
    { key: "status", header: "Status", render: (row) => { const available = (row.available_quantity ?? row.quantity_available ?? 0) > 0; return <span className={`status-pill ${available ? "status-available" : "status-unavailable"}`}>{available ? "Available" : "Unavailable"}</span>; } },
  ];

  return (
    <div>
      <div className="page-heading page-heading-row">
        <div><span className="eyebrow">INVENTORY</span><h1>{isSupervisor ? "Equipment" : "Available equipment"}</h1><p>{isSupervisor ? "Manage and monitor the equipment inventory." : "Browse available items and request what you need."}</p></div>
        {isSupervisor && <button className="primary-button" onClick={openCreate}><Plus size={17} /> Add equipment</button>}
      </div>
      {notice && <div className="success-banner">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
      {error && <div className="error-banner">{error}</div>}
      <DataTable columns={columns} rows={rows} rowKey={(row) => String(row.id ?? row.equipment_id)} loading={loading} searchPlaceholder="Search equipment..." emptyMessage="No equipment is available yet."
        actions={(row) => isSupervisor
          ? <div className="action-group"><button className="table-action" title="Edit equipment" onClick={() => openEdit(row)}><Pencil size={16} /></button><button className="table-action danger" title="Delete equipment" onClick={() => deleteEquipment(row)}><Trash2 size={16} /></button></div>
          : <button className="small-primary" disabled={(row.available_quantity ?? row.quantity_available ?? 0) <= 0} onClick={() => { setRequestItem(row); setRequestQuantity(1); }}>Request</button>}
      />

      {formOpen && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={saveEquipment}>
        <div className="modal-heading"><div><h2>{editing ? "Edit equipment" : "Add equipment"}</h2><p>Update inventory details.</p></div><button type="button" className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close"><X size={18} /></button></div>
        <label className="field-label" htmlFor="equipment_name">Equipment name</label><input className="text-input" id="equipment_name" value={form.equipment_name} onChange={(e) => setForm({ ...form, equipment_name: e.target.value })} required />
        <label className="field-label" htmlFor="total_quantity">Total quantity</label><input className="text-input" id="total_quantity" type="number" min="1" value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} required />
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="primary-button">{editing ? "Save changes" : "Create equipment"}</button></div>
      </form></div>}

      {requestItem && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={submitRequest}>
        <div className="modal-heading"><div><h2>Request equipment</h2><p>{requestItem.equipment_name ?? requestItem.name}</p></div><button type="button" className="icon-button" onClick={() => setRequestItem(null)} aria-label="Close"><X size={18} /></button></div>
        <label className="field-label" htmlFor="request_quantity">Quantity</label><input className="text-input" id="request_quantity" type="number" min="1" max={requestItem.available_quantity ?? requestItem.quantity_available} value={requestQuantity} onChange={(e) => setRequestQuantity(e.target.value)} required />
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setRequestItem(null)}>Cancel</button><button type="submit" className="primary-button">Submit request</button></div>
      </form></div>}
    </div>
  );
}
