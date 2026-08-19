export const formatDuration = (millisOrSeconds) => {
  if (!millisOrSeconds) return '3:20';
  let totalSeconds = millisOrSeconds > 1000 ? Math.floor(millisOrSeconds / 1000) : Math.floor(millisOrSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            return tracks.map((item) => ({
              id: item.youtubeId || item.id,
              youtubeId: item.youtubeId || item.id,
              youtube_id: item.youtubeId || item.id,
              title: item.title,
              artist: item.artist || item.artist_name || 'Artist',
              artist_name: item.artist || item.artist_name || 'Artist',
              album: item.album || item.album_name || item.artist || 'Official Release',
              album_name: item.album || item.album_name || item.artist || 'Official Release',
              thumbnail: item.thumbnail || item.image_url || item.cover_url,
              image_url: item.thumbnail || item.image_url || item.cover_url,
              cover_url: item.thumbnail || item.image_url || item.cover_url,
              duration: typeof item.duration === 'string' ? item.duration : formatDuration(item.duration),
              durationRaw: item.duration,
              audio_url: item.audio_url,
              fullTrack: true,
            }));
          }
        }
      } catch (backendErr) {
        console.warn('Backend search warning:', backendErr);
      }
    }

    // 1. Try public Piped / Invidious YouTube Music API
    const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items.map((item) => {
          const vId = item.url?.replace('/watch?v=', '') || item.id;
          return {
            id: vId,
            youtubeId: vId,
            youtube_id: vId,
            title: item.title,
            artist: item.uploaderName || item.artist || 'Artist',
            artist_name: item.uploaderName || item.artist || 'Artist',
            album: item.album || item.uploaderName || 'Official Release',
            album_name: item.album || item.uploaderName || 'Official Release',
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
            image_url: item.thumbnail || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
            cover_url: item.thumbnail || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
            duration: formatDuration(item.duration),
            durationRaw: item.duration || 210,
            audio_url: `/api/youtube/stream/${vId}`,
            fullTrack: true,
          };
        });
      }
    }
  } catch (e) {
    console.warn('Piped search failed, using YouTube Search API:', e);
  }

  // 2. High-quality music fallback with accurate album names and full YouTube play ID
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
    const data = await res.json();
    return (data.results || []).map((song) => ({
      id: song.trackId.toString(),
      title: song.trackName,
      artist: song.artistName,
      artist_name: song.artistName,
      album: song.collectionName || song.collectionCensoredName || 'Official Album',
      album_name: song.collectionName || song.collectionCensoredName || 'Official Album',
      thumbnail: song.artworkUrl100?.replace('100x100bb', '600x600bb'),
      image_url: song.artworkUrl100?.replace('100x100bb', '600x600bb'),
      cover_url: song.artworkUrl100?.replace('100x100bb', '600x600bb'),
      duration: formatDuration(song.trackTimeMillis),
      durationRaw: Math.floor(song.trackTimeMillis / 1000),
      youtubeQuery: `${song.trackName} ${song.artistName} official audio`,
      audio_url: song.previewUrl,
      youtubeId: song.trackId.toString(),
      youtube_id: song.trackId.toString(),
    }));
  } catch (err) {
    console.error('Track fetch failed:', err);
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
          if (tracks.length > 0) {
            return tracks.map((item) => ({
              ...item,
              album: item.album || item.album_name || item.artist || 'Trending Music',
              album_name: item.album || item.album_name || item.artist || 'Trending Music',
              duration: typeof item.duration === 'string' ? item.duration : formatDuration(item.duration),
            }));
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return searchYouTubeMusic('Top Hits Trending Music 2026');
};
