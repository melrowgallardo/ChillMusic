import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { FiSearch, FiPlay, FiPause, FiMoreVertical } from 'react-icons/fi';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useMusic() || {};

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const apiKey =
        import.meta.env.VITE_YOUTUBE_API_KEY ||
        import.meta.env.YOUTUBE_API_KEY ||
        'AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA';

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(
          query + ' official audio'
        )}&type=video&videoCategoryId=10&key=${apiKey}`
      );
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const videoIds = data.items.map((i) => i.id?.videoId || i.id).filter(Boolean).join(',');
        const detailsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
        );
        const detailsData = await detailsRes.json();

        const formatted = (detailsData.items || []).map((item) => {
          // Duration parser
          const match = (item.contentDetails?.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          const mins = parseInt(match?.[2] || 0, 10);
          const secs = parseInt(match?.[3] || 0, 10);
          const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;

          return {
            id: item.id,
            youtubeId: item.id,
            title: item.snippet?.title?.replace(/(\(Official.*|\(Lyrics.*|\[Official.*|\[Lyrics.*)/gi, '').trim() || query,
            artist: item.snippet?.channelTitle || 'Artist',
            artist_name: item.snippet?.channelTitle || 'Artist',
            album: item.snippet?.channelTitle || 'YouTube Music',
            album_name: item.snippet?.channelTitle || 'YouTube Music',
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            image_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            cover_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            duration: durStr || '3:30',
            durationRaw: mins * 60 + secs || 210,
          };
        });

        setResults(formatted);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search API error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id || (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id)) {
      if (setIsPlaying) setIsPlaying(!isPlaying);
    } else {
      if (playTrack) playTrack(track);
    }
  };

  return (
    <div style={{ padding: '32px', color: '#ffffff', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px' }}>Search & Discover</h1>

      {/* Guaranteed Styled Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px', width: '100%', maxWidth: '800px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '18px' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists (e.g. Taylor Swift, Twice)..."
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              backgroundColor: '#181824',
              border: '1px solid #2a2b3d',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0 32px',
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'background 0.2s',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </form>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #2a2b3d', paddingBottom: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '700' }}>
        <span style={{ color: '#a855f7', borderBottom: '2px solid #a855f7', paddingBottom: '12px', cursor: 'pointer' }}>
          SONGS ({results.length})
        </span>
        <span style={{ color: '#6b7280', cursor: 'pointer' }}>ARTISTS (0)</span>
        <span style={{ color: '#6b7280', cursor: 'pointer' }}>ALBUMS (0)</span>
        <span style={{ color: '#6b7280', cursor: 'pointer' }}>PLAYLISTS (0)</span>
      </div>

      {/* Results Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#9ca3af' }}>Searching YouTube Music for "{query}"...</div>
      ) : results.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7280' }}>No tracks available. Type a keyword and click Search.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #2a2b3d' }}>
              <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '12px 16px' }}>TITLE</th>
              <th style={{ padding: '12px 16px' }}>ALBUM / CHANNEL</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>DURATION</th>
              <th style={{ padding: '12px 16px', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {results.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id || (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id);
              return (
                <tr
                  key={track.id || idx}
                  onClick={() => handlePlay(track)}
                  style={{
                    borderBottom: '1px solid #1e202f',
                    cursor: 'pointer',
                    backgroundColor: isCurrent ? '#1f1f2e' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#181824')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isCurrent ? '#1f1f2e' : 'transparent')}
                >
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: isCurrent ? '#a855f7' : '#9ca3af', fontSize: '14px' }}>
                    {isCurrent && isPlaying ? <FiPause /> : idx + 1}
                  </td>
                  <td style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src={track.thumbnail} alt={track.title} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: isCurrent ? '#a855f7' : '#ffffff' }}>{track.title}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>{track.artist}</p>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '14px' }}>{track.album}</td>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '13px', textAlign: 'right', fontFamily: 'monospace' }}>{track.duration}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#9ca3af' }}>
                    <FiMoreVertical size={16} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
