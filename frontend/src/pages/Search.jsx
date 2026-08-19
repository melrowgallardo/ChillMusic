import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { FiSearch, FiPlay, FiPause, FiMoreVertical } from 'react-icons/fi';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useMusic() || {};

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const apiKey =
        import.meta.env.VITE_YOUTUBE_API_KEY ||
        import.meta.env.YOUTUBE_API_KEY ||
        'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';

      // 1. YouTube API Call
      let fetchedTracks = [];
      if (apiKey) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(
              searchQuery.trim() + ' music'
            )}&type=video&videoCategoryId=10&key=${apiKey}`
          );
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const videoIds = data.items.map((i) => i.id?.videoId || i.id).filter(Boolean).join(',');
            const detailRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
            );
            const detailData = await detailRes.json();

            fetchedTracks = (detailData.items || []).map((item) => {
              const match = (item.contentDetails?.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              const mins = parseInt(match?.[2] || 0, 10);
              const secs = parseInt(match?.[3] || 0, 10);
              return {
                id: item.id,
                youtubeId: item.id,
                title: item.snippet?.title?.replace(/(\(Official.*|\(Lyrics.*|\[Official.*|\[Lyrics.*)/gi, '').trim() || searchQuery,
                artist: item.snippet?.channelTitle || 'Artist',
                artist_name: item.snippet?.channelTitle || 'Artist',
                album: item.snippet?.channelTitle || 'Single',
                album_name: item.snippet?.channelTitle || 'Single',
                thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                image_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                cover_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                duration: `${mins}:${secs.toString().padStart(2, '0')}`,
                durationRaw: mins * 60 + secs || 210,
              };
            });
          }
        } catch (ytErr) {
          console.warn('YouTube API error:', ytErr);
        }
      }

      // 2. High Quality Music Fallback if API key has quota limits or no items
      if (fetchedTracks.length === 0) {
        try {
          const { searchYouTubeMusic } = await import('../services/youtubeService');
          fetchedTracks = await searchYouTubeMusic(searchQuery.trim());
        } catch (fallbackErr) {
          console.warn('Fallback search error:', fallbackErr);
        }
      }

      setSongs(fetchedTracks || []);
    } catch (err) {
      console.error('Search failure:', err);
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (track) => {
    if (currentTrack?.id === track.id || (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id)) {
      if (setIsPlaying) setIsPlaying(!isPlaying);
    } else {
      if (playTrack) playTrack(track);
    }
  };

  const songList = Array.isArray(songs) ? songs : [];

  return (
    <div className="search-page-container" style={{ padding: '32px 40px', color: '#fff', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '28px', color: '#ffffff' }}>
        Search & Discover
      </h1>

      {/* Original Full-Width Search Bar Layout */}
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'stretch', gap: '14px', marginBottom: '32px', width: '100%' }}>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#205c96',
          borderRadius: '12px',
          padding: '0 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <FiSearch style={{ color: '#9bc4e8', fontSize: '20px', marginRight: '14px', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              height: '56px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '500'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '14px',
            letterSpacing: '0.05em',
            borderRadius: '12px',
            padding: '0 36px',
            border: 'none',
            cursor: 'pointer',
            height: '56px',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
            transition: 'opacity 0.2s',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </form>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid #1e202f', paddingBottom: '14px', marginBottom: '20px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em' }}>
        <span style={{ color: '#a855f7', borderBottom: '2px solid #a855f7', paddingBottom: '14px', cursor: 'pointer' }}>
          SONGS ({songList.length})
        </span>
        <span style={{ color: '#64748b', cursor: 'pointer' }}>ARTISTS (0)</span>
        <span style={{ color: '#64748b', cursor: 'pointer' }}>ALBUMS (0)</span>
        <span style={{ color: '#64748b', cursor: 'pointer' }}>PLAYLISTS (0)</span>
      </div>

      {/* Table or Empty State */}
      {isLoading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>Loading tracks...</div>
      ) : songList.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
          No tracks available. Type a keyword and click Search.
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #1e202f' }}>
                <th style={{ padding: '14px 16px', width: '50px' }}># TITLE</th>
                <th style={{ padding: '14px 16px' }}></th>
                <th style={{ padding: '14px 16px' }}>ALBUM</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>DURATION</th>
                <th style={{ padding: '14px 16px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {songList.map((track, idx) => {
                const isCurrent =
                  currentTrack?.id === track.id ||
                  (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id) ||
                  (currentTrack?.id && track.youtubeId && currentTrack.id === track.youtubeId);

                return (
                  <tr
                    key={track.id || idx}
                    onClick={() => handleRowClick(track)}
                    style={{
                      borderBottom: '1px solid #13141f',
                      cursor: 'pointer',
                      backgroundColor: isCurrent ? '#19182a' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '14px 16px', color: '#64748b', width: '40px', fontSize: '14px' }}>
                      {isCurrent && isPlaying ? <FiPause style={{ color: '#a855f7' }} /> : idx + 1}
                    </td>
                    <td style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src={track.thumbnail || track.image_url || track.cover_url} alt={track.title} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: isCurrent ? '#a855f7' : '#ffffff' }}>{track.title}</p>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>{track.artist || track.artist_name}</p>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '14px' }}>{track.album || track.artist || 'Single'}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px', textAlign: 'right', fontFamily: 'monospace' }}>{track.duration || '3:30'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b' }}>
                      <FiMoreVertical size={16} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
