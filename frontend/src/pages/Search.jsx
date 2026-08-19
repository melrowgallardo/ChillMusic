import React, { useState } from 'react';
import { searchYouTubeMusic } from '../services/youtubeService';
import { useMusic } from '../context/MusicContext';
import { FiSearch, FiPlay, FiPause, FiMoreVertical } from 'react-icons/fi';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [activeTab, setActiveTab] = useState('songs');
  const [isLoading, setIsLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useMusic() || {};

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const results = await searchYouTubeMusic(searchQuery.trim());
      setSongs(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search error:', err);
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackPlay = (track) => {
    if (currentTrack?.id === track.id || (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id)) {
      if (setIsPlaying) setIsPlaying(!isPlaying);
    } else {
      if (playTrack) playTrack(track);
    }
  };

  const songList = Array.isArray(songs) ? songs : [];

  return (
    <div className="min-h-screen p-8 text-white space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Search & Discover</h1>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <FiSearch size={20} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists (e.g. Twice, Taylor Swift)..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#181824] border border-[#2a2b3d] rounded-xl text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-xl text-sm tracking-wider uppercase transition shadow-lg disabled:opacity-50 flex items-center justify-center min-w-[120px] cursor-pointer"
        >
          {isLoading ? 'Searching...' : 'SEARCH'}
        </button>
      </form>

      {/* Category Tabs */}
      <div className="flex items-center gap-6 border-b border-[#2a2b3d] pt-2 text-sm font-semibold tracking-wide uppercase">
        <button
          type="button"
          onClick={() => setActiveTab('songs')}
          className={`pb-3.5 border-b-2 transition cursor-pointer ${
            activeTab === 'songs'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          SONGS ({songList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('artists')}
          className={`pb-3.5 border-b-2 transition cursor-pointer ${
            activeTab === 'artists'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          ARTISTS (0)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('albums')}
          className={`pb-3.5 border-b-2 transition cursor-pointer ${
            activeTab === 'albums'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          ALBUMS (0)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('playlists')}
          className={`pb-3.5 border-b-2 transition cursor-pointer ${
            activeTab === 'playlists'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          PLAYLISTS (0)
        </button>
      </div>

      {/* Search Results Display */}
      <div className="pt-2">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">
            <p className="text-base">Searching YouTube Music...</p>
          </div>
        ) : songList.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            <p className="text-base">No tracks available. Type a keyword and click Search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-[#2a2b3d]/60">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">TITLE</th>
                  <th className="py-3 px-4 hidden md:table-cell">ALBUM / CHANNEL</th>
                  <th className="py-3 px-4 text-right">DURATION</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202f]">
                {songList.map((track, index) => {
                  const isCurrent =
                    currentTrack?.id === track.id ||
                    (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id) ||
                    (currentTrack?.id && track.youtubeId && currentTrack.id === track.youtubeId);

                  return (
                    <tr
                      key={track.id || index}
                      onClick={() => handleTrackPlay(track)}
                      className={`group hover:bg-[#181824]/90 transition cursor-pointer ${
                        isCurrent ? 'bg-[#181824] text-purple-400' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center text-gray-400 group-hover:text-white text-sm">
                        {isCurrent && isPlaying ? (
                          <FiPause className="text-purple-400 mx-auto" />
                        ) : (
                          <>
                            <span className="group-hover:hidden">{index + 1}</span>
                            <FiPlay className="hidden group-hover:inline text-purple-400 mx-auto" />
                          </>
                        )}
                      </td>

                      <td className="py-3.5 px-4 flex items-center gap-3.5">
                        <img
                          src={track.thumbnail || track.image_url || track.cover_url || 'https://via.placeholder.com/44'}
                          alt={track.title}
                          className="w-11 h-11 rounded-lg object-cover bg-black/40 shadow"
                        />
                        <div className="overflow-hidden max-w-md">
                          <p className={`font-medium text-sm truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist || track.artist_name}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 hidden md:table-cell text-sm truncate max-w-xs">
                        {track.album || track.artist || 'YouTube Music'}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 text-right font-mono text-xs">
                        {track.duration || '3:30'}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 text-right">
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-white p-1 rounded-md cursor-pointer"
                        >
                          <FiMoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
