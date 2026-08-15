import { fetchYouTubePublic } from './youtube';

// Helper to detect 30s preview URLs or short preview tracks
export const isPreviewUrl = (url, duration) => {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (
    lower.includes('dzcdn.net') ||
    lower.includes('cdns-preview') ||
    lower.includes('preview') ||
    lower.includes('apple.com') ||
    lower.includes('itunes') ||
    lower.includes('sample')
  ) {
    return true;
  }
  if (duration > 0 && duration <= 35 && !lower.includes('soundhelix')) {
    return true;
  }
  return false;
};

// Fast helper to fetch with timeout
const fetchWithTimeout = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

const containsKeyword = (text, keyword) => {
  if (!text) return false;
  return new RegExp(`\\b${keyword}\\b`, 'i').test(text);
};

/**
 * Ranks and filters candidate audio tracks to avoid unwanted remixes, covers, or live tracks,
 * prioritizing official audio and topic channels.
 */
export const filterAndRankAudioCandidates = (candidates, originalTitle, originalArtist) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const titleLower = (originalTitle || '').toLowerCase();
  const artistLower = (originalArtist || '').toLowerCase();

  const wantsRemix = containsKeyword(titleLower, 'remix') || containsKeyword(titleLower, 'rework');
  const wantsCover =
    containsKeyword(titleLower, 'cover') ||
    containsKeyword(titleLower, 'instrumental') ||
    containsKeyword(titleLower, 'karaoke');
  const wantsLive = containsKeyword(titleLower, 'live');

  return candidates
    .map((candidate) => {
      if (!candidate || (!candidate.audio_url && !candidate.stream_url)) return null;

      const candidateTitle = (candidate.title || '').toLowerCase();
      const candidateArtist = (
        candidate.artist_name ||
        candidate.artist ||
        candidate.uploader ||
        ''
      ).toLowerCase();
      let score = 0;

      // Penalty for undesired Remix / Rework
      if (
        !wantsRemix &&
        (candidateTitle.includes('remix') ||
          candidateTitle.includes('rework') ||
          candidateTitle.includes('bootleg'))
      ) {
        score -= 50;
      }

      // Penalty for undesired Cover / Instrumental / Karaoke
      if (
        !wantsCover &&
        (candidateTitle.includes('cover') ||
          candidateTitle.includes('instrumental') ||
          candidateTitle.includes('piano cover') ||
          candidateTitle.includes('guitar cover') ||
          candidateTitle.includes('karaoke') ||
          candidateTitle.includes('tribute'))
      ) {
        score -= 50;
      }

      // Penalty for undesired Live performance
      if (
        !wantsLive &&
        (candidateTitle.includes('live at') ||
          candidateTitle.includes('live in') ||
          candidateTitle.includes('live 20') ||
          candidateTitle.includes('live performance'))
      ) {
        score -= 30;
      }

      // Priority boost for Official Audio / Topic / VEVO Channel
      if (
        candidateTitle.includes('official audio') ||
        candidateTitle.includes('official music video') ||
        candidateTitle.includes('official video') ||
        candidateArtist.includes('topic') ||
        candidateArtist.includes('vevo')
      ) {
        score += 30;
      }

      // Priority boost if uploader matches artist name
      if (artistLower && candidateArtist.includes(artistLower)) {
        score += 25;
      }

      // Priority boost if title matches original title
      if (titleLower && candidateTitle.includes(titleLower)) {
        score += 20;
      }

      return { candidate, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);
};

/**
 * Resolves full-length audio stream for a track strictly matching artist and title.
 * Formats query as: `${track.artist} - ${track.title} official audio`
 */
export const resolveFullAudioTrack = async (track) => {
  if (!track) return track;

  // If already a valid full audio stream (not a 30s preview and duration > 35s), return as-is
  if (track.audio_url && !isPreviewUrl(track.audio_url, track.duration)) {
    return track;
  }

  const artistName = (track.artist_name || track.artist || '').trim();
  const trackTitle = (track.title || '').trim();

  // Query audio source using exact format: "${track.artist} - ${track.title} official audio"
  const searchQuery = artistName
    ? `${artistName} - ${trackTitle} official audio`
    : `${trackTitle} official audio`;

  console.log(`Resolving exact audio stream for: "${searchQuery}"...`);

  // 1. YouTube Public Search with keyword filtering & official audio ranking
  try {
    const ytTracks = await fetchYouTubePublic(searchQuery, 10);
    const rankedYt = filterAndRankAudioCandidates(ytTracks, trackTitle, artistName);
    const bestYt = rankedYt.find(
      (t) => t && t.audio_url && !isPreviewUrl(t.audio_url, t.duration) && t.duration >= 60
    );

    if (bestYt) {
      return {
        ...track,
        audio_url: bestYt.audio_url,
        duration: bestYt.duration || track.duration || 210,
        source: bestYt.source || 'youtube',
        image_url: track.image_url || bestYt.image_url,
      };
    }
  } catch (err) {
    console.warn('YouTube exact stream resolution error:', err);
  }

  // 2. JioSaavn CDN Search
  try {
    const res = await fetchWithTimeout(
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=10`,
      2500
    );
    if (res.ok) {
      const json = await res.json();
      const results = json.data?.results || [];
      const saavnCandidates = results.map((item) => {
        const audioList = item.downloadUrl || item.url || [];
        let url = '';
        if (Array.isArray(audioList) && audioList.length > 0) {
          url = audioList[audioList.length - 1].url || audioList[audioList.length - 1].link || '';
        }
        return {
          title: item.name || item.title,
          artist_name: item.primaryArtists || item.artist,
          audio_url: url,
          duration: parseInt(item.duration || 210, 10),
        };
      });

      const rankedSaavn = filterAndRankAudioCandidates(saavnCandidates, trackTitle, artistName);
      const bestSaavn = rankedSaavn.find((t) => t && t.audio_url && !isPreviewUrl(t.audio_url, t.duration));

      if (bestSaavn) {
        return {
          ...track,
          audio_url: bestSaavn.audio_url,
          duration: bestSaavn.duration || track.duration || 210,
          source: 'saavn',
        };
      }
    }
  } catch (err) {
    console.warn('Saavn exact stream resolution error:', err);
  }

  return track;
};
