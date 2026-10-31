export function BrandShowcasePanel() {
  return (
    <aside className="login-brand-panel" aria-label="XORA Technologies">
      <div className="brand-logo-card">
        <img
          src="/xora_logo.svg"
          alt="XORA Technologies"
          className="brand-xora-hero-logo"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.indexOf(".svg") !== -1) {
              img.src = "/xora_logo.png";
            }
          }}
        />
      </div>
    </aside>
  );
}
