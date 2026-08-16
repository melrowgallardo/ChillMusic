/**
 * YouTube Data API v3 Search Engine Service
 */
export const searchYouTubeMusic = async (query) => {
  try {
    const term = query?.trim() ? query : 'Top Hits 2026';
    const apiKey =
      import.meta.env.VITE_YOUTUBE_API_KEY ||
      import.meta.env.YOUTUBE_API_KEY ||
      'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=25&q=${encodeURIComponent(term)}&key=${apiKey}`
    );
    const data = await res.json();
    if (!data?.items) return [];

    return data.items.map((item) => {
      const title = item.snippet.title
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      const channelTitle = item.snippet.channelTitle;
      const videoId = item.id.videoId;
      const cover = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '';

      return {
        id: videoId,
        videoId: videoId,
        youtubeId: videoId,
        title: title,
        artist: channelTitle,
        artist_name: channelTitle,
        album: 'Official Track',
        album_name: 'Official Track',
        cover: cover,
        cover_url: cover,
        image_url: cover,
        image: cover,
        duration: 210,
        audioUrl: '',
        audio_url: '',
      };
    });
  } catch (err) {
    console.error('YouTube API search error:', err);
    return [];
  }
};

export const searchYouTubePlaylists = async (query) => {
  try {
    const term = query?.trim() ? `${query.trim()} playlist` : 'Top Music Playlists 2026';
    const apiKey =
      import.meta.env.VITE_YOUTUBE_API_KEY ||
      import.meta.env.YOUTUBE_API_KEY ||
      'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=12&q=${encodeURIComponent(term)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.items) return [];

    return data.items.map((item) => ({
      id: item.id.playlistId,
      playlistId: item.id.playlistId,
      title: item.snippet.title
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&'),
      creator: item.snippet.channelTitle,
      user_name: item.snippet.channelTitle,
      cover: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      cover_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      type: 'Playlist',
    }));
  } catch (err) {
    console.error('YouTube playlist search error:', err);
    return [];
  }
};

