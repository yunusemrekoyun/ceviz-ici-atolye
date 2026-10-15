import React from "react";
import { Search as SearchIcon } from "lucide-react";

const HomeScreen = React.forwardRef(function HomeScreen({ apps = [], onOpenApp, dockRef }, ref) {
  return (
    <div className="phone-home" ref={ref}>
      <div className="phone-grid">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            className="phone-icon"
            data-app-id={app.id}
            onClick={(e) => onOpenApp?.(app.id, e.currentTarget.querySelector(".phone-icon-img"))}
          >
            <div className="phone-icon-img">
              <img src={app.icon} alt={app.label} />
            </div>
            <p>{app.label}</p>
          </button>
        ))}
      </div>
      <div className="phone-bottom">
        <div className="phone-search-pill">
          <SearchIcon size={16} />
          <span>Search</span>
        </div>
        <div className="phone-dock-row">
          <div className="phone-dock" ref={dockRef}>
            {apps.slice(0, 4).map((app) => (
              <button
                key={app.id}
                type="button"
                className="phone-dock-icon"
                data-app-id={app.id}
                onClick={(e) => onOpenApp?.(app.id, e.currentTarget)}
              >
                <img src={app.icon} alt={app.label} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default HomeScreen;
