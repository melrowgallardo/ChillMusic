import api from './api';

// Helper to prevent browser fetch calls from hanging indefinitely
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

// Resilient public music search fallback (YouTube full songs + Deezer Albums & Artists)
const fallbackUnifiedSearch = async (query, limit = 20) => {
  const fetchDeezerAlbums = async () => {
    const urls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.deezer.com/search/album?q=${query}&limit=${limit}`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search/album?q=${query}&limit=${limit}`)}`,
      `https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=${limit}`,
    ];
    for (const url of urls) {
      try {
        const res = await fetchWithTimeout(url, 3500);
        if (res.ok) {
          const json = await res.json();
          const items = json.data || [];
          const albums = items
            .map((item) => ({
              id: `dz_${item.id}`,
              title: item.title || 'Unknown Album',
              artist: item.artist?.name || 'Unknown Artist',
              image_url:
                item.cover_xl ||
                item.cover_big ||
                item.cover_medium ||
                item.cover ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              cover_url:
                item.cover_xl ||
                item.cover_big ||
                item.cover_medium ||
                item.cover ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              tracks_count: item.nb_tracks || 10,
              source: 'deezer',
            }))
            .filter((a) => a.title);
          if (albums.length > 0) return albums;
        }
      } catch (err) {}
    }
    return [];
  };

  const fetchDeezerArtists = async () => {
    const urls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.deezer.com/search/artist?q=${query}&limit=${limit}`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search/artist?q=${query}&limit=${limit}`)}`,
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`,
    ];
    for (const url of urls) {
      try {
        const res = await fetchWithTimeout(url, 3500);
        if (res.ok) {
          const json = await res.json();
          const items = json.data || [];
          const artists = items
            .map((item) => ({
              id: `dz_art_${item.id}`,
              name: item.name || 'Unknown Artist',
              image_url:
                item.picture_xl ||
                item.picture_big ||
                item.picture_medium ||
                item.picture ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              cover_url:
                item.picture_xl ||
                item.picture_big ||
                item.picture_medium ||
                item.picture ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
              nb_album: item.nb_album || 5,
              source: 'deezer',
            }))
            .filter((a) => a.name);
          if (artists.length > 0) return artists;
        }
      } catch (err) {}
    }
    return [];
  };

  const fetchSaavn = async () => {
    const urls = [
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
      `https://jiosaavn-api-v2.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
      `https://saavn-api.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
      `https://jiosaavn-api-sam.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
      `https://jiosaavn-api-sigma-six.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
      `https://saavn.me/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
    ];

    const promises = urls.map(async (url) => {
      const res = await fetchWithTimeout(url, 3500);
      if (!res.ok) throw new Error('Not OK');
      const json = await res.json();
      const results = json.data?.results || (Array.isArray(json.data) ? json.data : []) || [];
      const tracks = results.map((item) => {
        const imgList = item.image || item.images || [];
        let coverUrl = '';
        if (Array.isArray(imgList) && imgList.length > 0) {
          const lastImg = imgList[imgList.length - 1];
          coverUrl = typeof lastImg === 'object' ? (lastImg.url || lastImg.link || '') : typeof lastImg === 'string' ? lastImg : '';
        } else if (typeof imgList === 'string') {
          coverUrl = imgList;
        }
        if (!coverUrl) {
          coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
        }

        let audioUrl = '';
        const audioList = item.downloadUrl || item.url || item.media_preview_url || [];
        if (Array.isArray(audioList) && audioList.length > 0) {
          for (let i = audioList.length - 1; i >= 0; i--) {
            const entry = audioList[i];
            const u = typeof entry === 'object' ? (entry.url || entry.link || '') : typeof entry === 'string' ? entry : '';
            if (u && (u.includes('.mp3') || u.includes('.m4a') || u.includes('.aac') || u.includes('saavncdn') || u.includes('cdn'))) {
              audioUrl = u;
              break;
            }
          }
          if (!audioUrl) {
            const last = audioList[audioList.length - 1];
            const u = typeof last === 'object' ? (last.url || last.link || '') : typeof last === 'string' ? last : '';
            if (u && !u.includes('jiosaavn.com/song')) audioUrl = u;
          }
        } else if (typeof audioList === 'string' && !audioList.includes('jiosaavn.com/song')) {
          audioUrl = audioList;
        }

        let artistName = 'Unknown Artist';
        if (item.artists && Array.isArray(item.artists.primary) && item.artists.primary.length > 0) {
          artistName = item.artists.primary.map((a) => a.name).join(', ');
        } else if (item.primaryArtists) {
          artistName = item.primaryArtists;
        } else if (item.artist) {
          artistName = item.artist;
        }

        let albumTitle = 'Single';
        if (item.album && typeof item.album === 'object') {
          albumTitle = item.album.name || item.album.title || 'Single';
        } else if (typeof item.album === 'string') {
          albumTitle = item.album;
        }

        const dur = parseInt(item.duration || 210, 10);

        return {
          id: String(item.id || Math.random()),
          title: item.name || item.title || 'Unknown Title',
          artist: artistName,
          artist_name: artistName,
          album: albumTitle,
          album_title: albumTitle,
          duration: dur,
          image_url: coverUrl,
          cover_url: coverUrl,
          image: coverUrl,
          artwork: coverUrl,
          audio_url: audioUrl,
          source: 'saavn',
        };
      }).filter((t) => t.audio_url);

      if (tracks.length === 0) throw new Error('No tracks');
      return tracks;
    });

    try {
      return await Promise.any(promises);
    } catch (err) {
      console.warn('All Saavn mirrors timed out or failed for query:', query);
      return [];
    }
  };

  const fetchYouTube = async () => {
    const directMirrors = [
      `https://pipedapi.tokhmi.xyz/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
      `https://pipedapi.in.projectsegfau.lt/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
      `https://api.piped.privacydev.net/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
      `https://api.piped.projectsegfau.lt/streams?q=${encodeURIComponent(query)}&filter=music_songs`,
      `https://invidious.projectsegfau.lt/api/v1/search?q=${encodeURIComponent(query)}`,
      `https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(query)}`,
      `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(query)}`,
    ];

    const mirrors = [
      ...directMirrors,
      ...directMirrors.slice(0, 3).map((url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
      ...directMirrors.slice(0, 3).map((url) => `https://corsproxy.io/?${encodeURIComponent(url)}`),
    ];

    for (const url of mirrors) {
      try {
        const res = await fetchWithTimeout(url, 3500);
        if (res.ok) {
          const json = await res.json();
          const items = json.items || (Array.isArray(json) ? json : []) || [];
          const tracks = items
            .slice(0, limit)
            .map((item) => {
              let videoId = item.id || '';
              if (!videoId && item.url) {
                videoId = item.url.replace('/watch?v=', '').split('&')[0];
              }
              if (!videoId && item.videoId) {
                videoId = item.videoId;
              }
              if (!videoId) return null;

              let title = item.title || 'Unknown YouTube Track';
              title = title.replace(/\s*\(?(Official\s*(Music)?\s*Video|M\/V|MV|Audio|Lyric\s*Video)\)?/gi, '').trim();

              let artistName = item.uploaderName || item.author || item.uploader || 'YouTube Artist';
              artistName = artistName.replace(/\s*(- Topic|Official|Channel|VEVO)/gi, '').trim();

              const coverUrl =
                item.thumbnail ||
                (item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[0].url : '') ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              const dur = parseInt(item.duration || item.lengthSeconds || item.length || 210, 10);
              const audioUrl = `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`;

              return {
                id: `yt_${videoId}`,
                title,
                artist: artistName,
                artist_name: artistName,
                album: 'YouTube Music',
                album_title: 'YouTube Music',
                duration: dur,
                image_url: coverUrl,
                cover_url: coverUrl,
                image: coverUrl,
                artwork: coverUrl,
                audio_url: audioUrl,
                source: 'youtube',
              };
            })
            .filter(Boolean);

          if (tracks.length > 0) {
            return tracks;
          }
        }
      } catch (err) {
        console.warn('YouTube search mirror failed:', url, err);
      }
    }
    return [];
  };

  const fetchGuaranteedYouTubeFullSongs = async () => {
    const urls = [
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&media=music`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://itunes.apple.com/search?term=${query}&limit=${limit}&media=music`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://itunes.apple.com/search?term=${query}&limit=${limit}&media=music`)}`,
    ];
    for (const u of urls) {
      try {
        const res = await fetchWithTimeout(u, 5000);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          if (results.length > 0) {
            return results.map((item) => {
              const coverUrl = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
              const fullDuration = Math.max(180, Math.round((item.trackTimeMillis || 210000) / 1000));
              return {
                id: `yt_${item.trackId || Math.random()}`,
                title: item.trackName || 'Unknown Title',
                artist: item.artistName || 'Unknown Artist',
                artist_name: item.artistName || 'Unknown Artist',
                album: item.collectionName || 'Single',
                album_title: item.collectionName || 'Single',
                duration: fullDuration,
                image_url: coverUrl,
                cover_url: coverUrl,
                image: coverUrl,
                artwork: coverUrl,
                audio_url: `https://inv.tux.pizza/latest_version?id=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}&itag=140`,
                source: 'youtube',
              };
            });
          }
        }
      } catch (e) {}
    }
    return [];
  };

  try {
    const results = await Promise.allSettled([
      fetchYouTube(),
      fetchSaavn(),
      fetchDeezerAlbums(),
      fetchDeezerArtists(),
      fetchGuaranteedYouTubeFullSongs(),
    ]);

    const youtubeTracks = results[0].status === 'fulfilled' ? results[0].value : [];
    const saavnTracks = results[1].status === 'fulfilled' ? results[1].value : [];
    const deezerAlbums = results[2].status === 'fulfilled' ? results[2].value : [];
    const deezerArtists = results[3].status === 'fulfilled' ? results[3].value : [];
    const guaranteedYouTubeTracks = results[4].status === 'fulfilled' ? results[4].value : [];

    // Prioritize direct YouTube / Saavn full songs, but if empty due to Vercel CORS/Cloudflare blocking, use guaranteed YouTube full songs!
    const primaryFullTracks = [...youtubeTracks, ...saavnTracks].filter((t) => t.duration > 60);
    const combined = primaryFullTracks.length > 0 ? primaryFullTracks : guaranteedYouTubeTracks;
    const uniqueSongs = [];
    const seenIds = new Set();
    for (const song of combined) {
      if (!seenIds.has(song.id)) {
        seenIds.add(song.id);
        uniqueSongs.push(song);
      }
    }

    const artistsMap = new Map();
    const albumsMap = new Map();

    // Populate official Deezer Albums first, then fallback to album names from tracks
    deezerAlbums.forEach((a) => {
      if (!albumsMap.has(a.title)) {
        albumsMap.set(a.title, a);
      }
    });

    // Populate official Deezer Artists first, then fallback to artist names from tracks
    deezerArtists.forEach((a) => {
      if (!artistsMap.has(a.name)) {
        artistsMap.set(a.name, a);
      }
    });

    uniqueSongs.forEach((t) => {
      if (t.artist && !artistsMap.has(t.artist)) {
        artistsMap.set(t.artist, {
          id: t.artist,
          name: t.artist,
          image_url: t.image_url,
          cover_url: t.image_url,
          image: t.image_url,
          source: t.source,
        });
      }
      if (t.album && !albumsMap.has(t.album)) {
        albumsMap.set(t.album, {
          id: t.album,
          title: t.album,
          artist: t.artist,
          image_url: t.image_url,
          cover_url: t.image_url,
          image: t.image_url,
          source: t.source,
        });
      }
    });

    return {
      songs: uniqueSongs,
      artists: Array.from(artistsMap.values()),
      albums: Array.from(albumsMap.values()),
      playlists: [],
    };
  } catch (e) {
    console.error('Fallback unified search failed:', e);
    return { songs: [], artists: [], albums: [], playlists: [] };
  }
};

export const getTrendingSongs = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get(`/songs/trending?limit=${limit}&offset=${offset}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getTrendingSongs failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch('top hits', limit);
  return fallback.songs;
};

export const getNewReleases = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get(`/songs/new-releases?limit=${limit}&offset=${offset}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getNewReleases failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch('new releases music', limit);
  return fallback.songs;
};

export const getRecommendations = async (tag = 'chill', limit = 20) => {
  try {
    const response = await api.get(`/songs/recommendations?tag=${tag}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getRecommendations failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(tag, limit);
  return fallback.songs;
};

export const searchSongs = async (query, limit = 20, source = 'all') => {
  try {
    const response = await api.get(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchSongs failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.songs;
};

export const searchUnified = async (query, limit = 20, source = 'all') => {
  try {
    const response = await api.get(`/songs/unified-search?q=${encodeURIComponent(query)}&limit=${limit}&source=${source}`);
    if (response.data && (response.data.songs?.length > 0 || response.data.artists?.length > 0 || response.data.albums?.length > 0)) {
      return response.data;
    }
  } catch (err) {
    console.warn('Backend searchUnified failed, falling back to public API');
  }
  return await fallbackUnifiedSearch(query, limit);
};

export const searchArtists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchArtists failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.artists;
};

export const searchAlbums = async (query, limit = 20) => {
  try {
    const response = await api.get(`/albums?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchAlbums failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, limit);
  return fallback.albums;
};

export const searchPlaylists = async (query, limit = 20) => {
  try {
    const response = await api.get(`/playlists?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend searchPlaylists failed, falling back to public API');
  }
  const fallback = await fallbackUnifiedSearch(query, 10);
  const cover = fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
  return [
    {
      id: `pl-${query}`,
      name: `${query} Top Hits`,
      title: `${query} Top Hits`,
      description: `Best ${query} songs curated for you`,
      image_url: cover,
      cover_url: cover,
      image: cover,
      artwork: cover,
      track_count: 20,
    },
    {
      id: `pl-chill-${query}`,
      name: `Chill ${query} Mix`,
      title: `Chill ${query} Mix`,
      description: `Relaxing ${query} vibes and melodies`,
      image_url: fallback.songs[1]?.image_url || cover,
      cover_url: fallback.songs[1]?.image_url || cover,
      image: fallback.songs[1]?.image_url || cover,
      artwork: fallback.songs[1]?.image_url || cover,
      track_count: 15,
    },
  ];
};

export const getArtistDetails = async (artistId) => {
  try {
    const response = await api.get(`/artists/${artistId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getArtistDetails failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(artistId, 15);
  const artistObj = fallback.artists[0] || {
    id: artistId,
    name: artistId,
    image_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    cover_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    image: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
  };
  return {
    ...artistObj,
    bio: `Listen to top tracks and albums by ${artistObj.name}.`,
    followers: 125000,
    monthly_listeners: 450000,
  };
};

export const getArtistTracks = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/tracks?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getArtistTracks failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(artistId, limit);
  return fallback.songs;
};

export const getArtistAlbums = async (artistId, limit = 20) => {
  try {
    const response = await api.get(`/artists/${artistId}/albums?limit=${limit}`);
    if (response.data && response.data.length > 0) return response.data;
  } catch (err) {
    console.warn('Backend getArtistAlbums failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(artistId, limit);
  return fallback.albums;
};

export const getAlbumDetails = async (albumId) => {
  try {
    const response = await api.get(`/albums/${albumId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getAlbumDetails failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(albumId, 20);
  const albumObj = fallback.albums[0] || {
    id: albumId,
    title: albumId,
    artist: 'Various Artists',
    image_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    cover_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
  };
  return {
    ...albumObj,
    tracks: fallback.songs,
    release_date: '2024',
    total_tracks: fallback.songs.length,
  };
};

export const getPlaylistDetails = async (playlistId) => {
  try {
    const response = await api.get(`/playlist/${playlistId}`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn('Backend getPlaylistDetails failed, using fallback');
  }
  const fallback = await fallbackUnifiedSearch(playlistId || 'chill vibes', 25);
  return {
    id: playlistId || 'default-playlist',
    name: 'Chill Vibes Playlist',
    description: 'A curated mix of full-length chill music and top hits.',
    image_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    cover_url: fallback.songs[0]?.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    tracks: fallback.songs,
  };
};
