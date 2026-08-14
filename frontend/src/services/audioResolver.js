import { fetchYouTubePublic } from './youtube';

// Helper to detect 30s preview URLs or short preview tracks
export const isPreviewUrl = (url, duration) => {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (
    lower.includes('dzcdn.net') ||
    lower.includes('cdns-preview') ||
    lower.includes('preview') ||
    lower.includes('apple.com') ||
    lower.includes('itunes') ||
    lower.includes('sample')
  ) {
    return true;
  }
  if (duration > 0 && duration <= 35 && !lower.includes('soundhelix')) {
    return true;
  }
  return false;
};

// Fast helper to fetch with timeout
const fetchWithTimeout = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Resolves full-length audio stream for a track.
 * If the track already has a valid full-length audio URL, returns it immediately.
 * If it's a 30s preview URL or missing audio URL, queries YouTube/Piped/JioSaavn/Audius for the full song.
 */
export const resolveFullAudioTrack = async (track) => {
  if (!track) return track;

  // If already a valid full audio stream (not a 30s preview and duration > 35s), return as-is
  if (track.audio_url && !isPreviewUrl(track.audio_url, track.duration)) {
    return track;
  }

  const queryStr = `${track.title || ''} ${track.artist_name || track.artist || ''}`.trim();
  if (!queryStr) return track;

  console.log(`Resolving full song audio for preview track: "${queryStr}"...`);

  // 1. Try YouTube / Invidious / Piped public search (fast)
  try {
    const ytTracks = await fetchYouTubePublic(queryStr, 3);
    const fullYt = ytTracks.find((t) => t && t.audio_url && !isPreviewUrl(t.audio_url, t.duration) && t.duration >= 60);
    if (fullYt) {
      return {
        ...track,
        audio_url: fullYt.audio_url,
        duration: fullYt.duration || track.duration || 210,
        source: fullYt.source || 'youtube',
        image_url: track.image_url || fullYt.image_url,
      };
    }
  } catch (err) {
    console.warn('YouTube full song resolution failed:', err);
  }

  // 2. Try Audius API (fast open music API)
  try {
    const res = await fetchWithTimeout(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(queryStr)}&limit=3`, 2500);
    if (res.ok) {
      const json = await res.json();
      const items = json.data || [];
      const valid = items.find((i) => i.duration >= 60);
      if (valid) {
        return {
          ...track,
          audio_url: `https://api.audius.co/v1/tracks/${valid.id}/stream`,
          duration: valid.duration || track.duration || 210,
          source: 'audius',
        };
      }
    }
  } catch (err) {
    console.warn('Audius full song resolution failed:', err);
  }

  // 3. Try JioSaavn API
  try {
    const res = await fetchWithTimeout(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(queryStr)}&limit=3`, 2500);
    if (res.ok) {
      const json = await res.json();
      const results = json.data?.results || [];
      for (const item of results) {
        const audioList = item.downloadUrl || item.url || [];
        if (Array.isArray(audioList) && audioList.length > 0) {
          const u = audioList[audioList.length - 1].url || audioList[audioList.length - 1].link || '';
          if (u && !isPreviewUrl(u, item.duration)) {
            return {
              ...track,
              audio_url: u,
              duration: parseInt(item.duration || track.duration || 210, 10),
              source: 'saavn',
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Saavn full song resolution failed:', err);
  }

  // Fallback: If no full song stream found, keep track as is
  return track;
};
