import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Wifi, WifiOff } from "lucide-react";
import { wifiPanelContent } from "#constants";

const WifiPanel = ({ anchorRef, isOpen, onClose }) => {
  const panelRef = useRef(null);
  const baseWidth = 320;
  const [pos, setPos] = useState({ top: 0, left: 0, width: baseWidth });
  const [wifiEnabled, setWifiEnabled] = useState(
    () => String(wifiPanelContent.status ?? "").toLowerCase() !== "off"
  );

  const statusText = useMemo(() => {
    if (!wifiEnabled) return "Off";
    return wifiPanelContent.status;
  }, [wifiEnabled]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !isOpen ||
        panelRef.current?.contains(e.target) ||
        anchorRef.current?.contains(e.target)
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || !panelRef.current) return;

    const buttonRect = anchorRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    const panelWidth = Math.min(panelRect.width || baseWidth, window.innerWidth - 24);
    const panelHeight = panelRect.height || 120;
    const padding = 12;

    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const idealLeft = buttonCenterX - panelWidth / 2;
    const maxLeft = window.innerWidth - panelWidth - padding;
    const left = Math.min(Math.max(idealLeft, padding), maxLeft);

    const idealTop = buttonRect.bottom + padding;
    const maxTop = window.innerHeight - panelHeight - padding;
    const top = Math.min(Math.max(idealTop, padding), maxTop);

    setPos({ top, left, width: panelWidth });
  }, [anchorRef, baseWidth, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="wifi-panel"
      ref={panelRef}
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        maxWidth: "calc(100vw - 24px)",
        width: `${pos.width || baseWidth}px`,
      }}
    >
      <div className="wifi-panel-inner">
        <div className="wifi-panel-header">
          <div className="wifi-panel-title">
            <span className={clsx("wifi-panel-badge", wifiEnabled && "is-on")} aria-hidden>
              {wifiEnabled ? <Wifi size={16} /> : <WifiOff size={16} />}
            </span>
            <div className="wifi-panel-title-text">
              <p className="wifi-panel-title-label">{wifiPanelContent.title}</p>
              <p className="wifi-panel-title-status">{statusText}</p>
            </div>
          </div>

          <button
            type="button"
            className={clsx("wifi-panel-switch", wifiEnabled && "is-on")}
            role="switch"
            aria-checked={wifiEnabled}
            aria-label="Toggle Wi-Fi"
            onClick={() => setWifiEnabled((prev) => !prev)}
          >
            <span className="wifi-panel-switch-knob" aria-hidden />
          </button>
        </div>

        <div className="wifi-panel-group">
          <div
            className={clsx(
              "wifi-panel-row",
              wifiEnabled ? "is-connected" : "is-disabled"
            )}
          >
            <div className="wifi-panel-row-left">
              <span className="wifi-panel-row-icon" aria-hidden>
                <Wifi size={16} />
              </span>
              <div className="wifi-panel-row-text">
                <p className="wifi-panel-row-name">{wifiPanelContent.networkName}</p>
                <p className="wifi-panel-row-sub">
                  {wifiEnabled ? wifiPanelContent.band : "Not connected"}
                </p>
              </div>
            </div>

            <div className="wifi-panel-row-right">
              {wifiEnabled ? <Check size={16} aria-hidden /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WifiPanel;
