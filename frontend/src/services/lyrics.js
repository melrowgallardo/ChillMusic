import api from './api';

export const getLyrics = async (track, artist = '') => {
  try {
    const response = await api.get(`/lyrics?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`);
    return response.data;
  } catch (err) {
    console.warn('Lyrics fetch failed:', err);
    return {
      plain_lyrics: `♪ ${track} ♪\nby ${artist || 'Unknown Artist'}\n\n(Lyrics unavailable)`,
      synced_lyrics: '',
      found: false,
    };
  }
};
