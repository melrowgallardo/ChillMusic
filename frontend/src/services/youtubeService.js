const API_KEY =
  import.meta.env.VITE_YOUTUBE_API_KEY ||
  import.meta.env.YOUTUBE_API_KEY ||
  'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper to convert ISO 8601 duration (PT3M45S) to mm:ss and seconds
export const parseDuration = (isoDuration) => {
  if (!isoDuration) return { formatted: '3:30', seconds: 210 };
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { formatted: '3:30', seconds: 210 };

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const displayMins = hours > 0 ? `${hours * 60 + minutes}` : `${minutes}`;
  const displaySecs = seconds.toString().padStart(2, '0');

  return {
    formatted: `${displayMins}:${displaySecs}`,
    seconds: totalSeconds || 210,
  };
};

export const formatDuration = (secondsOrIso) => {
  if (typeof secondsOrIso === 'string' && secondsOrIso.startsWith('PT')) {
    return parseDuration(secondsOrIso).formatted;
  }
  if (typeof secondsOrIso === 'string' && secondsOrIso.includes(':')) {
    return secondsOrIso;
  }
  const sec = Number(secondsOrIso);
  if (!sec || isNaN(sec)) return '3:30';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Search YouTube Music Videos
export const searchYouTubeMusic = async (query) => {
  if (!query || !query.trim()) return [];

  try {
    const key = API_KEY;
    if (!key) return [];

    // 1. Fetch Search Results
    const searchRes = await fetch(
      `${BASE_URL}/search?part=snippet&maxResults=25&q=${encodeURIComponent(query + ' audio song')}&type=video&videoCategoryId=10&key=${key}`
    );
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) return [];

    const videoIds = searchData.items.map((item) => item.id?.videoId || item.id).filter(Boolean).join(',');

    if (!videoIds) return [];

    // 2. Fetch Video Details (for accurate durations)
    const detailsRes = await fetch(
      `${BASE_URL}/videos?part=snippet,contentDetails&id=${videoIds}&key=${key}`
    );
    const detailsData = await detailsRes.json();

    if (detailsData.items && detailsData.items.length > 0) {
      return detailsData.items.map((item) => {
        const durationData = parseDuration(item.contentDetails?.duration);
        const cleanTitle = item.snippet?.title
          ?.replace(/(\(Official.*|\(Lyrics.*|\[Official.*|\[Lyrics.*|HD|HQ|4K)/gi, '')
          .trim();

        return {
          id: item.id,
          youtubeId: item.id,
          title: cleanTitle || item.snippet?.title || query,
          artist: item.snippet?.channelTitle || 'Artist',
          artist_name: item.snippet?.channelTitle || 'Artist',
          album: item.snippet?.channelTitle || 'YouTube Music',
          album_name: item.snippet?.channelTitle || 'YouTube Music',
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          image_url:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          cover_url:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          duration: durationData.formatted,
          durationRaw: durationData.seconds,
        };
      });
    }
  } catch (err) {
    console.error('YouTube API search error:', err);
  }
  return [];
};

// Get Trending / Featured Tracks
export const getTrendingTracks = async () => {
  try {
    const key = API_KEY;
    if (key) {
      const res = await fetch(
        `${BASE_URL}/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=20&key=${key}`
      );
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        return data.items.map((item) => {
          const durationData = parseDuration(item.contentDetails?.duration);
          return {
            id: item.id,
            youtubeId: item.id,
            title: item.snippet?.title?.replace(/(\(Official.*|\(Lyrics.*|\[Official.*)/gi, '').trim(),
            artist: item.snippet?.channelTitle || 'Artist',
            artist_name: item.snippet?.channelTitle || 'Artist',
            album: 'Trending Now',
            album_name: 'Trending Now',
            thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            image_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            cover_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
            duration: durationData.formatted,
            durationRaw: durationData.seconds,
          };
        });
      }
    }
  } catch (e) {
    console.error('Trending fetch error:', e);
  }
  return searchYouTubeMusic('Top Hits 2026');
};
