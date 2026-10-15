import PropTypes from "prop-types";

const inputCls =
  "w-full rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

function OrderField({
  label = "Gösterim Sırası",
  value,
  onChange,
  helper = "1 en başta görünür. Boş bırakırsan içerik sona eklenir.",
  min = 1,
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        type="number"
        min={min}
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputCls}
        placeholder="Örn. 1"
      />
      {helper ? (
        <p className="text-xs text-slate-500 dark:text-slate-300">{helper}</p>
      ) : null}
    </div>
  );
}

OrderField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  helper: PropTypes.string,
  min: PropTypes.number,
};

export default OrderField;
