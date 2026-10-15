import React, { useMemo, useRef, useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import WindowControls from "#components/WindowControls.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import { resumeConfig } from "#constants";

if (typeof window !== "undefined" && pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

const ResumePdf = () => {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => setContainerWidth(el.clientWidth || 0);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    return Math.max(280, Math.floor(containerWidth - 32));
  }, [containerWidth]);

  const pages = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }, [numPages]);

  return (
    <div className="resume-pdf-viewer" ref={containerRef}>
      <Document
        file={resumeConfig.viewUrl}
        onLoadSuccess={({ numPages: nextNumPages }) => setNumPages(nextNumPages)}
        loading={<p className="resume-pdf-status">Loading resume...</p>}
        error={<p className="resume-pdf-status">Resume preview is unavailable.</p>}
        noData={<p className="resume-pdf-status">Resume preview is unavailable.</p>}
        externalLinkTarget="_blank"
        externalLinkRel="noopener noreferrer"
      >
        {pages.map((pageNumber) => (
          <Page
            key={pageNumber}
            pageNumber={pageNumber}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer
          />
        ))}
      </Document>
    </div>
  );
};

const Resume = () => {
  return (
    <>
      <div id="window-header">
        <WindowControls target="resume" />
        <h2>{resumeConfig.title}</h2>

        <a
          href={resumeConfig.downloadUrl}
          download
          className="cursor-pointer"
          title={resumeConfig.downloadTitle}
        >
          <Download className="icon" />
        </a>
      </div>

      <div className="resume-body">
        <ResumePdf />
      </div>
    </>
  );
};

const ResumeWindow = WindowWrapper(Resume, "resume");
export default ResumeWindow;
