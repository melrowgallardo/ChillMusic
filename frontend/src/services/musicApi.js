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

