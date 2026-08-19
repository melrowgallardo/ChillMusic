import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { useMusic } from '../context/MusicContext';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2 } from 'react-icons/fi';

export default function MusicPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, nextTrack, prevTrack } = useMusic() || {};
  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);

  const onReady = (event) => {
    setPlayer(event.target);
    try {
      event.target.setVolume(volume);
      if (isPlaying) {
        event.target.playVideo();
      }
    } catch (e) {}
  };

  const onStateChange = (event) => {
    // 1: Playing, 2: Paused, 0: Ended
    if (event.data === 1) {
      if (setIsPlaying) setIsPlaying(true);
      try {
        setDuration(event.target.getDuration());
      } catch (e) {}
    } else if (event.data === 2) {
      if (setIsPlaying) setIsPlaying(false);
    } else if (event.data === 0) {
      if (nextTrack) nextTrack();
    }
  };

  // Sync Play/Pause state
  useEffect(() => {
    if (player) {
      try {
        if (isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      } catch (e) {}
    }
  }, [isPlaying, player]);

  // Time progress tracker
  useEffect(() => {
    const interval = setInterval(() => {
      if (player && typeof player.getCurrentTime === 'function' && isPlaying) {
        try {
          const cur = player.getCurrentTime();
          if (cur !== undefined && !isNaN(cur)) {
            setProgress(cur);
          }
        } catch (e) {}
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlaying]);

  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    setProgress(seekTo);
    if (player && typeof player.seekTo === 'function') {
      try {
        player.seekTo(seekTo, true);
      } catch (e) {}
    }
  };

  const handleVolume = (e) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (player && typeof player.setVolume === 'function') {
      try {
        player.setVolume(newVol);
      } catch (e) {}
    }
  };

  if (!currentTrack) return null;

  const opts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
    },
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Target YouTube ID
  const ytId = currentTrack.youtubeId || currentTrack.youtube_id || currentTrack.videoId || currentTrack.id;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-[#12121a] border-t border-[#252836] px-6 flex items-center justify-between z-50">
      {/* Hidden Full-Length YouTube Audio Engine */}
      {ytId && (
        <div className="hidden">
          <YouTube
            videoId={ytId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
          />
        </div>
      )}

      {/* Left: Track Details */}
      <div className="flex items-center gap-4 min-w-[200px] max-w-[30%]">
        <img
          src={currentTrack.thumbnail || currentTrack.image_url || currentTrack.cover_url || 'https://via.placeholder.com/60'}
          alt={currentTrack.title || 'Track'}
          className="w-14 h-14 rounded-lg object-cover shadow-md"
        />
        <div className="overflow-hidden">
          <h4 className="text-white font-semibold text-sm truncate">{currentTrack.title}</h4>
          <p className="text-gray-400 text-xs truncate mt-0.5">{currentTrack.artist || currentTrack.artist_name}</p>
        </div>
      </div>

      {/* Center: Controls & Progress Bar */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-xl mx-8">
        <div className="flex items-center gap-6">
          <button onClick={prevTrack} className="text-gray-400 hover:text-white transition">
            <FiSkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying && setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition shadow-lg"
          >
            {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} className="ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="text-gray-400 hover:text-white transition">
            <FiSkipForward size={18} />
          </button>
        </div>

        <div className="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume Slider */}
      <div className="flex items-center gap-3 min-w-[150px] justify-end">
        <FiVolume2 className="text-gray-400" size={18} />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={handleVolume}
          className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  );
}
