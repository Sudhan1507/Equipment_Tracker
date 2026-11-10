import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export default function DataTable({
  columns,
  rows,
  rowKey,
  loading = false,
  searchPlaceholder = "Search records...",
  emptyMessage = "No records found.",
  actions,
}) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((column) => {
        const value = column.searchableValue
          ? column.searchableValue(row)
          : String(row[column.key] ?? "");
        return String(value).toLowerCase().includes(q);
      })
    );
  }, [columns, rows, query]);

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div className="table-count"><strong>{filteredRows.length}</strong> records</div>
        <label className="table-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
        </label>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.header}</th>)}
              {actions && <th className="actions-heading">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="table-message">Loading records...</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="table-message">{emptyMessage}</td></tr>
            ) : filteredRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                  </td>
                ))}
                {actions && <td className="row-actions">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">Showing {filteredRows.length} of {rows.length} records</div>
    </div>
  );
}
