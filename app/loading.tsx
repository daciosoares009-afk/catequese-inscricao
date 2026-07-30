export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="sr-only">Carregando página...</span>
      <div className="page-loading-heading">
        <i />
        <i />
      </div>
      <div className="page-loading-toolbar" />
      <div className="page-loading-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="page-loading-card" key={index}>
            <i />
            <i />
            <i />
          </div>
        ))}
      </div>
    </div>
  );
}
