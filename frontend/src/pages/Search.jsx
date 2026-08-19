import React, { useState } from 'react';
import { searchYouTubeMusic } from '../services/youtubeService';
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
      const results = await searchYouTubeMusic(searchQuery.trim());
      setSongs(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search error:', err);
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayClick = (track) => {
    if (currentTrack?.id === track.id || (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id)) {
      if (setIsPlaying) setIsPlaying(!isPlaying);
    } else {
      if (playTrack) playTrack(track);
    }
  };

  const songList = Array.isArray(songs) ? songs : [];

  return (
    <div className="p-8 text-white max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Search & Discover</h1>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-4xl">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists (e.g. Twice, Taylor Swift)..."
            className="w-full pl-12 pr-4 py-3 bg-[#181824] border border-[#2a2b3d] rounded-xl text-white outline-none focus:border-purple-500 transition"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-700 font-bold rounded-xl uppercase text-sm tracking-wide transition disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? 'Searching...' : 'SEARCH'}
        </button>
      </form>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-gray-800 text-sm font-semibold pt-2">
        <span className="text-purple-400 border-b-2 border-purple-500 pb-3 cursor-pointer">
          SONGS ({songList.length})
        </span>
      </div>

      {/* Content Display */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Searching YouTube for "{searchQuery}"...</div>
      ) : songList.length === 0 ? (
        <div className="py-16 text-center text-gray-500">No tracks available. Type a keyword and click Search.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-800/80">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">TITLE</th>
                <th className="py-3 px-4 hidden md:table-cell">ALBUM / CHANNEL</th>
                <th className="py-3 px-4 text-right">DURATION</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40 text-sm">
              {songList.map((track, index) => {
                const isCurrent =
                  currentTrack?.id === track.id ||
                  (currentTrack?.youtubeId && currentTrack?.youtubeId === track.id) ||
                  (currentTrack?.id && track.youtubeId && currentTrack.id === track.youtubeId);

                return (
                  <tr
                    key={track.id || index}
                    onClick={() => handlePlayClick(track)}
                    className={`group hover:bg-[#181824]/80 transition cursor-pointer ${
                      isCurrent ? 'bg-[#181824] text-purple-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-400 group-hover:text-white">
                      {isCurrent && isPlaying ? (
                        <FiPause className="text-purple-400" />
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      <FiPlay className="hidden group-hover:inline text-purple-400" />
                    </td>

                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={track.thumbnail || track.image_url || track.cover_url || 'https://via.placeholder.com/40'}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover bg-black/40"
                      />
                      <div className="overflow-hidden max-w-md">
                        <p className={`font-semibold truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{track.artist || track.artist_name}</p>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-gray-400 hidden md:table-cell truncate max-w-xs">
                      {track.album || track.artist || 'YouTube Music'}
                    </td>

                    <td className="py-3 px-4 text-gray-400 text-right font-mono text-xs">
                      {track.duration || '3:30'}
                    </td>

                    <td className="py-3 px-4 text-gray-400 text-right">
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-white p-1 cursor-pointer"
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
  );
}
