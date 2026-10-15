import PropTypes from "prop-types";

const AdminLoadingState = ({
  title = "İçerik yükleniyor",
  message = "Lütfen bekleyin, veriler hazırlanıyor.",
}) => (
  <div className="admin-card p-6 sm:p-7">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
          Yükleniyor
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-300" />
        Hazırlanıyor…
      </div>
    </div>
  </div>
);

AdminLoadingState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
};

export default AdminLoadingState;
