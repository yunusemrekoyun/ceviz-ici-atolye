import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { profilePanelContent } from "#constants";

const ProfilePanel = ({ anchorRef, isOpen, onClose }) => {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 420 });

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
    const baseWidth = panelRect.width || 420;
    const panelWidth = Math.min(baseWidth, window.innerWidth - 24);
    const panelHeight = panelRect.height || 240;
    const padding = 12;

    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const idealLeft = buttonCenterX - panelWidth / 2;
    const maxLeft = window.innerWidth - panelWidth - padding;
    const left = Math.min(Math.max(idealLeft, padding), maxLeft);

    const idealTop = buttonRect.bottom + padding;
    const maxTop = window.innerHeight - panelHeight - padding;
    const top = Math.min(Math.max(idealTop, padding), maxTop);

    setPos({ top, left, width: panelWidth });
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="profile-panel"
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${pos.width}px`,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
              {profilePanelContent.sectionLabel}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
              {profilePanelContent.name}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {profilePanelContent.description}
            </p>
          </div>
          <div className="profile-video">
            <video
              src={profilePanelContent.videoSrc}
              playsInline
              muted
              autoPlay
              loop
              className="w-full h-full object-cover rounded-xl"
              aria-label={profilePanelContent.videoAriaLabel}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {profilePanelContent.chips.map((pill) => (
            <span key={pill} className="profile-chip">
              {pill}
            </span>
          ))}
        </div>

        <div className="profile-cta">
          <p className="text-xs text-blue-50">
            {profilePanelContent.cta}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
