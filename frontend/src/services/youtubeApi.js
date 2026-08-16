/**
 * YouTube Data API v3 Search Engine Service
 */
export const searchYouTubeMusic = async (query) => {
  try {
    const term = query?.trim() ? `${query.trim()} official audio` : 'Top Hits official music song';
    const apiKey =
      import.meta.env.VITE_YOUTUBE_API_KEY ||
      import.meta.env.YOUTUBE_API_KEY ||
      'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoDuration=medium&maxResults=25&q=${encodeURIComponent(term)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.items) return [];

    const forbiddenWords = [
      'compilation',
      'non stop',
      'nonstop',
      'full album',
      'hours',
      'mashup',
      'greatest hits mix',
      'collection',
      '100 songs',
      'top 100',
    ];

    return data.items
      .filter((item) => {
        if (!item.id || !item.id.videoId) return false;
        const titleLower = (item.snippet?.title || '').toLowerCase();
        return !forbiddenWords.some((word) => titleLower.includes(word));
      })
      .map((item) => {
        const title = (item.snippet?.title || '')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#34;/g, '"')
          .replace(/\(Official Audio\)/gi, '')
          .replace(/\(Official Music Video\)/gi, '')
          .replace(/\[Official Audio\]/gi, '')
          .replace(/\[Official Video\]/gi, '')
          .trim();

        const channelTitle = item.snippet?.channelTitle || 'Artist';
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
          album: 'Single',
          album_name: 'Single',
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

export const HIT_QUERIES = [
  'Die With A Smile Bruno Mars Lady Gaga official',
  'Espresso Sabrina Carpenter official',
  'Birds of a Feather Billie Eilish official',
  'Cruel Summer Taylor Swift official',
  'Blinding Lights The Weeknd official',
  'As It Was Harry Styles official',
  'Seven Jungkook Latto official',
  'Greedy Tate McRae official',
];

export const NEW_RELEASE_QUERIES = [
  'Sabrina Carpenter Taste official audio',
  'Billie Eilish Wildflower official audio',
  'The Weeknd Timeless official audio',
  'Chappell Roan Good Luck Babe official audio',
  'Gracie Abrams Us official audio',
  'Katy Perry Lifetimes official audio',
];

export const CHILL_QUERIES = [
  'Lofi Hip Hop beats to relax study to',
  'Coffee shop acoustic guitar chill vibes',
  'Night drives lofi aesthetic music',
  'Peaceful piano relaxation instrumental',
  'Sunday morning chill acoustic songs',
  'Midnight lofi ambient vibes',
];

export const fetchDiverseCategory = async (queriesList) => {
  if (!queriesList || !Array.isArray(queriesList)) return [];
  const results = await Promise.all(
    queriesList.map(async (query) => {
      try {
        const tracks = await searchYouTubeMusic(query);
        return tracks?.[0] || null;
      } catch (e) {
        return null;
      }
    })
  );
  return results.filter(Boolean);
};

export const POOL_OF_TRENDING_SETS = [
  // Set A: Pop & Viral Hits
  ['Die With A Smile Bruno Mars Lady Gaga', 'Espresso Sabrina Carpenter', 'Cruel Summer Taylor Swift', 'Greedy Tate McRae', 'Flowers Miley Cyrus', 'Vampire Olivia Rodrigo'],
  // Set B: R&B & Hip-Hop Chill
  ['Blinding Lights The Weeknd', 'Snooze SZA', 'Kill Bill SZA', 'Golden Hour JVKE', 'Starboy The Weeknd', 'Daylight David Kushner'],
  // Set C: Acoustic & Chill Vibes
  ['Until I Found You Stephen Sanchez', 'Riptide Vance Joy', 'Here With Me d4vd', 'Glimpse of Us Joji', 'Romantic Homicide d4vd', 'Sweater Weather The Neighbourhood'],
  // Set D: Global & Indie Hits
  ['Birds of a Feather Billie Eilish', 'As It Was Harry Styles', 'Seven Jungkook', 'Too Sweet Hozier', 'Water Tyla', 'Good Luck Babe Chappell Roan']
];

export const getPersonalizedQueriesForUser = (user, recentlyPlayed = [], favorites = []) => {
  const userId = user?.uid || user?.id || user?.email || 'guest';

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  const poolIndex = seed % POOL_OF_TRENDING_SETS.length;
  let baseSet = [...POOL_OF_TRENDING_SETS[poolIndex]];

  // Rotate/shuffle based on seed
  const rotation = seed % baseSet.length;
  baseSet = [...baseSet.slice(rotation), ...baseSet.slice(0, rotation)];

  // Inject top recent or favorite artist query if available
  const topArtist =
    recentlyPlayed?.[0]?.artist_name ||
    recentlyPlayed?.[0]?.artist ||
    favorites?.[0]?.artist_name ||
    favorites?.[0]?.artist;

  if (topArtist && topArtist.toLowerCase() !== 'unknown' && topArtist.toLowerCase() !== 'featured artist') {
    const artistQuery = `${topArtist} popular songs`;
    if (!baseSet.includes(artistQuery)) {
      baseSet.unshift(artistQuery);
    }
  }

  return baseSet.slice(0, 8);
};

export const searchYouTubeTracks = async (query) => {
  try {
    if (!query || !query.trim()) return [];
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';
    const term = `${query.trim()} official song audio`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoDuration=medium&maxResults=25&q=${encodeURIComponent(term)}&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data?.items) {
      console.warn('YouTube API returned no items or error:', data);
      return [];
    }

    return data.items.map((item) => {
      const cleanTitle = (item.snippet?.title || '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\(Official Audio\)/gi, '')
        .replace(/\(Official Music Video\)/gi, '')
        .replace(/\[Official Audio\]/gi, '')
        .replace(/\[Official Video\]/gi, '');
      const cover = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';
      const videoId = item.id?.videoId;

      return {
        id: videoId,
        videoId: videoId,
        title: cleanTitle.trim() || 'Untitled Track',
        artist: item.snippet?.channelTitle || 'YouTube Artist',
        artist_name: item.snippet?.channelTitle || 'YouTube Artist',
        album: 'Official Single',
        cover: cover,
        cover_url: cover,
        image: cover,
        image_url: cover,
        duration: 210,
      };
    });
  } catch (err) {
    console.error('Failed to search YouTube API:', err);
    return [];
  }
};






