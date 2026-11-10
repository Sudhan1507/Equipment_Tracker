import { useEffect, useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import DataTable from "../components/DataTable";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function getRequestStatus(row) {
  return String(row.req_status ?? "")
    .trim()
    .toUpperCase();
}

function statusBadge(status) {
  const normalized = String(status || "PENDING").toLowerCase();
  return (
    <span className={`status-pill request-status status-${normalized}`}>
      {status || "PENDING"}
    </span>
  );
}

export default function RequestsPage({ mode = "all" }) {
  const { isDemo } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(
        mode === "mine" ? "/api/requests/mine" : "/api/requests",
      );
      const payload = response.data?.data ?? response.data;
      const requests = Array.isArray(payload)
        ? payload
        : (payload?.requests ?? payload?.items);
      if (Array.isArray(requests)) {
        setRows(
          mode === "returns"
            ?requests.filter(
  (item) => getRequestStatus(item) === "APPROVED"
)
            : requests,
        );
      }
    } catch (err) {
      if (!isDemo)
        setError(
          err?.response?.data?.message ||
            "Could not load requests. Showing sample data.",
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, [mode]);


async function updateRequest(row, action) {
  setError("");
  setNotice("");

  try {
    if (isDemo) {
      const status =
        action === "approve"
          ? "APPROVED"
          : action === "reject"
            ? "REJECTED"
            : "RETURNED";

      setRows((prev) =>
        prev
          .map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status,
                  req_status: status,
                  returned_quantity:
                    action === "return"
                      ? Number(item.returned_quantity || 0) +
                        Number(item.returnQuantity || 0)
                      : item.returned_quantity,
                }
              : item,
          )
          .filter(
            (item) =>
              mode !== "returns" ||
              getRequestStatus(item) === "APPROVED",
          ),
      );
    } else {
      if (action === "return") {
        const approvedQuantity = Number(row.approved_quantity || 0);
        const returnedQuantity = Number(row.returned_quantity || 0);
        const remainingQuantity = approvedQuantity - returnedQuantity;

        if (remainingQuantity <= 0) {
          setError("No remaining quantity to return.");
          return;
        }

        const input = window.prompt(
          `Enter the quantity being returned (1–${remainingQuantity}):`,
          String(remainingQuantity),
        );

        if (input === null) return;

        const quantity = Number(input);

        if (
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > remainingQuantity
        ) {
          setError(`Enter a whole number between 1 and ${remainingQuantity}.`);
          return;
        }

        await api.patch(`/api/requests/${row.id}/return`, {
          quantity,
        });
      } else {
        await api.patch(`/api/requests/${row.id}/${action}`);
      }

      await loadRequests();
    }

    setNotice(
      action === "return"
        ? `Return recorded for request ${row.equipment_name}.`
        : `Request ${row.equipment_name}: ${action} successful.`,
    );
  } catch (err) {
    setError(
      err?.response?.data?.message || `Could not ${action} request.`,
    );
  }
}


  const columns = [
    {
      key: "equipment_name",
      header: "Equipment",
      searchableValue: (row) =>
        row.equipment_name ?? row.equipment?.equipment_name ?? "—",
      render: (row) =>
        row.equipment_name ?? row.equipment?.equipment_name ?? "—",
    },
{
  key: "quantity",
  header: mode === "returns" ? "Remaining Quantity" : "Requested Quantity",
  render: (row) => {
    if (mode === "returns") {
      return Math.max(
        0,
        Number(row.approved_quantity || 0) -
          Number(row.returned_quantity || 0)
      );
    }

    return row.requested_quantity ?? row.quantity ?? "—";
  },
},
    {
      key: "req_status",
      header: "Status",
      render: (row) => statusBadge(row.req_status),
    },
    {
      key: "created_at",
      header: "Submitted",
      render: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
    },
  ];

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CHECKOUT WORKFLOW</span>
          <h1>
            {mode === "mine"
              ? "My Requests"
              : mode === "returns"
                ? "Return Management"
                : "Request Management"}
          </h1>
          <p>
            {mode === "mine"
              ? "Track your submitted equipment requests."
              : mode === "returns"
                ? "Record returns for approved equipment requests."
                : "Review technician requests and process equipment returns."}
          </p>
        </div>
      </div>
      {notice && (
        <div className="success-banner">
          {notice}
          <button onClick={() => setNotice("")}>Dismiss</button>
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id ?? row.request_id)}
        loading={loading}
        searchPlaceholder="Search requests..."
        emptyMessage="No requests found."
        actions={
          mode !== "mine"
            ? (row) => (
                <div className="action-group">
                  {mode === "all" && getRequestStatus(row) === "PENDING" && (
                    <>
                      <button
                        className="table-action"
                        title="Approve"
                        onClick={() => updateRequest(row, "approve")}
                      >
                        <Check size={16} />
                      </button>

                      <button
                        className="table-action danger"
                        title="Reject"
                        onClick={() => updateRequest(row, "reject")}
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}

                  {(mode === "returns" || mode === "all") &&
                    getRequestStatus(row) === "APPROVED" && (
                      <button
                        className="table-action"
                        title="Record return"
                        onClick={() => updateRequest(row, "return")}
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                </div>
              )
            : undefined
        }
      />
    </div>
  );
}
