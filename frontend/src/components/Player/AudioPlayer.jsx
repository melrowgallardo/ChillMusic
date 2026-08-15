import React, { useEffect } from 'react';
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

  const ytId =
    currentTrack?.youtubeId ||
    currentTrack?.videoId ||
    (currentTrack?.id && String(currentTrack.id).startsWith('yt_') ? String(currentTrack.id).replace('yt_', '') : null);

  // 1. Inject YouTube IFrame API script dynamically if not loaded
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, []);

  // 2. Headless YouTube Player Lifecycle
  useEffect(() => {
    if (!ytId) return;

    const initPlayer = () => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById({ videoId: ytId, startSeconds: 0 });
          ytPlayerRef.current.seekTo(0, true);
          ytPlayerRef.current.setVolume(volume * 100);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setCurrentTime(0);
          return;
        } catch (e) {
          console.warn('YouTube loadVideoById error:', e);
        }
      }

      if (window.YT && window.YT.Player) {
        try {
          ytPlayerRef.current = new window.YT.Player('youtube-player-hidden', {
            height: '0',
            width: '0',
            videoId: ytId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
            },
            events: {
              onReady: (event) => {
                try {
                  event.target.seekTo(0, true);
                  event.target.setVolume(volume * 100);
                  event.target.playVideo();
                  setIsPlaying(true);
                  setCurrentTime(0);
                } catch (e) {}
              },
              onStateChange: (event) => {
                if (event.data === 1) setIsPlaying(true);
                if (event.data === 2) setIsPlaying(false);
                if (event.data === 0) nextTrack();
              },
              onError: (err) => {
                console.warn('YouTube player onError:', err);
                const url = currentTrack?.audioUrl || currentTrack?.audio_url;
                if (audioRef?.current && url) {
                  audioRef.current.src = url;
                  audioRef.current.currentTime = 0;
                  audioRef.current.load();
                  audioRef.current.play().catch(console.error);
                }
              },
            },
          });
        } catch (err) {
          console.warn('Failed to construct window.YT.Player:', err);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 300);
      return () => clearInterval(checkInterval);
    }
  }, [ytId, currentTrack?.id]);

  // 3. Fallback HTML5 Audio Player Lifecycle
  useEffect(() => {
    if (ytId) return; // Managed by YouTube IFrame engine
    const url = currentTrack?.audioUrl || currentTrack?.audio_url;
    if (audioRef?.current && url) {
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.load();
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback error or autoplay blocked:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [ytId, currentTrack?.audioUrl, currentTrack?.audio_url, currentTrack?.id]);

  // 4. Time & Duration Synchronization Polling (500ms)
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        if (ytPlayerRef?.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const cur = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (cur !== undefined && !isNaN(cur)) {
              setCurrentTime(cur);
            }
            if (dur !== undefined && !isNaN(dur) && dur > 35) {
              setDuration(dur);
            }
          } catch (e) {}
        }
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, ytPlayerRef, setCurrentTime, setDuration]);

  return (
    <>
      {/* Hidden YouTube IFrame Container */}
      <div style={{ display: 'none', position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}>
        <div id="youtube-player-hidden"></div>
      </div>

      {/* Fallback HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl || currentTrack?.audio_url || ''}
        preload="auto"
        onLoadedMetadata={() => {
          if (audioRef?.current?.duration) {
            const dur = audioRef.current.duration;
            if (dur > 35) {
              setDuration(dur);
            } else if (currentTrack?.duration && currentTrack.duration > 35) {
              setDuration(currentTrack.duration);
            }
          }
        }}
        onTimeUpdate={() => {
          if (!ytId && audioRef?.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          if (!ytId) nextTrack();
        }}
        onError={(e) => console.error('Audio Playback Error:', e.currentTarget.error)}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default AudioPlayer;
