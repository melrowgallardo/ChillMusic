import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid, Skeleton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import HistoryIcon from '@mui/icons-material/History';
import {
  searchYouTubeMusic,
  searchYouTubePlaylists,
  fetchDiverseCategory,
  HIT_QUERIES,
  NEW_RELEASE_QUERIES,
  CHILL_QUERIES,
  getPersonalizedQueriesForUser,
} from '../services/youtubeApi';
import { searchArtists } from '../services/jamendo';
import TrackCard from '../components/Track/TrackCard';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import ArtistCard from '../components/Artist/ArtistCard';
import AudioVisualizer from '../components/Player/AudioVisualizer';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../services/firestoreService';

const Home = () => {
  const { playTrack, currentTrack, isPlaying, togglePlayPause, recentlyPlayed, favorites } = usePlayer();
  const { user } = useAuth();
  const [recentTracks, setRecentTracks] = useState([]);
  const [hitsTracks, setHitsTracks] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [newReleaseTracks, setNewReleaseTracks] = useState([]);
  const [chillTracks, setChillTracks] = useState([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeRecentlyPlayed = Array.isArray(recentlyPlayed) ? recentlyPlayed : [];
  const safeRecentTracks = Array.isArray(recentTracks) ? recentTracks : [];
  const safeHitsTracks = Array.isArray(hitsTracks) ? hitsTracks : [];
  const safeTrendingTracks = Array.isArray(trendingTracks) ? trendingTracks : [];
  const safeNewReleaseTracks = Array.isArray(newReleaseTracks) ? newReleaseTracks : [];
  const safeChillTracks = Array.isArray(chillTracks) ? chillTracks : [];

  const displayedRecent = safeRecentlyPlayed.length > 0 ? safeRecentlyPlayed : safeRecentTracks;


  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      setLoading(true);

      const userKey = user?.uid || user?.id || user?.email || 'guest';
      const cacheKey = `home_feed_${userKey}`;

      // Check sessionStorage cache for per-user feed
      try {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed && parsed.hitsTracks && parsed.hitsTracks.length > 0) {
            if (isMounted) {
              setHitsTracks(parsed.hitsTracks);
              setTrendingTracks(parsed.trendingTracks || [...parsed.hitsTracks].reverse());
              setNewReleaseTracks(parsed.newReleaseTracks || []);
              setChillTracks(parsed.chillTracks || []);
              setFeaturedPlaylists(parsed.featuredPlaylists || []);
              if (parsed.artists) setArtists(parsed.artists);
              setLoading(false);
            }
            return;
          }
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }

      // 1. Fetch Recently Played History
      try {
        const historyData = await getHistory(15);
        if (isMounted && historyData && historyData.length > 0) {
          const uniqueHistory = [];
          const seenIds = new Set();
          for (const item of historyData) {
            if (!seenIds.has(item.song_id || item.id)) {
              seenIds.add(item.song_id || item.id);
              uniqueHistory.push({
                id: item.song_id || item.id,
                title: item.song_title || item.title,
                artist_name: item.artist_name || item.artist,
                album_name: item.album_name || item.album || 'Single',
                audio_url: item.audio_url,
                image_url: item.image_url || item.cover_url,
                duration: item.duration || 180,
              });
            }
          }
          setRecentTracks(uniqueHistory.slice(0, 6));
        }
      } catch (err) {
        console.warn('Could not fetch online history:', err);
      }

      // 2. Fetch Personalized YouTube Categories & Playlists dynamically via YouTube Data API
      try {
        const userQueries = getPersonalizedQueriesForUser(user, recentlyPlayed, favorites);
        const [hitsRes, newRelRes, chillRes, playlistsRes, artistsRes] = await Promise.all([
          fetchDiverseCategory(userQueries).catch(() => []),
          fetchDiverseCategory(NEW_RELEASE_QUERIES).catch(() => []),
          fetchDiverseCategory(CHILL_QUERIES).catch(() => []),
          searchYouTubePlaylists('Top Hits Playlist').catch(() => []),
          searchArtists('lofi', 6).catch(() => []),
        ]);

        if (isMounted) {
          const hits = hitsRes.length > 0 ? hitsRes : [];
          const trending = hits.length > 0 ? [...hits].reverse() : [];
          const newRel = newRelRes.length > 0 ? newRelRes : [];
          const chill = chillRes.length > 0 ? chillRes : [];
          const playlists = playlistsRes.length > 0 ? playlistsRes : [];

          setHitsTracks(hits);
          setTrendingTracks(trending);
          setNewReleaseTracks(newRel);
          setChillTracks(chill);
          setFeaturedPlaylists(playlists);
          if (artistsRes && artistsRes.length > 0) {
            setArtists(artistsRes);
          }

          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                hitsTracks: hits,
                trendingTracks: trending,
                newReleaseTracks: newRel,
                chillTracks: chill,
                featuredPlaylists: playlists,
                artists: artistsRes || [],
              })
            );
          } catch (e) {}
        }
      } catch (err) {
        console.error('Error fetching homepage YouTube categories:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const heroTrack =
    currentTrack ||
    (hitsTracks && hitsTracks.length > 0 ? hitsTracks[0] : null) ||
    (trendingTracks && trendingTracks.length > 0 ? trendingTracks[0] : null) ||
    (newReleaseTracks && newReleaseTracks.length > 0 ? newReleaseTracks[0] : null) ||
    (chillTracks && chillTracks.length > 0 ? chillTracks[0] : null);

  const trackPool =
    hitsTracks.length > 0
      ? hitsTracks
      : trendingTracks.length > 0
      ? trendingTracks
      : newReleaseTracks.length > 0
      ? newReleaseTracks
      : chillTracks;

  const isCurrentHeroTrack = Boolean(
    currentTrack && heroTrack && String(currentTrack.id) === String(heroTrack.id)
  );
  const isBannerPlaying = isCurrentHeroTrack && isPlaying;

  const handleBannerPlayClick = () => {
    if (isCurrentHeroTrack) {
      togglePlayPause();
    } else if (heroTrack) {
      playTrack(heroTrack, trackPool, 0);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Hero Banner */}
      {heroTrack ? (
        <Box
          className="glass-panel"
          sx={{
            p: { xs: 3, md: 4 },
            position: 'relative',
            overflow: 'hidden',
            background: isBannerPlaying
              ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.35) 0%, rgba(124, 58, 237, 0.4) 100%)'
              : 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(6, 182, 212, 0.2) 100%)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            flexDirection: { xs: 'column-reverse', md: 'row' },
            transition: 'background 0.5s ease',
          }}
        >
          <Box sx={{ flex: 1, zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 3,
                  color: isBannerPlaying ? 'var(--accent-pink)' : 'var(--accent-secondary)',
                  fontWeight: 700,
                }}
              >
                {isCurrentHeroTrack ? 'NOW PLAYING' : 'FEATURED TRACK'}
              </Typography>
              {isBannerPlaying && <AudioVisualizer isPlaying={true} />}
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
              {heroTrack.title}
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
              By {heroTrack.artist_name || heroTrack.artist || 'Featured Artist'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={isBannerPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                onClick={handleBannerPlayClick}
                sx={{
                  backgroundColor: isBannerPlaying ? 'var(--accent-pink)' : 'var(--accent-primary)',
                  borderRadius: 'var(--radius-full)',
                  px: 3.5,
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: isBannerPlaying ? '0 0 15px rgba(236, 72, 153, 0.6)' : 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: isBannerPlaying ? '#db2777' : '#6d28d9',
                    boxShadow: '0 0 20px var(--accent-glow)',
                  },
                }}
              >
                {isBannerPlaying ? 'Pause' : (isCurrentHeroTrack ? 'Resume' : 'Play Now')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShuffleIcon />}
                onClick={() => {
                  if (trackPool && trackPool.length > 0) {
                    const randomIdx = Math.floor(Math.random() * trackPool.length);
                    playTrack(trackPool[randomIdx], trackPool, randomIdx);
                  }
                }}
                sx={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-full)',
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                }}
              >
                Shuffle
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={
                heroTrack.cover ||
                heroTrack.cover_url ||
                heroTrack.image_url ||
                heroTrack.image ||
                heroTrack.artwork ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'
              }
              alt={heroTrack.title}
              sx={{
                width: { xs: 180, sm: 220 },
                height: { xs: 180, sm: 220 },
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                boxShadow: isBannerPlaying
                  ? '0 0 25px rgba(236, 72, 153, 0.6), 0 15px 35px rgba(0, 0, 0, 0.5)'
                  : '0 15px 35px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.4s ease',
              }}
            />
            {isBannerPlaying && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 'var(--radius-full)',
                  px: 1.5,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  border: '1px solid rgba(236, 72, 153, 0.5)',
                }}
              >
                <AudioVisualizer isPlaying={true} />
              </Box>
            )}
          </Box>
        </Box>
      ) : loading ? (
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-glass-card)' }} />
      ) : null}

      {/* Recently Played Section */}
      {displayedRecent.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <HistoryIcon sx={{ color: 'var(--accent-secondary)' }} />
            <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Recently Played
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, WebkitOverflowScrolling: 'touch', mx: -2, px: 2 }}>
            {displayedRecent.map((track) => (
              <Box key={`recent-${track.id}`} sx={{ minWidth: { xs: 150, sm: 180, md: 200 }, scrollSnapAlign: 'start' }}>
                <TrackCard track={track} queue={displayedRecent} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* YouTube Music Hits Section */}
      {hitsTracks.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            📺 YouTube Music Hits
          </Typography>
          <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, WebkitOverflowScrolling: 'touch', mx: -2, px: 2 }}>
            {hitsTracks.slice(0, 10).map((track) => (
              <Box key={`yt-${track.id}`} sx={{ minWidth: { xs: 150, sm: 180, md: 200 }, scrollSnapAlign: 'start' }}>
                <TrackCard track={track} queue={hitsTracks} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Trending Section */}
      {trendingTracks.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🔥 Trending Songs
          </Typography>
          <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, WebkitOverflowScrolling: 'touch', mx: -2, px: 2 }}>
            {trendingTracks.slice(0, 10).map((track) => (
              <Box key={`tr-${track.id}`} sx={{ minWidth: { xs: 150, sm: 180, md: 200 }, scrollSnapAlign: 'start' }}>
                <TrackCard track={track} queue={trendingTracks} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* New Releases Section */}
      {newReleaseTracks.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            ✨ New Releases
          </Typography>
          <Grid container spacing={2.5}>
            {newReleaseTracks.slice(0, 12).map((track) => (
              <Grid item xs={6} sm={4} md={2} key={`nr-${track.id}`}>
                <TrackCard track={track} queue={newReleaseTracks} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recommendations */}
      {chillTracks.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🎧 Recommended Chill Vibes
          </Typography>
          <Grid container spacing={2.5}>
            {chillTracks.slice(0, 12).map((track) => (
              <Grid item xs={6} sm={4} md={2} key={`chill-${track.id}`}>
                <TrackCard track={track} queue={chillTracks} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Featured Playlists */}
      {featuredPlaylists.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🎶 Featured Playlists
          </Typography>
          <Grid container spacing={2.5}>
            {featuredPlaylists.map((playlist) => (
              <Grid item xs={6} sm={4} md={2} key={`pl-${playlist.id}`}>
                <PlaylistCard playlist={playlist} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Top Artists */}
      {artists.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🌟 Popular Artists
          </Typography>
          <Grid container spacing={2.5}>
            {artists.map((artist) => (
              <Grid item xs={6} sm={4} md={2} key={`art-${artist.id}`}>
                <ArtistCard artist={artist} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default Home;

