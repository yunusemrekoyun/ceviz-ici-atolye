import { useNavigate } from "react-router-dom";
import { AuthAPI } from "../../lib/api";

export default function AdminTopBar() {
  const nav = useNavigate();

  const handleLogout = async () => {
    try {
      await AuthAPI.logout();
    } catch {
      // hata olsa da logout’u zorla
    }
    nav("/admin", { replace: true });
  };

  return (
    <div className="mb-6 flex items-center justify-end gap-3">
      <button
        onClick={() => nav("/")}
        className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-2"
      >
        Ana Sayfa
      </button>
      <button
        onClick={() => nav("/admin/home")}
        className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-2"
      >
        Yönetim
      </button>
      <button
        onClick={handleLogout}
        className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-2 text-sm text-red-400 hover:bg-surface-2"
      >
        Çıkış
      </button>
    </div>
  );
}
