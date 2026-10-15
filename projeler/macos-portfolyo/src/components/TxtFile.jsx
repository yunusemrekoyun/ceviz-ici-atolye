import React from "react";
import WindowControls from "#components/WindowControls.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import useWindowStore from "#store/window.js";

const TxtFile = () => {
  const data = useWindowStore((state) => state.windows.txtfile.data);

  if (!data) return null;

  const content = Array.isArray(data.description)
    ? data.description
    : data.description
    ? [data.description]
    : [];

  return (
    <>
      <div id="window-header">
        <WindowControls target="txtfile" />
        <h2>{data.name}</h2>
      </div>

      <div className="p-5 space-y-3 text-sm text-gray-700">
        {data.subtitle && (
          <p className="text-xs text-gray-500">{data.subtitle}</p>
        )}

        {content.length ? (
          <ul className="space-y-2">
            {content.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>No content available.</p>
        )}
      </div>
    </>
  );
};

const TxtFileWindow = WindowWrapper(TxtFile, "txtfile");

export default TxtFileWindow;
