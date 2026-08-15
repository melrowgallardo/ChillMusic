/**
 * Normalizes every track object to ensure consistent property access across all components.
 */
export const normalizeTrack = (song) => {
  if (!song) return null;

  const id = String(song.id || song.trackId || song.key || Date.now());
  const title = song.title || song.trackName || song.name || 'Unknown Title';
  const artist = song.artist || song.artistName || song.artist_name || 'Unknown Artist';
  const artist_name = song.artist_name || song.artist || song.artistName || 'Unknown Artist';
  const album = song.album || song.collectionName || 'Single';
  const album_name = song.album_name || song.album || song.collectionName || 'Single';
  const cover =
    song.cover ||
    song.image_url ||
    song.cover_url ||
    song.image ||
    song.artwork ||
    song.artworkUrl100?.replace('100x100bb', '500x500bb') ||
    song.artworkUrl60 ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
  const duration =
    song.duration || (song.trackTimeMillis ? Math.floor(song.trackTimeMillis / 1000) : 180);
  const audioUrl =
    song.audioUrl ||
    song.previewUrl ||
    song.streamUrl ||
    song.url ||
    song.audio_url ||
    song.preview_url ||
    '';

  return {
    ...song,
    id,
    title,
    artist,
    artist_name,
    album,
    album_name,
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
