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

    return data.items
      .filter((item) => item.id && item.id.videoId)
      .map((item) => {
        const title = (item.snippet?.title || '')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#34;/g, '"');
        const channelTitle = item.snippet?.channelTitle || 'YouTube Artist';
        const videoId = item.id.videoId;
        const cover =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '';

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
          artwork: cover,
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

    return data.items
      .filter((item) => item.id && item.id.playlistId)
      .map((item) => {
        const title = (item.snippet?.title || '')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#34;/g, '"');
        const channelTitle = item.snippet?.channelTitle || 'YouTube Playlist';
        const playlistId = item.id.playlistId;
        const cover =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '';

        return {
          id: playlistId,
          playlistId: playlistId,
          title: title,
          creator: channelTitle,
          user_name: channelTitle,
          cover: cover,
          cover_url: cover,
          image_url: cover,
          image: cover,
          type: 'Playlist',
        };
      });
  } catch (err) {
    console.error('YouTube playlist search error:', err);
    return [];
  }
};


