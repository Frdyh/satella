const statusStyles = {
  pendiente: 'bg-[#f7ecd0] text-[#886817] dark:bg-[#493d20] dark:text-[#e4c25e]',
  preparando: 'bg-[#f7ecd0] text-[#886817] dark:bg-[#493d20] dark:text-[#e4c25e]',
  'en cola': 'bg-[#f7ecd0] text-[#886817] dark:bg-[#493d20] dark:text-[#e4c25e]',
  confirmado: 'bg-[#e7e9fa] text-[#5b5f9c] dark:bg-[#30345d] dark:text-[#b9b9ef]',
  'en ruta': 'bg-[#e7e9fa] text-[#5b5f9c] dark:bg-[#30345d] dark:text-[#b9b9ef]',
  transit: 'bg-[#e7e9fa] text-[#5b5f9c] dark:bg-[#30345d] dark:text-[#b9b9ef]',
  entregado: 'bg-[#e2f0e4] text-[#547557] dark:bg-[#263c2b] dark:text-[#9dcc9f]',
  delivered: 'bg-[#e2f0e4] text-[#547557] dark:bg-[#263c2b] dark:text-[#9dcc9f]',
  activo: 'bg-[#e2f0e4] text-[#547557] dark:bg-[#263c2b] dark:text-[#9dcc9f]',
  'stock bajo': 'bg-[#f7ecd0] text-[#886817] dark:bg-[#493d20] dark:text-[#e4c25e]',
  cancelado: 'bg-[#f0e2e2] text-[#755454] dark:bg-[#3c2626] dark:text-[#dc9d9d]',
  retraso: 'bg-[#f0e2e2] text-[#755454] dark:bg-[#3c2626] dark:text-[#dc9d9d]',
};

export default function StatusBadge({ estado }) {
  const normalized = (estado || '').toLowerCase();
  const styles = statusStyles[normalized] || statusStyles.pendiente;

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold capitalize ${styles}`}>
      {estado}
    </span>
  );
}
