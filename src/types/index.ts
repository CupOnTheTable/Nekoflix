export interface AnimeCharacter {
  id: number;
  name: string;
  image: string | null;
  role: string;
  voiceActor?: {
    name: string;
    image: string | null;
  };
}

export interface AnimeRecommendation {
  id: number;
  title: string;
  coverImage: string;
  score: number;
  format: string;
  status: string;
}

export interface Anime {
  id: number;
  title: string;
  titleJapanese?: string;
  coverImage: string;
  backdropImage?: string;
  synopsis: string;
  score: number;
  episodes: number;
  status: "Airing" | "Finished" | "Upcoming";
  format: "TV" | "Movie" | "OVA" | "ONA" | "Special";
  genres: string[];
  studios: string[];
  releaseYear: number;
  season: "Winter" | "Spring" | "Summer" | "Fall";
  subbed: boolean;
  dubbed: boolean;
  episodeCount: number;
  broadcastDay?: string;
  broadcastTime?: string;
  duration?: number;
  characters?: AnimeCharacter[];
  recommendations?: AnimeRecommendation[];
}

export type WatchlistStatus =
  | "plan_to_watch"
  | "watching"
  | "completed"
  | "on_hold"
  | "dropped";

export interface WatchlistEntry {
  id: string;
  userId: string;
  animeId: number;
  status: WatchlistStatus;
  progress: number;
  score: number | null;
  addedAt: string;
  updatedAt: string;
  anime?: Anime;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  timezone: string;
  audioPref: string;
  theme: string;
}

export interface SearchFilters {
  q?: string;
  genres?: string[];
  status?: string[];
  format?: string[];
  yearFrom?: number;
  yearTo?: number;
  season?: string[];
  studios?: string[];
  minScore?: number;
  audio?: string;
  episodeFrom?: number;
  episodeTo?: number;
  sort?: string;
  page?: number;
}

export const ALL_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
  "Horror", "Isekai", "Mecha", "Music", "Mystery", "Psychological",
  "Romance", "Sci-Fi", "Seinen", "Shonen", "Shojo", "Slice of Life",
  "Sports", "Supernatural", "Thriller",
] as const;

export const ALL_STATUSES = ["Airing", "Finished", "Upcoming"] as const;
export const ALL_FORMATS = ["TV", "Movie", "OVA", "ONA", "Special"] as const;
export const ALL_SEASONS = ["Winter", "Spring", "Summer", "Fall"] as const;
export const SORT_OPTIONS = [
  "popularity", "score", "newest", "oldest", "title_az",
] as const;
