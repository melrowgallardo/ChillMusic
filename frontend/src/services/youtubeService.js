export const formatDuration = (seconds) => {
  if (!seconds) return '3:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const searchYouTubeMusic = async (query) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/api/music/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const tracks = Array.isArray(data) ? data : (data.songs || data.tracks || []);
          if (tracks.length > 0) {
            return tracks.map((item) => {
              const vidId = item.youtubeId || item.id;
              const durationSecs = item.durationRaw || (typeof item.duration === 'number' ? item.duration : 210);
              return {
                id: vidId,
                youtubeId: vidId,
                title: item.title,
                artist: item.artist || item.artist_name || 'Artist',
                album: item.album || item.album_name || item.artist || 'YouTube Music',
                thumbnail: item.thumbnail || item.image_url || item.cover_url,
                duration: typeof item.duration === 'string' ? item.duration : formatDuration(durationSecs),
                durationRaw: durationSecs,
              };
            });
          }
        }
      } catch (backendErr) {
        console.warn('Backend search warning:', backendErr);
      }
    }
  } catch (e) {}

  // Array of reliable public YouTube API instances
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacy.com.de',
    'https://invidious.jing.rocks/api/v1'
  ];

  for (const base of instances) {
    try {
      const url = base.includes('invidious')
        ? `${base}/search?q=${encodeURIComponent(query + ' audio')}&type=video`
        : `${base}/search?q=${encodeURIComponent(query + ' audio')}&filter=music_songs`;

      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || data || [];
        if (items.length > 0) {
          return items.slice(0, 25).map((item) => {
            const vidId = item.id || item.videoId || item.url?.replace('/watch?v=', '');
            const durationSecs = item.duration || item.lengthSeconds || 210;
            return {
              id: vidId,
              youtubeId: vidId,
              title: item.title?.replace(/(\(Official.*|\(Lyrics.*|\[Official.*|\[Lyrics.*)/gi, '').trim(),
              artist: item.uploaderName || item.author || 'Artist',
              album: item.uploaderName || 'YouTube Music',
              thumbnail: item.thumbnail || item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              duration: formatDuration(durationSecs),
              durationRaw: durationSecs,
            };
          });
        }
      }
    } catch (e) {
      console.warn(`Failed instance ${base}:`, e);
    }
  }

  // Direct YouTube Scraping Fallback
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official audio')}`)}`);
    const text = await res.text();
    const videoIds = [...text.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map(m => m[1]);
    const uniqueIds = [...new Set(videoIds)].slice(0, 15);

    return uniqueIds.map((id) => ({
      id: id,
      youtubeId: id,
      title: query,
      artist: 'YouTube Artist',
      album: 'YouTube Release',
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: '3:30',
      durationRaw: 210,
    }));
  } catch (err) {
    console.error('All YouTube search methods failed:', err);
    return [];
  }
};

export const getTrendingTracks = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/api/music/trending`);
        if (res.ok) {
          const data = await res.json();
          const tracks = Array.isArray(data) ? data : (data.tracks || []);
          if (tracks.length > 0) return tracks;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return searchYouTubeMusic('Top Hits 2026 Trending Music');
};
