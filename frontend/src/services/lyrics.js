import api from './api';

export const getLyrics = async (track, artist = '') => {
  try {
    const response = await api.get(`/lyrics?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`);
    if (response.data && (response.data.plain_lyrics || response.data.synced_lyrics)) {
      return response.data;
    }
  } catch (err) {
    console.warn('Backend lyrics fetch failed, trying public LRCLIB API...', err);
  }

  // Public fallback via LRCLIB (free open lyrics database)
  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(track + ' ' + artist)}`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const first = list[0];
        return {
          plain_lyrics: first.plainLyrics || `♪ ${track} ♪\nby ${artist || 'Unknown Artist'}\n\n(No text lyrics found)`,
          synced_lyrics: first.syncedLyrics || '',
          found: true,
        };
      }
    }
  } catch (lrcErr) {
    console.warn('LRCLIB fallback failed:', lrcErr);
  }

  return {
    plain_lyrics: `♪ ${track} ♪\nby ${artist || 'Unknown Artist'}\n\n(Lyrics unavailable)`,
    synced_lyrics: '',
    found: false,
  };
};
