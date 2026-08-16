/**
 * Normalizes every track object cleanly across Search, Library, and Player.
 */
export const normalizeTrack = (track) => {
  if (!track) return null;
  const audio = track.audioUrl || track.audio_url || track.streamUrl || track.stream_url || track.url || '';
  const rawCover =
    track.cover ||
    track.coverUrl ||
    track.cover_url ||
    track.image ||
    track.image_url ||
    track.artwork ||
    '/default-cover.png';
  const cover =
    typeof rawCover === 'string'
      ? rawCover.replace('100x100bb', '300x300bb').replace('1000x1000bb', '300x300bb')
      : '/default-cover.png';
  const title = track.title || track.name || track.trackName || 'Unknown Track';
  const artist = track.artist || track.artist_name || track.artistName || track.primaryArtists || 'Unknown Artist';
  const album = track.album || track.album_name || track.collectionName || 'Single';
  const duration = Number(track.duration) || (track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 200);

  return {
    ...track,
    id: String(track.id || track.trackId || Date.now() + Math.random()),
    title,
    artist,
    artist_name: artist,
    album,
    album_name: album,
    duration,
    cover,
    cover_url: cover,
    image_url: cover,
    image: cover,
    audioUrl: audio,
    audio_url: audio,
  };
};

