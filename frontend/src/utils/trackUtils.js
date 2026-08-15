/**
 * Normalizes every track object cleanly across Search, Library, and Player.
 */
export const normalizeTrack = (item) => {
  if (!item) return null;

  const id = String(item.trackId || item.id || item.key || Date.now());
  const title = item.trackName || item.title || item.name || 'Unknown Title';
  const artist = item.artistName || item.artist || item.artist_name || 'Unknown Artist';
  const artist_name = item.artist_name || item.artistName || item.artist || 'Unknown Artist';
  const album = item.collectionName || item.album || item.album_name || 'Single';

  const rawCover =
    item.cover ||
    item.artworkUrl100?.replace('100x100bb', '300x300bb') ||
    item.artworkUrl60?.replace('60x60bb', '300x300bb') ||
    item.image_url ||
    item.cover_url ||
    item.image ||
    item.artwork ||
    '/default-cover.png';

  const cover =
    typeof rawCover === 'string'
      ? rawCover.replace('100x100bb', '300x300bb').replace('1000x1000bb', '300x300bb')
      : '/default-cover.png';

  const duration =
    item.duration || (item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 180);
  const audioUrl =
    item.previewUrl ||
    item.audioUrl ||
    item.streamUrl ||
    item.url ||
    item.audio_url ||
    item.preview_url ||
    '';

  return {
    ...item,
    id,
    title,
    artist,
    artist_name,
    album,
    album_name: album,
    cover,
    image_url: cover,
    cover_url: cover,
    image: cover,
    artwork: cover,
    duration,
    audioUrl,
    audio_url: audioUrl,
  };
};
