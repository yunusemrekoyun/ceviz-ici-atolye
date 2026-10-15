import { useEffect, useRef, useState } from "react";

import ProfilePanel from "#components/ProfilePanel.jsx";
import WifiPanel from "#components/WifiPanel.jsx";
import { desktopNotificationsConfig, navbarConfig, navIcons, navLinks } from "#constants";
import useWindowStore from "#store/window.js";
const Navbar = () => {
  const openWindow = useWindowStore((state) => state.openWindow);
  const [isWifiOpen, setIsWifiOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const wifiButtonRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleNavIconClick = (id) => {
    if (id === 1) {
      setIsWifiOpen((prev) => !prev);
      setIsProfileOpen(false);
    }

    if (id === 3) {
      setIsProfileOpen((prev) => !prev);
      setIsWifiOpen(false);
    }

    if (id === 4) {
      setIsWifiOpen(false);
      setIsProfileOpen(false);
      window.dispatchEvent(new CustomEvent(desktopNotificationsConfig.restoreEvent));
    }
  };

  return (
    <nav>
      <div>
        <img className="nav-logo" src={navbarConfig.logo} alt="logo" />
        <p className="nav-brand">{navbarConfig.brand}</p>
        <ul>
          {navLinks.map(({ id, name, type }) => (
            <li key={id} onClick={() => openWindow(type)}>
              <p>{name}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative flex items-center">
        <ul>
          {navIcons.map(({ id, img }) => (
            <li key={id}>
              <button
                type="button"
                ref={id === 1 ? wifiButtonRef : id === 3 ? profileButtonRef : null}
                onClick={() => handleNavIconClick(id)}
                className="nav-icon-btn"
                data-notification-center={id === 4 ? "true" : undefined}
              >
                <img src={img} alt={`icon-${id}`} />
              </button>
            </li>
          ))}
        </ul>
        <time>
          {now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        <WifiPanel
          anchorRef={wifiButtonRef}
          isOpen={isWifiOpen}
          onClose={() => setIsWifiOpen(false)}
        />
        <ProfilePanel
          anchorRef={profileButtonRef}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      </div>
    </nav>
  );
};

export default Navbar;
