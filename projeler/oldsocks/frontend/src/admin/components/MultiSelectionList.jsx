import { useMemo, useState } from "react";

export default function MultiSelectionList({
  options,
  value,
  onChange,
  label,
  itemName = "öğe",
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const selectedIds = useMemo(() => [...new Set(value.map(String))], [value]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const visibleOptions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("tr-TR");
    return options.filter((item) => {
      if (selectedOnly && !selectedSet.has(String(item._id))) return false;
      if (!search) return true;
      return [item.name, item.color].some((part) =>
        String(part || "").toLocaleLowerCase("tr-TR").includes(search)
      );
    });
  }, [options, query, selectedOnly, selectedSet]);

  const visibleIds = visibleOptions.map((item) => String(item._id));
  const selectedVisibleCount = visibleIds.filter((id) => selectedSet.has(id)).length;

  const toggle = (id) => {
    onChange(
      selectedSet.has(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  };

  const selectVisible = () => onChange([...new Set([...selectedIds, ...visibleIds])]);
  const removeVisible = () => {
    const visibleSet = new Set(visibleIds);
    onChange(selectedIds.filter((id) => !visibleSet.has(id)));
  };

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-900">{label}</legend>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="İsimle ara"
          aria-label={`${label} içinde ara`}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="button"
          aria-pressed={selectedOnly}
          onClick={() => setSelectedOnly((current) => !current)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${selectedOnly ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-800 hover:bg-gray-50"}`}
        >
          Seçilenleri göster
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectVisible} disabled={!visibleIds.length || selectedVisibleCount === visibleIds.length} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
          Görünenleri seç
        </button>
        <button type="button" onClick={removeVisible} disabled={!selectedVisibleCount} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
          Görünenleri kaldır
        </button>
        <button type="button" onClick={() => onChange([])} disabled={!selectedIds.length} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
          Tümünü temizle
        </button>
        <span className="ml-auto text-xs text-gray-700" aria-live="polite">
          {selectedIds.length} seçili · {visibleOptions.length} gösteriliyor
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-300 bg-white p-1">
        {visibleOptions.length ? visibleOptions.map((item) => {
          const id = String(item._id);
          return (
            <label key={id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-900 hover:bg-gray-50">
              <input type="checkbox" checked={selectedSet.has(id)} onChange={() => toggle(id)} className="h-4 w-4 shrink-0 accent-gray-900" />
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                {item.color && <span className="block text-xs text-gray-600">{item.color}</span>}
              </span>
            </label>
          );
        }) : (
          <p className="px-3 py-5 text-sm text-gray-700">
            {query || selectedOnly ? "Aramaya uyan öğe yok." : `Seçilecek ${itemName} bulunamadı.`}
          </p>
        )}
      </div>
    </fieldset>
  );
}
