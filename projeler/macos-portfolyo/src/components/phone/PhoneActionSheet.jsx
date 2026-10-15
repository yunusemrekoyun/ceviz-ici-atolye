import React, { useEffect } from "react";
import clsx from "clsx";

const PhoneActionSheet = ({
  open = false,
  title,
  message,
  actions = [],
  cancelLabel = "Cancel",
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const handleClose = () => onClose?.();

  return (
    <div
      className={clsx("phone-action-sheet", open ? "is-open" : "is-closed")}
      role={open ? "dialog" : undefined}
      aria-modal={open ? "true" : undefined}
      aria-hidden={open ? undefined : "true"}
      aria-label={open ? title || "Actions" : undefined}
    >
      <button
        type="button"
        className="phone-action-sheet-backdrop"
        onClick={handleClose}
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        disabled={!open}
      />

      <div className="phone-action-sheet-panel">
        <div className="phone-action-sheet-card">
          {title || message ? (
            <div className="phone-action-sheet-header">
              {title ? <p className="phone-action-sheet-title">{title}</p> : null}
              {message ? (
                <p className="phone-action-sheet-message">{message}</p>
              ) : null}
            </div>
          ) : null}

          <div className="phone-action-sheet-actions">
            {actions.map((action) => (
              <button
                key={action.id ?? action.label}
                type="button"
                className={clsx(
                  "phone-action-sheet-action",
                  action.destructive && "is-destructive"
                )}
                onClick={() => {
                  action.onPress?.();
                  handleClose();
                }}
                disabled={!open || action.disabled}
                tabIndex={open ? 0 : -1}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="phone-action-sheet-cancel"
          onClick={handleClose}
          disabled={!open}
          tabIndex={open ? 0 : -1}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
};

export default PhoneActionSheet;
