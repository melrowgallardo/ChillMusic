/**
 * Full-Length Audio Search Resolver
 * Resolves 320kbps / 160kbps MP3 stream URLs and duration for tracks from open Saavn/JioSaavn mirror API.
 */
export const getFullAudioStream = async (title, artist) => {
  try {
    const queryStr = `${title || ''} ${artist || ''}`.trim();
    if (!queryStr) return null;
    const query = encodeURIComponent(queryStr);

    // Fetch full track stream from open Saavn/JioSaavn mirror API:
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${query}&page=1&limit=1`);
    const data = await res.json();

    if (data?.data?.results?.[0]?.downloadUrl) {
      // Get highest quality MP3 stream (320kbps or 160kbps)
      const downloadLinks = data.data.results[0].downloadUrl;
      const fullStream = downloadLinks[downloadLinks.length - 1]?.url || downloadLinks[0]?.url;
      const duration = Number(data.data.results[0].duration) || null;
      return { streamUrl: fullStream, duration };
    }
  } catch (err) {
    console.warn('Full stream resolver fallback:', err);
  }
  return null;
};

export { fetchYouTubeVideoId } from './youtube';

export const searchFullTracks = async (query) => {
  try {
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=30`);
    const json = await res.json();
    const items = json?.data?.results || [];

    return items.map((item) => {
      // Pick highest quality direct MP3 stream
      const downloadLinks = item.downloadUrl || [];
      const fullAudioUrl = downloadLinks[downloadLinks.length - 1]?.url || downloadLinks[0]?.url || '';

      // Pick high quality album artwork
      const images = item.image || [];
      const coverUrl = images[images.length - 1]?.url || images[0]?.url || '';

      const artistName = item.artists?.primary?.[0]?.name || item.primaryArtists || 'Unknown Artist';
      const titleName = item.name?.replace(/&quot;/g, '"')?.replace(/&#039;/g, "'") || 'Unknown Title';
      const albumName = item.album?.name || 'Single';

      return {
        id: item.id || String(Date.now() + Math.random()),
        title: titleName,
        artist: artistName,
        artist_name: artistName,
        album: albumName,
        album_name: albumName,
        duration: Number(item.duration) || 200,
        cover: coverUrl,
        image_url: coverUrl,
        cover_url: coverUrl,
        audioUrl: fullAudioUrl, // Direct full-length MP3
        audio_url: fullAudioUrl,
      };
    });
  } catch (error) {
    console.error('Failed to search full tracks:', error);
    return [];
  }
};


