import PropTypes from "prop-types";

function OrderSelect({ value, max, onChange, disabled = false, className = "" }) {
  const total = Math.max(1, Number(max) || 1);

  return (
    <select
      value={String(value || 1)}
      onChange={(event) => onChange(Number(event.target.value))}
      disabled={disabled}
      className={`rounded-xl border border-slate-200/70 bg-white/80 px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30 ${className}`}
      aria-label="Gösterim sırası"
    >
      {Array.from({ length: total }, (_, index) => {
        const order = index + 1;
        return (
          <option key={order} value={order}>
            #{order}
          </option>
        );
      })}
    </select>
  );
}

OrderSelect.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  max: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default OrderSelect;
