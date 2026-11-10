export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">WORKSPACE</span><h1>{title}</h1><p>{description}</p></div></div>
      <div className="info-panel"><h3>Prototype page</h3><p>This page is ready for its reusable table and the matching Express API integration.</p></div>
    </div>
  );
}
