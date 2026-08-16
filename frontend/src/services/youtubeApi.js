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

export const getYouTubePlaylistTracks = async (playlistId) => {
  try {
    const apiKey =
      import.meta.env.VITE_YOUTUBE_API_KEY ||
      import.meta.env.YOUTUBE_API_KEY ||
      'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.items) return [];

    return data.items
      .filter((item) => item.snippet?.title !== 'Private video' && item.snippet?.title !== 'Deleted video')
      .map((item) => {
        const videoId = item.snippet?.resourceId?.videoId;
        const title =
          item.snippet?.title
            ?.replace(/&quot;/g, '"')
            ?.replace(/&#39;/g, "'")
            ?.replace(/&amp;/g, '&')
            ?.replace(/&lt;/g, '<')
            ?.replace(/&gt;/g, '>')
            ?.replace(/&#34;/g, '"') || 'Unknown Title';
        const cover =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '';

        const artist = item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'Artist';

        return {
          id: videoId,
          videoId: videoId,
          youtubeId: videoId,
          title: title,
          artist: artist,
          artist_name: artist,
          album: 'YouTube Playlist',
          album_name: 'YouTube Playlist',
          cover: cover,
          cover_url: cover,
          image_url: cover,
          image: cover,
          artwork: cover,
          duration: 210,
        };
      });
  } catch (err) {
    console.error('Failed to fetch playlist tracks from YouTube:', err);
    return [];
  }
};

export const getYouTubePlaylistDetails = async (playlistId) => {
  try {
    const apiKey =
      import.meta.env.VITE_YOUTUBE_API_KEY ||
      import.meta.env.YOUTUBE_API_KEY ||
      'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.items || data.items.length === 0) return null;

    const item = data.items[0];
    const snippet = item.snippet || {};
    const title = (snippet.title || 'YouTube Playlist')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#34;/g, '"');
    const cover =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      '';

    return {
      id: playlistId,
      playlistId: playlistId,
      title: title,
      name: title,
      creator: snippet.channelTitle || 'YouTube',
      user_name: snippet.channelTitle || 'YouTube',
      description: snippet.description || '',
      cover: cover,
      cover_url: cover,
      image_url: cover,
      image: cover,
    };
  } catch (err) {
    console.error('Failed to fetch playlist details from YouTube:', err);
    return null;
  }
};



