export default function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-5 mb-7">
      <div>
        <div className="text-[11px] uppercase tracking-[0.09em] text-[var(--secondary)] font-bold mb-1.5">
          {eyebrow}
        </div>
        <h1 className="font-display text-[34px] m-0 mb-1">{title}</h1>
        {subtitle && <p className="m-0 text-text-secondary text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
