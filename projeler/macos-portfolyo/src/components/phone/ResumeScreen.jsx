import React from "react";
import { Download, ExternalLink } from "lucide-react";
import { resumeConfig } from "#constants";

const ResumeScreen = () => {
  return (
    <div className="phone-resume">
      <div className="phone-resume-nav" role="navigation" aria-label="Resume">
        <p className="phone-resume-title">{resumeConfig.title}</p>
        <div className="phone-resume-actions">
          <a
            className="phone-resume-action"
            href={resumeConfig.downloadUrl}
            download
            title={resumeConfig.downloadTitle}
            aria-label={resumeConfig.downloadTitle}
          >
            <Download size={18} aria-hidden />
          </a>
          <a
            className="phone-resume-action"
            href={resumeConfig.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <ExternalLink size={18} aria-hidden />
          </a>
        </div>
      </div>

      <div className="phone-resume-body">
        <iframe
          className="phone-resume-frame"
          title={resumeConfig.title}
          src={`${resumeConfig.viewUrl}#view=FitH`}
        />
      </div>
    </div>
  );
};

export default ResumeScreen;
