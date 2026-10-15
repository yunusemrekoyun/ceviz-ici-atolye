import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ArrowUp,
  ChevronLeft,
  Pencil,
  Search,
  UserCircle2,
} from "lucide-react";
import { personalInfo, phoneMessagesConfig, resumeConfig } from "#constants";
import PhoneActionSheet from "#components/phone/PhoneActionSheet.jsx";
import { runIOSSlideTransition } from "#components/phone/phoneTransitions.js";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const MessagesScreen = ({ socials = [], techStack = [], onOpenContact }) => {
  const commandText = phoneMessagesConfig.commandText;
  const [route, setRoute] = useState("list"); // list | thread
  const [transition, setTransition] = useState(null); // { direction, from, to }
  const [searchQuery, setSearchQuery] = useState("");
  const [composerText, setComposerText] = useState("");
  const [pendingCommand, setPendingCommand] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [listEditing, setListEditing] = useState(false);
  const [sheet, setSheet] = useState({
    open: false,
    title: "",
    message: "",
    actions: [],
  });
  const [messages, setMessages] = useState(() => [
    {
      id: "m0",
      from: "them",
      type: "text",
      text: phoneMessagesConfig.initialMessage,
    },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const replyTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const stageRef = useRef(null);
  const listPanelRef = useRef(null);
  const threadPanelRef = useRef(null);
  const transitionTlRef = useRef(null);

  const threadName = phoneMessagesConfig.threadName;
  const threadAvatar = phoneMessagesConfig.threadAvatar;

  const isCommandSearch = normalizeText(searchQuery) === commandText;

  useEffect(() => {
    setAvatarFailed(false);
  }, [threadAvatar]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) {
        window.clearTimeout(replyTimerRef.current);
        replyTimerRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const openThread = () => {
    if (route === "thread" || transition) return;
    setSearchQuery("");
    setComposerText("");
    setListEditing(false);
    setTransition({ direction: "forward", from: route, to: "thread" });
    setRoute("thread");
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  };

  const backToList = () => {
    if (route === "list" || transition) return;
    setComposerText("");
    setTransition({ direction: "back", from: route, to: "list" });
    setRoute("list");
  };

  const closeSheet = () =>
    setSheet((prev) => ({
      ...prev,
      open: false,
    }));

  const openSheet = ({ title, message, actions }) =>
    setSheet({
      open: true,
      title: title ?? "",
      message: message ?? "",
      actions: Array.isArray(actions) ? actions : [],
    });

  const openContactCard = () => onOpenContact?.();

  const buildInfoCard = useMemo(() => {
    const email = personalInfo.email;
    const phoneNumber = personalInfo.phoneNumber;
    const resumeHref = resumeConfig.viewUrl;

    const github = socials.find((s) => /github/i.test(s?.text ?? ""))?.link ?? null;
    const linkedin = socials.find((s) => /linkedin/i.test(s?.text ?? ""))?.link ?? null;
    const youtube = socials.find((s) => /youtube/i.test(s?.text ?? ""))?.link ?? null;

    const links = [
      { id: "cv", label: phoneMessagesConfig.infoCard.linkCvLabel, href: resumeHref },
      github ? { id: "github", label: phoneMessagesConfig.infoCard.linkGithubLabel, href: github } : null,
      linkedin
        ? { id: "linkedin", label: phoneMessagesConfig.infoCard.linkLinkedInLabel, href: linkedin }
        : null,
      youtube ? { id: "youtube", label: phoneMessagesConfig.infoCard.linkYoutubeLabel, href: youtube } : null,
    ].filter(Boolean);

    const stackText = techStack
      .filter(Boolean)
      .map(({ category, items }) => {
        const list = Array.isArray(items) ? items.join(", ") : "";
        return list ? `${category}: ${list}` : null;
      })
      .filter(Boolean)
      .join(" | ");

    return {
      name: threadName,
      title: phoneMessagesConfig.infoCard.title,
      email,
      phoneNumber,
      links,
      stackText,
    };
  }, [socials, techStack, threadName]);

  const sendMessage = (payload) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMessages((prev) => [...prev, { id, ...payload }]);
  };

  const triggerInfoReply = () => {
    if (isReplying) return;
    setIsReplying(true);
    if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    replyTimerRef.current = window.setTimeout(() => {
      sendMessage({ from: "them", type: "card", card: buildInfoCard });
      setIsReplying(false);
      requestAnimationFrame(() => scrollToBottom());
    }, phoneMessagesConfig.replyDelayMs ?? 650);
  };

  const handleSend = (valueRaw) => {
    const value = String(valueRaw ?? "").trim();
    if (!value) return;

    sendMessage({ from: "me", type: "text", text: value });
    requestAnimationFrame(() => scrollToBottom());

    const normalized = normalizeText(value);
    if (normalized.includes(commandText)) {
      triggerInfoReply();
      return;
    }

    if (normalized) {
      setIsReplying(true);
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = window.setTimeout(() => {
        sendMessage({
          from: "them",
          type: "text",
          text: phoneMessagesConfig.replyHint,
        });
        setIsReplying(false);
        requestAnimationFrame(() => scrollToBottom());
      }, phoneMessagesConfig.hintDelayMs ?? 520);
    }
  };

  useEffect(() => {
    if (route !== "thread" || !pendingCommand) return;
    handleSend(pendingCommand);
    setPendingCommand(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCommand, route]);

  const renderBubble = (msg) => {
    const isMe = msg.from === "me";
    if (msg.type === "card") {
      const card = msg.card;
      return (
        <div key={msg.id} className={clsx("phone-messages-bubble", "is-incoming", "is-card")}>
          <div className="phone-messages-card">
            <div className="phone-messages-card-header">
              <div className="phone-messages-card-avatar" aria-hidden>
	                {!avatarFailed && threadAvatar ? (
	                  <img
	                    src={threadAvatar}
	                    alt=""
	                    decoding="async"
	                    fetchPriority="high"
	                    loading="eager"
	                    onError={() => setAvatarFailed(true)}
	                  />
	                ) : (
                  <UserCircle2 size={28} aria-hidden />
                )}
              </div>
              <div className="phone-messages-card-header-text">
                <p className="phone-messages-card-name">{card?.name ?? threadName}</p>
                <p className="phone-messages-card-title">{card?.title ?? ""}</p>
              </div>
            </div>

              <div className="phone-messages-card-links">
                {(card?.links ?? []).map((l) => (
                  <a
                    key={l.id}
                    className="phone-messages-card-link"
                    href={normalizeExternalUrl(l.href) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.label}
                  </a>
              ))}
            </div>

            <div className="phone-messages-card-section">
              <p className="phone-messages-card-section-title">{phoneMessagesConfig.infoCard.sectionContact}</p>
              <div className="phone-messages-card-rows">
                <a className="phone-messages-card-row" href={`mailto:${card?.email ?? ""}`}>
                  <span>{phoneMessagesConfig.infoCard.fieldEmail}</span>
                  <span className="value">{card?.email ?? ""}</span>
                </a>
                <a className="phone-messages-card-row" href={`tel:${card?.phoneNumber ?? ""}`}>
                  <span>{phoneMessagesConfig.infoCard.fieldPhone}</span>
                  <span className="value">{card?.phoneNumber ?? ""}</span>
                </a>
              </div>
            </div>

            {card?.stackText ? (
              <div className="phone-messages-card-section">
                <p className="phone-messages-card-section-title">{phoneMessagesConfig.infoCard.sectionSkills}</p>
                <p className="phone-messages-card-stack">{card.stackText}</p>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={clsx("phone-messages-bubble", isMe ? "is-outgoing" : "is-incoming")}>
        <p>
          {msg.text?.split?.(`"${commandText}"`)?.length > 1 ? (
            <>
              {msg.text.split(`"${commandText}"`)[0]}
              <span className="phone-messages-inline-command">"{commandText}"</span>
              {msg.text.split(`"${commandText}"`)[1]}
            </>
          ) : (
            msg.text
          )}
        </p>
      </div>
    );
  };

  const showListPanel =
    route === "list" || transition?.from === "list" || transition?.to === "list";
  const showThreadPanel =
    route === "thread" ||
    transition?.from === "thread" ||
    transition?.to === "thread";

  useLayoutEffect(() => {
    if (!transition) return undefined;

    const stageEl = stageRef.current;
    const listEl = listPanelRef.current;
    const threadEl = threadPanelRef.current;
    if (!stageEl || !listEl || !threadEl) return undefined;

    const fromEl = transition.from === "list" ? listEl : threadEl;
    const toEl = transition.to === "list" ? listEl : threadEl;

    if (transitionTlRef.current?.kill) {
      transitionTlRef.current.kill();
      transitionTlRef.current = null;
    }

    fromEl.style.display = "flex";
    toEl.style.display = "flex";
    fromEl.style.zIndex = "1";
    toEl.style.zIndex = "2";

    const tl = runIOSSlideTransition({
      stageEl,
      fromEl,
      toEl,
      direction: transition.direction,
      onComplete: () => {
        if (transition.to === "thread") {
          listEl.style.display = "none";
          threadEl.style.display = "flex";
        } else {
          threadEl.style.display = "none";
          listEl.style.display = "flex";
        }
        listEl.style.zIndex = "";
        threadEl.style.zIndex = "";
        setTransition(null);
      },
    });

    transitionTlRef.current = tl;

    return () => {
      if (tl?.kill) tl.kill();
      if (transitionTlRef.current === tl) transitionTlRef.current = null;
    };
  }, [transition]);

  return (
    <div className="phone-app phone-messages">
      <div
        ref={stageRef}
        className={clsx("phone-slide-stage", transition && "is-transitioning")}
      >
        <div
          ref={listPanelRef}
          className="phone-slide-panel"
          aria-hidden={!showListPanel}
          style={{ display: showListPanel ? "flex" : "none" }}
        >
          <div className="phone-messages-list-nav" role="navigation" aria-label="Messages">
            <button
              type="button"
              className="phone-messages-list-action"
              onClick={() => setListEditing((prev) => !prev)}
            >
              {listEditing ? "Done" : phoneMessagesConfig.editLabel}
            </button>
            <button
              type="button"
              className="phone-messages-list-compose"
              aria-label="Compose"
              onClick={() => {
                openSheet({
                  title: "New Message",
                  message: `Start a chat with ${threadName}.`,
                  actions: [
                    {
                      id: "new",
                      label: `Message ${threadName}`,
                      onPress: openThread,
                    },
                  ],
                });
              }}
            >
              <Pencil size={18} aria-hidden />
            </button>
          </div>

          <div className="phone-messages-list-scroll">
            <h3 className="phone-messages-large-title">{phoneMessagesConfig.listTitle}</h3>

            <div className="phone-messages-search">
              <div className="phone-messages-searchbox">
                <Search size={16} aria-hidden />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={phoneMessagesConfig.searchPlaceholder}
                  aria-label="Search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (!isCommandSearch) return;
                    e.preventDefault();
                    setPendingCommand(commandText);
                    openThread();
                  }}
                />
              </div>
            </div>

            <div className="phone-messages-threads" role="list">
              {isCommandSearch ? (
                <button
                  type="button"
                  className="phone-messages-thread phone-messages-thread--hint"
                  onClick={() => {
                    setPendingCommand(commandText);
                    openThread();
                  }}
                >
                  <div className="phone-messages-thread-avatar is-green" aria-hidden>
                    <span>i</span>
                  </div>
                  <div className="phone-messages-thread-main">
                    <div className="phone-messages-thread-top">
                      <p className="phone-messages-thread-name">{phoneMessagesConfig.infoCard.searchTopHitName}</p>
                      <p className="phone-messages-thread-time">{phoneMessagesConfig.infoCard.searchTopHitTime}</p>
                    </div>
                    <p className="phone-messages-thread-preview">
                      {phoneMessagesConfig.threadHintPreview}
                    </p>
                  </div>
                </button>
              ) : null}

              <button type="button" className="phone-messages-thread" onClick={openThread}>
                <div className="phone-messages-thread-avatar" aria-hidden>
	                  {!avatarFailed && threadAvatar ? (
	                    <img
	                      src={threadAvatar}
	                      alt=""
	                      decoding="async"
	                      fetchPriority="high"
	                      loading="eager"
	                      onError={() => setAvatarFailed(true)}
	                    />
	                  ) : (
                    <UserCircle2 size={28} aria-hidden />
                  )}
                </div>
                <div className="phone-messages-thread-main">
                  <div className="phone-messages-thread-top">
                    <p className="phone-messages-thread-name">{threadName}</p>
                    <p className="phone-messages-thread-time">{phoneMessagesConfig.threadNowLabel}</p>
                  </div>
                  <p className="phone-messages-thread-preview">
                    {phoneMessagesConfig.threadPreview}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div
          ref={threadPanelRef}
          className="phone-slide-panel"
          aria-hidden={!showThreadPanel}
          style={{ display: showThreadPanel ? "flex" : "none" }}
        >
          <div className="phone-messages-chat-nav" role="navigation" aria-label="Messages">
            <button type="button" className="phone-messages-chat-back" onClick={backToList}>
              <ChevronLeft size={18} aria-hidden />
              <span>{phoneMessagesConfig.backLabel}</span>
            </button>
            <button
              type="button"
              className="phone-messages-chat-title"
              onClick={() => {
                openSheet({
                  title: threadName,
                  message: phoneMessagesConfig.infoCard.title,
                  actions: [
                    { id: "contact", label: "View Contact", onPress: openContactCard },
                    {
                      id: "call",
                      label: "Call",
                      onPress: () => {
                        window.location.href = `tel:${personalInfo.phoneNumber}`;
                      },
                    },
                    {
                      id: "email",
                      label: "Email",
                      onPress: () => {
                        window.location.href = `mailto:${personalInfo.email}`;
                      },
                    },
                  ],
                });
              }}
            >
              <span className="phone-messages-chat-name">{threadName}</span>
            </button>
            <button
              type="button"
              className="phone-messages-chat-avatar"
              aria-label="Contact"
              onClick={openContactCard}
            >
	              {!avatarFailed && threadAvatar ? (
	                <img
	                  src={threadAvatar}
	                  alt=""
	                  decoding="async"
	                  fetchPriority="high"
	                  loading="eager"
	                  onError={() => setAvatarFailed(true)}
	                />
	              ) : (
                <UserCircle2 size={22} aria-hidden />
              )}
            </button>
          </div>

          <div className="phone-messages-chat-scroll" ref={scrollRef}>
            {messages.map(renderBubble)}
            {isReplying ? (
              <div className="phone-messages-bubble is-incoming is-typing" aria-label="Typing">
                <div className="phone-messages-typing-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="phone-messages-composer"
            onSubmit={(e) => {
              e.preventDefault();
              const value = composerText;
              if (!value.trim()) return;
              setComposerText("");
              handleSend(value);
            }}
          >
            <div className="phone-messages-composer-field">
              <input
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder={phoneMessagesConfig.messagePlaceholder}
                aria-label="Message"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
              />
            </div>
            <button
              type="submit"
              className={clsx("phone-messages-composer-send", !composerText.trim() && "is-disabled")}
              disabled={!composerText.trim()}
              aria-label={phoneMessagesConfig.sendAriaLabel}
            >
              <ArrowUp size={18} aria-hidden />
            </button>
          </form>
        </div>
      </div>

      <PhoneActionSheet
        open={sheet.open}
        title={sheet.title}
        message={sheet.message}
        actions={sheet.actions}
        onClose={closeSheet}
      />
    </div>
  );
};

export default MessagesScreen;
