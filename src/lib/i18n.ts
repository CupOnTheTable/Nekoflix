export const APP_NAME = "Nekoflix";
export const APP_TAGLINE = "Watch anime the right way.";
export const APP_DESCRIPTION =
  "Discover, track, and stream anime with Nekoflix. Browse trending series, manage your watchlist, and keep up with the weekly schedule.";

export const META = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  siteName: APP_NAME,
};

export const NAV_LINKS = {
  home: "Home",
  browse: "Browse",
  search: "Search",
  schedule: "Schedule",
  watchlist: "Watchlist",
  myLibrary: "My Library",
  random: "Random",
  login: "Sign in",
  register: "Create account",
  account: "Account",
  logout: "Sign out",
  theme: "Theme",
};

export const HOME = {
  hero: {
    watchNow: "Watch now",
    addToList: "Add to list",
    moreInfo: "More info",
  },
  rows: {
    trending: "Trending Now",
    popularThisSeason: "Popular This Season",
    topRated: "Top Rated",
    continueWatching: "Continue Watching",
    recentlyUpdated: "Recently Updated",
  },
};

export const SEARCH = {
  title: "Search",
  placeholder: "Search anime…",
  noResults: "No results found",
  noResultsDescription: "Try adjusting your filters or search query.",
  filters: "Filters",
  clearFilters: "Clear filters",
  sortBy: "Sort by",
  genre: "Genre",
  status: "Status",
  format: "Format",
  season: "Season",
  year: "Year",
  minScore: "Minimum score",
  audio: "Audio",
  episodes: "Episodes",
  loading: "Searching catalog…",
};

export const ANIME_STATUS = {
  AIRING: "Airing",
  FINISHED: "Finished",
  UPCOMING: "Upcoming",
  RELEASING: "Airing",
  NOT_YET_RELEASED: "Upcoming",
  CANCELLED: "Cancelled",
  HIATUS: "Hiatus",
};

export const WATCHLIST_STATUS = {
  watching: "Watching",
  planning: "Planning",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
};

export const PLAYER = {
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
  pictureInPicture: "Picture in picture",
  exitPictureInPicture: "Exit picture in picture",
  nextEpisode: "Next episode",
  previousEpisode: "Previous episode",
  skipIntro: "Skip intro",
  skipOutro: "Skip outro",
  settings: "Settings",
  quality: "Quality",
  speed: "Speed",
  subtitles: "Subtitles",
  audio: "Audio",
  auto: "Auto",
  off: "Off",
  autoPlayNext: "Playing next episode in",
  cancel: "Cancel",
  tryAnotherServer: "Try another server",
  retry: "Retry",
  sourceError: "Could not load video",
  sourceErrorDescription: "The current stream failed. Try another server or retry.",
  resume: "Resume",
  startOver: "Start over",
};

export const SCHEDULE = {
  title: "Schedule",
  eyebrow: "Estimated airing times",
  yesterday: "Yesterday",
  today: "Today",
  tomorrow: "Tomorrow",
  noAnime: (day: string) => `No anime airing on ${day}s`,
  noAnimeDescription: "Check back later or browse other days.",
  tba: "TBA",
  hourLabel: (hour: number) => `${String(hour).padStart(2, "0")}:00`,
};

export const ERRORS = {
  generic: "Something went wrong",
  retry: "Retry",
  notFound: "Page not found",
  notFoundDescription: "The page you are looking for does not exist.",
  goHome: "Go home",
};

export const FOOTER = {
  tagline: "Anime, properly. Catalog metadata comes from AniList.",
  credit: "Metadata by AniList · streams resolved server-side",
  disclaimer: "No files are hosted on this site.",
  legal: "Disclaimer",
};

export const COMMON = {
  back: "Back",
  watchNow: "Watch now",
  addToList: "Add to list",
  moreInfo: "More info",
  loading: "Loading...",
  episodes: "Episodes",
  episode: "Episode",
  of: "of",
  sub: "Sub",
  dub: "Dub",
  search: "Search",
  filter: "Filter",
  clear: "Clear",
  save: "Save",
  cancel: "Cancel",
  submit: "Submit",
  remove: "Remove",
  edit: "Edit",
  close: "Close",
  openMenu: "Open menu",
  closeMenu: "Close menu",
};

export const FORM = {
  email: "Email",
  username: "Username",
  password: "Password",
  currentPassword: "Current password",
  newPassword: "New password",
  confirmPassword: "Confirm password",
  bio: "Bio",
  avatar: "Avatar URL",
  save: "Save changes",
  submit: "Submit",
  cancel: "Cancel",
};
