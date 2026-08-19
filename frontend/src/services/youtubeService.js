// Direct client-side YouTube search fallback using public proxy & iTunes fallback
export const searchYouTubeMusic = async (query) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/api/music/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const tracks = Array.isArray(data) ? data : (data.songs || data.tracks || []);
          if (tracks.length > 0) return tracks;
        }
      } catch (backendErr) {
        console.warn('Backend search warning:', backendErr);
      }
    }

    const res = await fetch(`https://invidious.jing.rocks/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 20).map((item) => ({
          id: item.videoId,
          title: item.title,
          artist: item.author || 'YouTube Music',
          artist_name: item.author || 'YouTube Music',
          thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          image_url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          cover_url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          duration: item.lengthSeconds ? `${Math.floor(item.lengthSeconds / 60)}:${(item.lengthSeconds % 60).toString().padStart(2, '0')}` : '3:30',
          youtubeId: item.videoId,
          youtube_id: item.videoId,
          audio_url: `/api/youtube/stream/${item.videoId}`,
        }));
      }
    }
  } catch (err) {
    console.warn('Invidious search error, fallbacking to iTunes/Direct search:', err);
  }

  // 2. Reliable Fallback via iTunes Search API (guaranteed high-uptime music results)
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
    const data = await res.json();
    return (data.results || []).map((song) => ({
      id: song.trackId.toString(),
      title: song.trackName,
      artist: song.artistName,
      artist_name: song.artistName,
      thumbnail: song.artworkUrl100?.replace('100x100bb', '400x400bb'),
      image_url: song.artworkUrl100?.replace('100x100bb', '400x400bb'),
      cover_url: song.artworkUrl100?.replace('100x100bb', '400x400bb'),
      duration: `${Math.floor(song.trackTimeMillis / 60000)}:${(Math.floor((song.trackTimeMillis % 60000) / 1000)).toString().padStart(2, '0')}`,
      audio_url: song.previewUrl,
      youtubeId: song.trackId.toString(),
      youtube_id: song.trackId.toString(),
    }));
  } catch (e) {
    console.error('All music search services failed:', e);
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
  return searchYouTubeMusic('Top Hits Trending Music 2026');
};
