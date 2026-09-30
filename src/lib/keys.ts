// Artists and albums are keyed by normalized name so live and imported plays merge.
const norm = (s: string) => s.trim().toLowerCase();
export const artistKey = (artist: string) => `ar:${norm(artist)}`;
export const albumKey = (artist: string, album: string) => `al:${norm(artist)}|${norm(album)}`;
