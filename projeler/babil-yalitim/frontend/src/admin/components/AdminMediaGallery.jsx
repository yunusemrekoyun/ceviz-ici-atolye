import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";

const renderMedia = (item, className = "") => {
  if (!item?.src) {
    return (
      <div
        className={`grid place-items-center bg-slate-100 text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500 ${className}`}
      >
        Önizleme yok
      </div>
    );
  }

  if (item.type === "video") {
    return (
      <video
        src={item.src}
        className={className}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={item.src} alt={item.alt || ""} className={className} />;
};

const itemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  src: PropTypes.string,
  type: PropTypes.oneOf(["image", "video"]),
  alt: PropTypes.string,
  badge: PropTypes.string,
  removable: PropTypes.bool,
});

const GalleryModal = ({
  open,
  item,
  itemIndex,
  total,
  canMovePrev,
  canMoveNext,
  canRemove,
  onClose,
  onPrev,
  onNext,
  onMovePrev,
  onMoveNext,
  onRemove,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && total > 1) onPrev();
      if (event.key === "ArrowRight" && total > 1) onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrev, open, total]);

  if (!open || !item || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="admin-card relative w-full max-w-5xl p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800/70 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              Medya İncelemesi
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {item.badge || "Medya"} • {itemIndex + 1} / {total}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canMovePrev ? (
              <button
                type="button"
                onClick={onMovePrev}
                className="btn-admin-ghost"
              >
                Öncekiye taşı
              </button>
            ) : null}
            {canMoveNext ? (
              <button
                type="button"
                onClick={onMoveNext}
                className="btn-admin-ghost"
              >
                Sonrakiye taşı
              </button>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="btn-admin-danger"
              >
                Kaldır
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="btn-admin-ghost">
              Kapat
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950/95 dark:border-slate-800/70">
          {renderMedia(
            item,
            "max-h-[70vh] w-full bg-black object-contain"
          )}
        </div>

        {total > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={onPrev} className="btn-admin-ghost">
              Önceki medya
            </button>
            <button type="button" onClick={onNext} className="btn-admin-ghost">
              Sonraki medya
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

GalleryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  item: itemShape,
  itemIndex: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  canMovePrev: PropTypes.bool.isRequired,
  canMoveNext: PropTypes.bool.isRequired,
  canRemove: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onMovePrev: PropTypes.func.isRequired,
  onMoveNext: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const AdminMediaGallery = ({
  items,
  emptyText = "Henüz medya yok.",
  aspectClassName = "aspect-video",
  columnsClassName = "grid-cols-2 sm:grid-cols-3",
  onRemove,
  onMove,
}) => {
  const [activeId, setActiveId] = useState("");

  const activeIndex = useMemo(
    () => items.findIndex((item) => item.id === activeId),
    [activeId, items]
  );

  useEffect(() => {
    if (!activeId) return;
    if (items.some((item) => item.id === activeId)) return;
    setActiveId(items[0]?.id || "");
  }, [activeId, items]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
        {emptyText}
      </div>
    );
  }

  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  return (
    <>
      <div className={`grid gap-3 ${columnsClassName}`}>
        {items.map((item, index) => {
          const canMovePrev = typeof onMove === "function" && index > 0;
          const canMoveNext =
            typeof onMove === "function" && index < items.length - 1;
          const canRemove =
            typeof onRemove === "function" && item.removable !== false;

          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-950/55"
            >
              <button
                type="button"
                onClick={() => setActiveId(item.id)}
                className="block w-full text-left"
              >
                {renderMedia(
                  item,
                  `${aspectClassName} w-full object-cover bg-slate-100 dark:bg-slate-900`
                )}
              </button>

              <div className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {item.badge || "Medya"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sıra #{index + 1}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-1">
                  {canMovePrev ? (
                    <button
                      type="button"
                      onClick={() => onMove(item.id, -1)}
                      className="rounded-lg border border-slate-200/80 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                    >
                      Önceki
                    </button>
                  ) : null}
                  {canMoveNext ? (
                    <button
                      type="button"
                      onClick={() => onMove(item.id, 1)}
                      className="rounded-lg border border-slate-200/80 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                    >
                      Sonraki
                    </button>
                  ) : null}
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="rounded-lg bg-rose-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-rose-600"
                    >
                      Kaldır
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GalleryModal
        open={Boolean(activeItem)}
        item={activeItem}
        itemIndex={Math.max(activeIndex, 0)}
        total={items.length}
        canMovePrev={activeIndex > 0}
        canMoveNext={activeIndex > -1 && activeIndex < items.length - 1}
        canRemove={Boolean(activeItem) && typeof onRemove === "function" && activeItem.removable !== false}
        onClose={() => setActiveId("")}
        onPrev={() =>
          setActiveId(items[(activeIndex - 1 + items.length) % items.length]?.id || "")
        }
        onNext={() =>
          setActiveId(items[(activeIndex + 1) % items.length]?.id || "")
        }
        onMovePrev={() => activeItem && onMove?.(activeItem.id, -1)}
        onMoveNext={() => activeItem && onMove?.(activeItem.id, 1)}
        onRemove={() => {
          if (!activeItem || !onRemove) return;
          onRemove(activeItem.id);
          const nextItems = items.filter((item) => item.id !== activeItem.id);
          setActiveId(nextItems[0]?.id || "");
        }}
      />
    </>
  );
};

AdminMediaGallery.propTypes = {
  items: PropTypes.arrayOf(itemShape).isRequired,
  emptyText: PropTypes.string,
  aspectClassName: PropTypes.string,
  columnsClassName: PropTypes.string,
  onRemove: PropTypes.func,
  onMove: PropTypes.func,
};

export default AdminMediaGallery;
