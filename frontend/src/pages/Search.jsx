import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Tabs, Tab, Chip, Grid, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import { searchFullTracks } from '../services/musicApi';
import TrackList from '../components/Track/TrackList';
import ArtistCard from '../components/Artist/ArtistCard';
import AlbumCard from '../components/Album/AlbumCard';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { FALLBACK_TRACKS, FALLBACK_PLAYLISTS, FALLBACK_ALBUMS } from '../services/mockData';

import { normalizeTrack } from '../utils/trackUtils';

const GENRE_TAGS = ['Chill', 'Lofi', 'Ambient', 'Electronic', 'Jazz', 'Rock', 'Pop', 'Acoustic', 'Piano', 'Hip Hop'];

const extractArtistsAndAlbums = (songsList = []) => {
  const artistMap = new Map();
  const albumMap = new Map();

  songsList.forEach((item) => {
    if (!item) return;

    // Extract Artist
    const artistName = (item.artist || item.artist_name || item.primaryArtists || '').trim();
    if (artistName && artistName !== 'Various Artists' && artistName !== 'Unknown Artist') {
      const artKey = artistName.toLowerCase();
      const cover = item.cover || item.cover_url || item.image_url || item.image || item.artwork;
      if (!artistMap.has(artKey)) {
        artistMap.set(artKey, {
          id: `art_${artKey.replace(/[^a-z0-9]/g, '_')}`,
          name: artistName,
          imageUrl: cover || '',
          image_url: cover || '',
          cover_url: cover || '',
          image: cover || '',
          genres: item.genre || 'Artist',
          followers: null,
          type: 'Artist',
        });
      }
    }

    // Extract Album
    const albumName = (item.album || item.album_name || '').trim();
    if (albumName && albumName !== 'Single') {
      const albKey = albumName.toLowerCase();
      const cover = item.cover || item.cover_url || item.image_url || item.image || item.artwork;
      if (!albumMap.has(albKey)) {
        albumMap.set(albKey, {
          id: `alb_${albKey.replace(/[^a-z0-9]/g, '_')}`,
          name: albumName,
          title: albumName,
          artist_name: artistName || 'Various Artists',
          artist: artistName || 'Various Artists',
          cover_url: cover || '',
          image_url: cover || '',
          cover: cover || '',
          image: cover || '',
          release_date: '2024',
        });
      }
    }
  });

  return {
    artists: Array.from(artistMap.values()),
    albums: Array.from(albumMap.values()),
  };
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(0); // 0: Songs, 1: Artists, 2: Albums, 3: Playlists
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchReqId = useRef(0);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    } else {
      performSearch(query);
    }
  }, [searchParams]);

  // Debounced live typing search (500ms optimal typing balance)
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      setSearchParams({ q: query.trim() }, { replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchTerm) => {
    const term = (!searchTerm || !searchTerm.trim()) ? 'Top Hits' : searchTerm.trim();
    const currentReq = ++searchReqId.current;
    setLoading(true);
    try {
      const saavnTracks = await searchFullTracks(term);
      if (currentReq === searchReqId.current) {
        const dynamicSongs = (saavnTracks && saavnTracks.length > 0 ? saavnTracks : FALLBACK_TRACKS).map(normalizeTrack);
        const { artists: dynamicArtists, albums: dynamicAlbums } = extractArtistsAndAlbums(dynamicSongs);

        setSongs(dynamicSongs);
        setArtists(dynamicArtists.length > 0 ? dynamicArtists : extractArtistsAndAlbums(FALLBACK_TRACKS).artists);
        setAlbums(dynamicAlbums.length > 0 ? dynamicAlbums : FALLBACK_ALBUMS);
        setPlaylists(FALLBACK_PLAYLISTS);
      }
    } catch (err) {
      console.error('Search failed:', err);
      if (currentReq === searchReqId.current) {
        const fallbackSongs = FALLBACK_TRACKS.map(normalizeTrack);
        const { artists: fallbackArtists, albums: fallbackAlbums } = extractArtistsAndAlbums(fallbackSongs);
        setSongs(fallbackSongs);
        setArtists(fallbackArtists);
        setAlbums(fallbackAlbums.length > 0 ? fallbackAlbums : FALLBACK_ALBUMS);
        setPlaylists(FALLBACK_PLAYLISTS);
      }
    } finally {
      if (currentReq === searchReqId.current) {
        setLoading(false);
      }
    }
  };

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const handleChipClick = (tag) => {
    setQuery(tag);
    setSearchParams({ q: tag });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Search Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Search & Discover
        </Typography>

        <form onSubmit={handleQuerySubmit}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Search songs, artists, albums, or playlists..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'var(--text-muted)', mr: 1.5 }} />,
              }}
              sx={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700, px: 3 }}
            >
              Search
            </Button>
          </Box>
        </form>




      </Box>

      {/* Result Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        textColor="inherit"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: '1px solid var(--border-color)',
          '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-primary)', height: 3 },
        }}
      >
        <Tab label={`Songs (${songs.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Artists (${artists.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Albums (${albums.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Playlists (${playlists.length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {loading ? (
        <LoadingSpinner message="Searching music catalog..." />
      ) : (
        <Box sx={{ mt: 1 }}>
          {activeTab === 0 && <TrackList tracks={songs} />}

          {activeTab === 1 && (
            <Grid container spacing={2.5}>
              {artists.map((artist) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={artist.id}>
                  <ArtistCard artist={artist} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2.5}>
              {albums.map((album) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={album.id}>
                  <AlbumCard album={album} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={2.5}>
              {playlists.map((playlist) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={playlist.id}>
                  <PlaylistCard playlist={playlist} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Search;
