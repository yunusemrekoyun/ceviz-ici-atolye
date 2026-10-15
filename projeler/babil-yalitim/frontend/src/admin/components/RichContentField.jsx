import { useRef, useState } from "react";
import PropTypes from "prop-types";

const toolbarButtonCls =
  "inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-500";

const labelCls = "block text-sm font-semibold text-slate-700 dark:text-slate-200";

const RichContentField = ({
  label,
  value,
  onChange,
  placeholder,
  inputClassName,
  errorText = "",
  invalid = false,
  rows = 10,
  required = false,
  onTogglePreview,
  showPreview,
}) => {
  const textareaRef = useRef(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [videoInput, setVideoInput] = useState("");

  const insertAtCursor = (snippet) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(snippet);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsPrefix = before && !before.endsWith("\n\n") ? "\n\n" : "";
    const needsSuffix = after && !after.startsWith("\n\n") ? "\n\n" : "";
    const next = `${before}${needsPrefix}${snippet}${needsSuffix}${after}`;

    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const caret = before.length + needsPrefix.length + snippet.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  const insertLink = () => {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) return;

    const labelText = linkText.trim() || trimmedUrl;
    const canUseMarkdown =
      labelText === trimmedUrl ||
      (!/[[\]\n]/.test(labelText) && !/[\n]/.test(trimmedUrl));

    if (labelText === trimmedUrl) {
      insertAtCursor(trimmedUrl);
    } else if (canUseMarkdown) {
      insertAtCursor(`[${labelText}](${trimmedUrl})`);
    } else {
      insertAtCursor(
        `<a href="${trimmedUrl}" target="_blank" rel="noopener noreferrer">${labelText}</a>`
      );
    }

    setLinkUrl("");
    setLinkText("");
    setShowLinkForm(false);
  };

  const insertVideo = () => {
    const trimmed = videoInput.trim();
    if (!trimmed) return;
    insertAtCursor(trimmed);
    setVideoInput("");
    setShowVideoForm(false);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className={labelCls}>{label}</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowLinkForm((prev) => !prev);
              setShowVideoForm(false);
            }}
            className={toolbarButtonCls}
          >
            URL ekle
          </button>
          <button
            type="button"
            onClick={() => {
              setShowVideoForm((prev) => !prev);
              setShowLinkForm(false);
            }}
            className={toolbarButtonCls}
          >
            YouTube ekle
          </button>
          <button
            type="button"
            onClick={onTogglePreview}
            className={toolbarButtonCls}
          >
            {showPreview ? "Önizlemeyi gizle" : "Önizleme göster"}
          </button>
        </div>
      </div>

      {showLinkForm && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/50">
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
            <input
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://ornek.com"
              className={inputClassName}
            />
            <input
              type="text"
              value={linkText}
              onChange={(event) => setLinkText(event.target.value)}
              placeholder="Link metni (opsiyonel)"
              className={inputClassName}
            />
            <button
              type="button"
              onClick={insertLink}
              className="btn-admin-primary"
            >
              Ekle
            </button>
          </div>
        </div>
      )}

      {showVideoForm && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/50">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea
              value={videoInput}
              onChange={(event) => setVideoInput(event.target.value)}
              rows={3}
              className={inputClassName}
              placeholder="YouTube URL veya iframe kodu yapıştırın"
            />
            <button
              type="button"
              onClick={insertVideo}
              className="btn-admin-primary self-start"
            >
              Ekle
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
            URL tek başına satırda bırakılırsa otomatik video embed’e çevrilir.
          </p>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className={inputClassName}
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid}
      />
      {errorText ? (
        <p className="text-xs text-rose-600 dark:text-rose-300">{errorText}</p>
      ) : null}
    </div>
  );
};

RichContentField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  inputClassName: PropTypes.string.isRequired,
  errorText: PropTypes.string,
  invalid: PropTypes.bool,
  rows: PropTypes.number,
  required: PropTypes.bool,
  onTogglePreview: PropTypes.func.isRequired,
  showPreview: PropTypes.bool.isRequired,
};

export default RichContentField;
