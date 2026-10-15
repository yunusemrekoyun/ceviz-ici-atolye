// src/constants/index.js (or wherever your index.js lives)

// ✅ Only text/content updated to be about YOU (Yunus Emre Koyun).
// ✅ Image/video/pdf paths kept as-is (per your request), except a tiny path bugfix: foldersApp now starts with "/".

const assets = {
  images: {
    wallpaper: "/images/wallpaper.png",
    logo: "/images/logo.svg",
    avatar: "/images/yunus.jpg",
    folder: "/images/folder.png",
    finderApp: "/images/finder.png",
    photosApp: "/images/photos.png",
    messagesApp: "/images/messages.svg",
    contactApp: "/images/contact.png",
    contactAppPhone: "/images/contacts.svg",
    terminalApp: "/images/terminal.png",
    settingsApp: "/images/settings.svg",
    pdfApp: "/images/pdf.png",
    safariApp: "/images/safari.png",

    // ✅ path bugfix (was "images/files.svg")
    foldersApp: "/images/files.svg",

    photosAppPhone: "/images/photoss.png",
    phoneApp: "/images/phone.svg",
  },
  icons: {
    wifi: "/icons/wifi.svg",
    search: "/icons/search.svg",
    user: "/icons/user.svg",
    mode: "/icons/mode.svg",
    github: "/icons/github.svg",
    linkedin: "/icons/linkedin.svg",
    youtube: "/icons/youtube.svg",
    atom: "/icons/atom.svg",
  },
  files: {
    resumePdf: "/files/resume.pdf",
  },
  videos: {
    memojiProfile: "/videos/memoji.mp4",
    memojiContactCard: "/videos/memoji_contact_card.mp4",
  },
};

const personalInfo = {
  name: "Yunus Emre Koyun",
  email: "yunusemrekoyun26@gmail.com",

  phoneNumber: "+905428928236",
  phoneDisplay: "+90 542 892 82 36",

  avatar: assets.images.avatar,
  role: "Full-stack Developer",
};

const navbarConfig = {
  brand: "Yunus Emre Koyun • Portfolio OS",
  logo: assets.images.logo,
};

const welcomeCopy = {
  subtitle: "Hi, I’m Yunus Emre",
  title: "Welcome!",
};

const wifiPanelContent = {
  title: "Wi-Fi",
  status: "Connected",
  networkName: "Yunus Emre Koyun’s Network",
  band: "5 GHz",
};

const profilePanelContent = {
  sectionLabel: "About",
  name: personalInfo.name,
  description:
    "Full-stack developer building real-world MERN products with a focus on clean UI, fast performance, and maintainable code. I enjoy turning ideas into smooth, interactive experiences.",
  videoSrc: assets.videos.memojiProfile,
  videoAriaLabel: "Memoji of Yunus waving",
  chips: [
    "Turkey | Remote friendly",
    "React / Node.js / MongoDB",
    "UI/UX + Performance",
  ],
  cta: "I’m open to freelance work and full-time roles. If you want a product that feels premium and works flawlessly, let’s build it.",
};

const desktopContactContent = {
  windowTitle: "Contact Me",
  avatarSrc: personalInfo.avatar,
  avatarAlt: personalInfo.name,
  title: "Let’s Connect",
  description:
    "Have a project idea, a feature to ship, or a bug to squash? Message me — I’m in.",
  email: personalInfo.email,
};

const persistenceConfig = {
  windowStorageKey: "macos_portfolio_windows_v1",
  locationStorageKey: "macos_portfolio_location_v1",
  debounceMs: 120,
};

const desktopNotificationsConfig = {
  storageKey: "portfolio_os_dismissed_notifications_v1",
  initialShowDelayMs: 900,
  autoRestoreDelayMs: 700,
  restoreEvent: "desktop-notifications:restore",
  notifications: [
    {
      id: "projects",
      icon: assets.images.finderApp,
      title: "Projects",
      message:
        'Click "Projects" in the menu bar (or open Finder) to browse my work like a real macOS desktop.',
      windowKey: "finder",
    },
    {
      id: "skills",
      icon: assets.images.terminalApp,
      title: "Skills",
      message:
        'Open "Skills" from the Dock to explore my stack — try interacting with the terminal-style UI.',
      windowKey: "terminal",
    },
    {
      id: "phone-mirroring",
      icon: assets.images.phoneApp,
      title: "Phone Mirroring",
      message:
        "Open Phone Mirroring from the Dock to see the iOS experience inside a desktop window.",
      windowKey: "phone",
    },
  ],
};

const desktopContactQuickActions = [
  { id: "message", label: "Send Message", type: "sms" },
  { id: "mail", label: "Send Mail", type: "mailto" },
  { id: "share", label: "Share Contact", type: "action" },
  { id: "block", label: "Block Contact", type: "action" },
];

const resumeConfig = {
  title: "Resume.pdf",
  filePath: assets.files.resumePdf,
  viewUrl: "/api/resume/file",
  downloadUrl: "/api/resume/file?download=1",
  downloadTitle: "Download resume",
};

const uiConfig = {
  enableWindowScroll: true,
  windowViewportPadding: 12,
  topSafeAreaSelector: "nav",
  windowsWithoutTransforms: ["resume"],
  windowsWithoutWindowScroll: [],
  windowsWithoutResize: ["phone"],
  windowResizeMinWidth: 320,
  windowResizeMinHeight: 240,
};

const phoneContactSheetConfig = {
  title: "Contact",
  message: "This is a demo contact card.",
  actions: {
    share: "Share Contact",
    resume: "Open Resume.pdf",
  },
};

const phoneFinderOptionsSheetConfig = {
  title: "Options",
  actions: {
    browseLocations: "Browse Locations",
    clearSearch: "Clear Search",
    copyPath: "Copy Path",
    openResume: "Open Resume.pdf",
  },
};

const phoneContactContent = {
  navBackLabel: "Contacts",
  navTitle: personalInfo.name,
  navActionLabel: "Edit",
  tagline: "Let’s connect and build something great.",
  phoneLabel: "mobile",
  emailLabel: "email",
  infoSectionTitle: "Contact Info",
  socialSectionTitle: "Social",
  memojiVideo: assets.videos.memojiContactCard,
  poster: assets.images.avatar,
  quickActions: {
    message: "message",
    call: "call",
    video: "video",
    mail: "mail",
  },
};

const phoneMessagesCommandText = "portfolio info";

const phoneMessagesConfig = {
  commandText: phoneMessagesCommandText,
  listTitle: "Messages",
  editLabel: "Edit",
  searchPlaceholder: "Search",
  messagePlaceholder: "iMessage",
  sendAriaLabel: "Send",
  typingAriaLabel: "Typing",
  backLabel: "Messages",
  threadNowLabel: "Now",
  replyDelayMs: 650,
  hintDelayMs: 520,
  initialMessage: `Hey! If you want my full details (CV, GitHub, LinkedIn, contact, skills), send "${phoneMessagesCommandText}".`,
  replyHint: `Try sending "${phoneMessagesCommandText}".`,
  threadPreview: `Send "${phoneMessagesCommandText}" to see my portfolio info.`,
  threadHintPreview: `Send "${phoneMessagesCommandText}" to get my CV + links.`,
  threadName: personalInfo.name,
  threadAvatar: assets.images.avatar,
  infoCard: {
    title: personalInfo.role,
    sectionContact: "CONTACT",
    sectionSkills: "SKILLS",
    fieldEmail: "Email",
    fieldPhone: "Phone",
    linkCvLabel: "CV (PDF)",
    linkGithubLabel: "GitHub",
    linkLinkedInLabel: "LinkedIn",
    linkYoutubeLabel: "YouTube",
    searchTopHitName: "Phone App",
    searchTopHitTime: "Top Hit",
  },
};

const phoneAboutConfig = {
  storageKey: "portfolio_os_phone_device_name",
  defaultDeviceName: "Yunus’s iPhone",
  iosVersion: "18.2",
  modelName: "iPhone 15 Pro",
  modelNumber: "A3102",
  serialNumber: "F2LVK0Y8NQ1W",
  footnoteGeneral:
    "This view exists so the About page looks like iOS Settings.",
  skillSectionTitle: "SKILLS",
  nameTip: 'Tip: type "hire yunus" and tap Done.',
  openingContact: "Opening Contact...",
  aboutFootnote:
    'Edit "Name" to set a custom device name, or type "hire yunus" to open my contact card.',
  hireKeywords: ["hire yunus", "hire", "yunus"],
  hireDelayMs: 650,
};

const phoneDialConfig = {
  defaultNumber: personalInfo.phoneNumber,
  addNumberLabel: "Add Number",
  tabs: ["Favorites", "Recents", "Contacts", "Keypad", "Voicemail"],
  dialKeys: [
    { digit: "1", sub: "" },
    { digit: "2", sub: "ABC" },
    { digit: "3", sub: "DEF" },
    { digit: "4", sub: "GHI" },
    { digit: "5", sub: "JKL" },
    { digit: "6", sub: "MNO" },
    { digit: "7", sub: "PQRS" },
    { digit: "8", sub: "TUV" },
    { digit: "9", sub: "WXYZ" },
    { digit: "*", sub: "" },
    { digit: "0", sub: "+" },
    { digit: "#", sub: "" },
  ],
};

const phonePhotosTabs = [
  { id: "library", label: "Library" },
  { id: "foryou", label: "For You" },
  { id: "albums", label: "Albums" },
  { id: "search", label: "Search" },
];

const phoneApps = [
  {
    id: "finder",
    label: "Files",
    icon: assets.images.foldersApp,
    accent: "#3b82f6",
  },
  {
    id: "photos",
    label: "Photos",
    icon: assets.images.photosAppPhone,
    accent: "#f59e0b",
  },
  {
    id: "messages",
    label: "Messages",
    icon: assets.images.messagesApp,
    accent: "#22c55e",
  },
  {
    id: "safari",
    label: "Safari",
    icon: assets.images.safariApp,
    accent: "#38bdf8",
  },
  {
    id: "contact",
    label: "Contact",
    icon: assets.images.contactAppPhone,
    accent: "#22c55e",
  },
  {
    id: "terminal",
    label: "Skills",
    icon: assets.images.settingsApp,
    accent: "#0ea5e9",
  },
  {
    id: "resume",
    label: "Resume",
    icon: assets.images.pdfApp,
    accent: "#ef4444",
  },
  {
    id: "phoneapp",
    label: "Phone",
    icon: assets.images.phoneApp,
    accent: "#10b981",
  },
];

const navLinks = [
  { id: 1, name: "Projects", type: "finder" },
  { id: 3, name: "Contact", type: "contact" },
  { id: 4, name: "Resume", type: "resume" },
];

const navIcons = [
  { id: 1, img: "/icons/wifi.svg" },
  { id: 2, img: "/icons/search.svg" },
  { id: 3, img: "/icons/user.svg" },
  { id: 4, img: "/icons/mode.svg" },
];

const dockApps = [
  { id: "finder", name: "Portfolio", icon: "finder.png", canOpen: true },
  { id: "safari", name: "Articles", icon: "safari.png", canOpen: true },
  { id: "photos", name: "Gallery", icon: "photos.png", canOpen: true },
  { id: "contact", name: "Contact", icon: "contact.png", canOpen: true },
  { id: "terminal", name: "Skills", icon: "terminal.png", canOpen: true },
  {
    id: "phone",
    name: "Phone Mirroring",
    icon: "phoneMirroring.png",
    canOpen: true,
    
  },
  { id: "trash", name: "Archive", icon: "trash.png", canOpen: false },
];

const blogPosts = [
  {
    id: 1,
    date: "Sep 2, 2025",
    title: "React Component Architecture: Cleaner, Scalable UI",
    summary:
      "Patterns for reusable components, layout composition, and keeping UI systems easy to scale.",
    content:
      "Scaling a React UI starts with consistent component boundaries and predictable layout rules. In this post I break down the patterns I use for shared UI primitives, page composition, and state flow so features stay fast to ship.\n\nI also cover naming conventions, file structure, and how to avoid common pitfalls like prop drilling and duplicated layout logic. The goal is to keep components readable while still flexible enough for fast iteration.",
    image: "/images/blog1.png",
    link: "https://www.youtube.com/@yunusemrekoyun2361",
  },
  {
    id: 2,
    date: "Aug 28, 2025",
    title:
      "Next.js Performance: Rendering Strategies and Practical Optimizations",
    summary:
      "Breaking down SSR, SSG, ISR, and real optimizations that keep Next.js apps fast and stable.",
    content:
      "Next.js gives you multiple rendering paths, but the right choice depends on the data and user flow. This post maps SSR, SSG, and ISR to real-world use cases and highlights the trade-offs.\n\nI also share the low-effort wins that actually move the needle: caching headers, image strategy, and splitting heavy client bundles. These tweaks keep performance high without sacrificing DX.",
    image: "/images/blog2.png",
    link: "https://www.youtube.com/@yunusemrekoyun2361",
  },
  {
    id: 3,
    date: "Aug 15, 2025",
    title:
      "MERN Projects + Game Dev: Notes on Structure and Iteration",
    summary:
      "Lessons from MERN builds and game prototypes: architecture, iteration loops, and shipping habits.",
    content:
      "I learned the most while iterating on small MERN products and game prototypes. This post compares how I structure backend features, organize client code, and keep a tight feedback loop.\n\nEven simple games teach valuable lessons about state, performance, and polish. I share the workflows that help me ship faster without cutting quality.",
    image: "/images/blog3.png",
    link: "https://www.youtube.com/@yunusemrekoyun2361",
  },
];

const safariConfig = {
  toolbar: {
    addressPlaceholder: "Search or enter website URL",
    sidebarAriaLabel: "Sidebar",
    backAriaLabel: "Back",
    forwardAriaLabel: "Forward",
    shareAriaLabel: "Share",
    newTabAriaLabel: "New Tab",
    copyAriaLabel: "Copy",
  },
  startPage: {
    favoriteBlogsTitle: "Favorite Blogs",
    viewAllBlogsLabel: "View all blogs",
    favoriteBlogsCount: 3,
    loadingBlogsTitle: "Loading blogs...",
    loadingBlogsSubtitle: "Fetching the latest posts.",
    emptyBlogsTitle: "No blogs yet",
    emptyBlogsSubtitle: "Publish your first post from the admin panel.",
    webProjectsTitle: "Web Projects",
    webProjectsComingSoonTitle: "Coming soon...",
    webProjectsComingSoonDescription:
      "I’ll embed my web projects here soon as interactive previews (iframes).",
    webProjectsPlaceholders: [
      { id: "web-project-1", title: "Web Project #1", subtitle: "Coming soon..." },
      { id: "web-project-2", title: "Web Project #2", subtitle: "Coming soon..." },
      { id: "web-project-3", title: "Web Project #3", subtitle: "Coming soon..." },
      { id: "web-project-4", title: "Web Project #4", subtitle: "Coming soon..." },
    ],
  },
  allBlogsPage: {
    title: "All Blogs",
    subtitle: "React, Next.js, MERN, and game-dev notes.",
    backLabel: "Back",
    emptyBlogsTitle: "No blogs published",
    emptyBlogsSubtitle: "Add a new post from the admin dashboard.",
    loadingBlogsTitle: "Loading blogs…",
    loadingBlogsSubtitle: "Fetching the latest posts.",
  },
  detailPage: {
    backLabel: "Back",
    openExternalLabel: "Open the external link",
    emptyContentTitle: "Content is not available yet.",
    emptyContentSubtitle: "Add the full blog content from the admin panel.",
    readTimeLabel: "min read",
    authorLabel: "By",
    relatedTitle: "More posts",
    relatedSubtitle: "Keep exploring recent notes.",
  },
};

const techStack = [
  { category: "Frontend", items: ["React.js", "Vite", "Next.js"] },
  { category: "Mobile", items: ["React Native", "Expo"] },
  { category: "Styling", items: ["Tailwind CSS", "Sass", "CSS"] },
  { category: "Backend", items: ["Node.js", "Express", ".NET (basic)"] },
  { category: "Database", items: ["MongoDB", "PostgreSQL"] },
  { category: "Dev Tools", items: ["Git", "GitHub", "Docker", "PM2"] },
];

const socials = [
  {
    id: 1,
    text: "GitHub",
    icon: "/icons/github.svg",
    bg: "#111827",
    link: "https://github.com/yunusemrekoyun",
  },
  {
    id: 2,
    text: "Resume.pdf",
    icon: "/icons/file.svg",
    bg: "#ef4444",
    link: resumeConfig.viewUrl,
  },
  {
    id: 3,
    text: "YouTube",
    icon: "/icons/youtube.svg",
    bg: "#ff0000",
    link: "https://www.youtube.com/@yunusemrekoyun2361",
  },
  {
    id: 4,
    text: "LinkedIn",
    icon: "/icons/linkedin.svg",
    bg: "#0a66c2",
    link: "https://www.linkedin.com/in/yunussemrekoyun/",
  },
];

const photosLinks = [
  { id: 1, icon: "/icons/gicon1.svg", title: "All Photos" },
  { id: 2, icon: "/icons/gicon2.svg", title: "Memories" },
  { id: 3, icon: "/icons/file.svg", title: "Places" },
  { id: 4, icon: "/icons/gicon4.svg", title: "People" },
  { id: 5, icon: "/icons/gicon5.svg", title: "Favorites" },
];

const gallery = [
  { id: 1, img: "/images/gal1.png" },
  { id: 2, img: "/images/gal2.png" },
  { id: 3, img: "/images/gal3.png" },
  { id: 4, img: "/images/gal4.png" },
];

const gallerySections = {
  1: gallery, // All Photos
  2: [gallery[2], gallery[3]], // Memories
  3: gallery, // Places
  4: [gallery[1], gallery[2]], // People
  5: [gallery[0], gallery[3]], // Favorites
};

const projects = [
  {
    id: 5,
    folderId: null,
    name: "Cosmetics E-Commerce (MERN)",
    type: "MERN",
    status: "live",
    stack: "React, Node, Mongo",
    finderPosition: "top-10 left-5",
    desktopPosition: "top-[5vh] left-5",
    items: [
      {
        id: 1,
        type: "text",
        name: "Cosmetics Project Notes.txt",
        position: "top-5 left-10",
        description: [
          "Fully integrated MERN e-commerce project: React + Express + MongoDB + Node.js.",
          "Admin panel for product, media (images/videos), category, and content management.",
          "Performance-focused: listing, search, sorting, and responsive UI improvements.",
          "Built with a real-world, deployment-ready development approach.",
        ],
      },
      {
        id: 2,
        type: "link",
        name: "demo-link.url",
        href: "https://example.com/kozmetik-demo",
        position: "top-10 right-20",
      },
      {
        id: 3,
        type: "image",
        name: "cosmetics-preview.png",
        imageUrl: "/images/project-1.png",
        position: "top-52 right-80",
      },
      {
        id: 4,
        type: "link",
        name: "Design.url",
        href: "https://example.com/kozmetik-design",
        position: "top-60 right-20",
      },
    ],
  },
  {
    id: 6,
    folderId: null,
    name: "Ceramic Tile Showroom (MERN)",
    type: "MERN",
    status: "live",
    stack: "React, Express",
    finderPosition: "top-52 right-80",
    desktopPosition: "top-[20vh] left-7",
    items: [
      {
        id: 1,
        type: "text",
        name: "Tile Showroom Notes.txt",
        position: "top-5 right-10",
        description: [
          "A showroom website designed from scratch for a real client (MERN).",
          "Content is managed dynamically via the admin panel: product galleries, blog, pages.",
          "SEO and UX-focused page flows and detail pages.",
          "Built with a goal of a clean, modern, and fast interface.",
        ],
      },
      {
        id: 2,
        type: "link",
        name: "demo-link.url",
        href: "https://example.com/cini-demo",
        position: "top-20 left-20",
      },
      {
        id: 3,
        type: "image",
        name: "tile-preview.png",
        imageUrl: "/images/project-2.png",
        position: "top-52 left-80",
      },
      {
        id: 4,
        type: "link",
        name: "Design.url",
        href: "https://example.com/cini-design",
        position: "top-60 left-5",
      },
    ],
  },
  {
    id: 7,
    folderId: null,
    name: "Color Bomb (Match-3 Game)",
    type: "Game",
    status: "draft",
    stack: "WebGL",
    finderPosition: "top-10 left-80",
    desktopPosition: "top-[33vh] left-7",
    items: [
      {
        id: 1,
        type: "text",
        name: "Game Notes.txt",
        position: "top-5 left-10",
        description: [
          "Mobile-friendly match-3 game project.",
          "Level design and gameplay code developed by me.",
          "Worked on special item logic and explosion/animation flows.",
          "A WebGL version could be planned; the demo flow is kept simple.",
        ],
      },
      {
        id: 2,
        type: "link",
        name: "game-demo.url",
        href: "https://example.com/color-bomb-demo",
        position: "top-10 right-20",
      },
      {
        id: 3,
        type: "image",
        name: "colorbomb-preview.png",
        imageUrl: "/images/project-3.png",
        position: "top-52 right-80",
      },
      {
        id: 4,
        type: "link",
        name: "Design.url",
        href: "https://example.com/colorbomb-design",
        position: "top-60 right-20",
      },
    ],
  },
];

export {
  assets,
  personalInfo,
  navbarConfig,
  welcomeCopy,
  wifiPanelContent,
  profilePanelContent,
  desktopContactContent,
  desktopContactQuickActions,
  desktopNotificationsConfig,
  persistenceConfig,
  resumeConfig,
  uiConfig,
  phoneContactSheetConfig,
  phoneFinderOptionsSheetConfig,
  phoneContactContent,
  phoneMessagesConfig,
  phoneAboutConfig,
  phoneDialConfig,
  phonePhotosTabs,
  phoneApps,
  navLinks,
  navIcons,
  dockApps,
  blogPosts,
  projects,
  safariConfig,
  techStack,
  socials,
  photosLinks,
  gallery,
  gallerySections,
};

// ------------------------------
// Finder “locations” (all text updated)
// ------------------------------

const PROJECT_FILE_TYPES = {
  text: { fileType: "txt", icon: "/images/txt.png" },
  link: { fileType: "url", icon: "/images/safari.png" },
  image: { fileType: "img", icon: "/images/image.png" },
  video: { fileType: "video", icon: "/images/video.svg" },
};

const buildProjectFile = (item) => {
  const meta = PROJECT_FILE_TYPES[item.type] ?? PROJECT_FILE_TYPES.text;

  return {
    id: item.id,
    name: item.name,
    icon: meta.icon,
    kind: "file",
    fileType: meta.fileType,
    position: item.position,
    description: item.description,
    subtitle: item.subtitle,
    image: item.image,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl || item.href,
    posterUrl: item.posterUrl,
    href: item.href,
  };
};

const buildProjectFolder = (project) => ({
  id: project.id,
  name: project.name,
  icon: assets.images.folder,
  kind: "folder",
  position: project.finderPosition,
  windowPosition: project.desktopPosition,
  children: (project.items ?? []).map(buildProjectFile),
});

const WORK_LOCATION = {
  id: 1,
  type: "work",
  name: "Projects",
  icon: "/icons/work.svg",
  kind: "folder",
  children: projects.map(buildProjectFolder),
};

const ABOUT_LOCATION = {
  id: 2,
  type: "about",
  name: "About Me",
  icon: "/icons/info.svg",
  kind: "folder",
  children: [
    {
      id: 1,
      name: "profile.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-10 left-5",
      imageUrl: "/images/yunus.jpg",
    },
    {
      id: 2,
      name: "casual.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-28 right-72",
      imageUrl: "/images/yunus-2.jpg",
    },
    {
      id: 3,
      name: "work.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-52 left-80",
      imageUrl: "/images/yunus-3.jpeg",
    },
    {
      id: 4,
      name: "about-me.txt",
      icon: "/images/txt.png",
      kind: "file",
      fileType: "txt",
      position: "top-60 left-5",
      subtitle: "Meet Yunus Emre Koyun",
      image: "/images/yunus.jpg",
      description: [
        "Hi! I’m Yunus Emre Koyun. I’m a full-stack developer and I love building in the MERN ecosystem.",
        "On the React side I care about building strong UI; on the backend I focus on fast, clean APIs with Node.js.",
        "Clean code, maintainability, and user experience are my priorities.",
        "I enjoy experimenting with new ideas (animations, interactive interfaces, and small game mechanics).",
      ],
    },
  ],
};

const RESUME_LOCATION = {
  id: 3,
  type: "resume",
  name: "Resume",
  icon: "/icons/file.svg",
  kind: "folder",
  children: [
    {
      id: 1,
      name: "Resume.pdf",
      icon: "/images/pdf.png",
      kind: "file",
      fileType: "pdf",
    },
  ],
};

const TRASH_LOCATION = {
  id: 4,
  type: "trash",
  name: "Trash",
  icon: "/icons/trash.svg",
  kind: "folder",
  children: [
    {
      id: 1,
      name: "old-mock-1.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-10 left-10",
      imageUrl: "/images/trash-1.png",
    },
    {
      id: 2,
      name: "old-mock-2.png",
      icon: "/images/image.png",
      kind: "file",
      fileType: "img",
      position: "top-40 left-80",
      imageUrl: "/images/trash-2.png",
    },
  ],
};

export const locations = {
  work: WORK_LOCATION,
  about: ABOUT_LOCATION,
  resume: RESUME_LOCATION,
  trash: TRASH_LOCATION,
};

// ------------------------------
// Window config
// ------------------------------

const INITIAL_Z_INDEX = 1000;

const WINDOW_CONFIG = {
  finder: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  contact: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  resume: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  safari: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  photos: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  terminal: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  phone: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  txtfile: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  imgfile: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
  videofile: {
    isOpen: false,
    hasOpened: false,
    zIndex: INITIAL_Z_INDEX,
    data: null,
    position: { x: 0, y: 0 },
    size: { width: null, height: null },
  },
};

export { INITIAL_Z_INDEX, WINDOW_CONFIG };
