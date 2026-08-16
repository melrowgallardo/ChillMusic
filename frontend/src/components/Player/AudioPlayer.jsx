import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { usePlayer } from '../../context/PlayerContext';

const AudioPlayer = () => {
  const {
    audioRef,
    ytPlayerRef,
    currentTrack,
    isPlaying,
    setIsPlaying,
    setDuration,
    setCurrentTime,
    volume,
    nextTrack,
  } = usePlayer();

  const [ytPlayer, setYtPlayer] = useState(null);

  const videoId =
    currentTrack?.videoId ||
    currentTrack?.youtubeId ||
    (currentTrack?.id && String(currentTrack.id).startsWith('yt_') ? String(currentTrack.id).replace('yt_', '') : null);

  const audioUrl = currentTrack?.audioUrl || currentTrack?.audio_url || '';

  const playerOptions = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      start: 0, // Force start at 0:00 (Intro)
    },
  };

  const handlePlayerReady = (event) => {
    const player = event.target;
    setYtPlayer(player);
    ytPlayerRef.current = player;
    try {
      player.seekTo(0, true);
      player.setVolume(volume * 100);
      player.playVideo();
      setIsPlaying(true);
      setCurrentTime(0);
    } catch (e) {}
  };

  const handleStateChange = (event) => {
    // YouTube PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
    if (event.data === 0) nextTrack();
  };

  // Trigger .play() when currentTrack?.audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl && !videoId) {
      audioRef.current.load();
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Autoplay prevented or playback error:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [audioUrl, videoId, currentTrack?.id]);

  // Sync volume with YouTube Player
  useEffect(() => {
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      try {
        ytPlayer.setVolume(volume * 100);
      } catch (e) {}
    }
  }, [volume, ytPlayer]);

  // Sync volume with HTML5 Audio Player
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync progress bar & scrubber (500ms Interval for YouTube engine)
  useEffect(() => {
    let timer = null;
    if (isPlaying && videoId && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      timer = setInterval(() => {
        try {
          const cur = ytPlayer.getCurrentTime();
          const dur = ytPlayer.getDuration();
          if (cur !== undefined && !isNaN(cur)) {
            setCurrentTime(cur);
          }
          if (dur !== undefined && !isNaN(dur) && dur > 35) {
            setDuration(dur);
          }
        } catch (e) {}
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, videoId, ytPlayer, setCurrentTime, setDuration]);

  return (
    <>
      {/* Hidden YouTube IFrame Audio Engine */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}>
        {videoId && (
          <YouTube
            key={videoId}
            videoId={videoId}
            opts={playerOptions}
            onReady={handlePlayerReady}
            onStateChange={handleStateChange}
            onError={(err) => {
              console.warn('react-youtube error:', err);
              nextTrack();
            }}
          />
        )}
      </div>

      {/* HTML5 Audio Element for direct stream URLs */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onTimeUpdate={() => {
          if (!videoId && audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (!videoId && audioRef.current?.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={nextTrack}
        onError={(e) => {
          console.error('Audio playback error:', e);
          setIsPlaying(false);
        }}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default AudioPlayer;
