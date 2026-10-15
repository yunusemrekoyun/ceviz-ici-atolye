import PropTypes from "prop-types";

const LoadErrorState = ({
  title = "İçerik yüklenemedi",
  message,
  onRetry,
  retryLabel = "Tekrar dene",
}) => (
  <div className="admin-card p-6 sm:p-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
          Yükleme Hatası
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </div>
      {typeof onRetry === "function" ? (
        <button type="button" onClick={onRetry} className="btn-admin-ghost">
          {retryLabel}
        </button>
      ) : null}
    </div>
  </div>
);

LoadErrorState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
};

export default LoadErrorState;
