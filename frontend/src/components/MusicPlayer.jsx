import React, { useState, useEffect, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2, FiVolumeX } from 'react-icons/fi';

export default function MusicPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, nextTrack, prevTrack } = useMusic() || {};
  const iframeRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(210); // default fallback seconds
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // YouTube Video ID extraction
  const videoId = currentTrack?.youtubeId || currentTrack?.youtube_id || currentTrack?.videoId || currentTrack?.id;

  // Timer simulation for progress bar when playing
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            if (nextTrack) nextTrack();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, duration, nextTrack]);

  // Reset progress on track change
  useEffect(() => {
    setProgress(0);
    if (currentTrack?.durationRaw) {
      setDuration(currentTrack.durationRaw);
    } else if (typeof currentTrack?.duration === 'number') {
      setDuration(currentTrack.duration);
    } else if (typeof currentTrack?.duration === 'string' && currentTrack.duration.includes(':')) {
      const parts = currentTrack.duration.split(':');
      const mins = parseInt(parts[0] || '0', 10);
      const secs = parseInt(parts[1] || '0', 10);
      setDuration(mins * 60 + secs || 210);
    }
  }, [currentTrack]);

  const handlePlayToggle = () => {
    const nextState = !isPlaying;
    if (setIsPlaying) setIsPlaying(nextState);
    if (iframeRef.current) {
      const command = nextState ? 'playVideo' : 'pauseVideo';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setProgress(newTime);
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [newTime, true] }),
        '*'
      );
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-[#12121a] border-t border-[#252836] px-6 flex items-center justify-between z-50">
      {/* Persistent Hidden YouTube Stream Container */}
      {videoId && (
        <iframe
          ref={iframeRef}
          key={videoId}
          title="YouTube Audio Stream"
          className="absolute -top-[9999px] -left-[9999px] w-1 h-1 pointer-events-none opacity-0"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&start=0&origin=${window.location.origin}`}
          allow="autoplay"
        />
      )}

      {/* Left Track Info */}
      <div className="flex items-center gap-4 min-w-[220px] max-w-[30%]">
        <img
          src={currentTrack.thumbnail || currentTrack.image_url || currentTrack.cover_url || 'https://via.placeholder.com/60'}
          alt={currentTrack.title || 'Track'}
          className="w-14 h-14 rounded-xl object-cover shadow-lg border border-purple-500/20"
        />
        <div className="overflow-hidden">
          <h4 className="text-white font-semibold text-sm truncate">{currentTrack.title}</h4>
          <p className="text-gray-400 text-xs truncate mt-0.5">{currentTrack.artist || currentTrack.artist_name}</p>
        </div>
      </div>

      {/* Center Controls & Full Track Timeline */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-xl mx-8">
        <div className="flex items-center gap-6">
          <button onClick={prevTrack} className="text-gray-400 hover:text-white transition">
            <FiSkipBack size={18} />
          </button>
          <button
            onClick={handlePlayToggle}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition shadow-lg shadow-purple-600/30"
          >
            {isPlaying ? <FiPause size={18} /> : <FiPlay size={18} className="ml-0.5" />}
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
            max={duration}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Volume Controls */}
      <div className="flex items-center gap-3 min-w-[150px] justify-end">
        <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white">
          {isMuted || volume === 0 ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            const val = Number(e.target.value);
            setVolume(val);
            setIsMuted(false);
            if (iframeRef.current) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'setVolume', args: [val] }),
                '*'
              );
            }
          }}
          className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  );
}
