import React from "react";
import { Battery, Wifi } from "lucide-react";

const PhoneStatusBar = ({ now }) => {
  const timeText = (now ?? new Date()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="phone-status">
      <div className="phone-notch" />
      <p className="phone-clock">{timeText}</p>
      <div className="phone-status-icons">
        <Wifi size={18} />
        <Battery size={18} />
      </div>
    </div>
  );
};

export default PhoneStatusBar;

