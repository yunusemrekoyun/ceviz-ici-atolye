import React from "react";
import clsx from "clsx";
import { Search } from "lucide-react";

import WindowControls from "#components/WindowControls.jsx";
import { useContent } from "#components/ContentProvider.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import useLocationStore from "#store/location.js";
import useWindowStore from "#store/window.js";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const Finder = () => {
  const openWindow = useWindowStore((state) => state.openWindow);
  const { locations, findFolderLocationById } = useContent();
  const activeLocationId = useLocationStore((state) => state.activeLocationId);
  const setActiveLocationId = useLocationStore((state) => state.setActiveLocationId);
  const activeLocation =
    findFolderLocationById(activeLocationId) ?? locations.work ?? null;
  const openItem = (item) => {
    if (item.fileType === "pdf") return openWindow("resume");
    if (item.kind === "folder") return setActiveLocationId(item.id);
    const href = normalizeExternalUrl(item.href || item.url);
    if (item.fileType === "url" && href)
      return window.open(href, "_blank", "noopener,noreferrer");

    openWindow(`${item.fileType}${item.kind}`, item);
  };
  const renderList = (name, items) => (
    <div>
      <h3>{name}</h3>

      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            onClick={() => setActiveLocationId(item.id)}
            className={clsx(
              item.id === activeLocationId ? "active" : "not-active"
            )}
          >
            <img src={item.icon} className="w-4" alt={item.name} />

            <p className="text-sm font-medium truncate">{item.name} </p>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <div id="window-header">
        <WindowControls target="finder" />
        <Search className="icon" />
      </div>

      <div className="bg-white flex h-full">
        <div className="sidebar">
          {renderList("Favorites", Object.values(locations))}
          {renderList("Work", locations.work.children)}
        </div>
        <ul className="content">
          {activeLocation?.children?.map((item) => (
            <li
              key={item.id}
              className={item.position}
              onClick={() => openItem(item)}
            >
              <img src={item.icon} alt={item.name} />
              <p>{item.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

const FinderWindow = WindowWrapper(Finder, "finder");

export default FinderWindow;
