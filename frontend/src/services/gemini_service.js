const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const getAutoQueueRecommendations = async (currentTrack, recentTracks) => {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is missing. Add VITE_GEMINI_API_KEY to .env');
    return [];
  }

  const currentTrackInfo = currentTrack ? `${currentTrack.title} by ${currentTrack.artist_name}` : 'Unknown';
  const recentHistory = recentTracks.map(t => `${t.title} by ${t.artist_name}`).join(', ');

  const prompt = `
You are an expert music recommendation engine.
Given the currently playing track and a history of recently played tracks, recommend 3 to 5 new tracks that vibe well with them.
DO NOT recommend any tracks that are already in the recent history.

Currently playing: ${currentTrackInfo}
Recently played: ${recentHistory}

Return ONLY a strict JSON object with this exact structure:
{
  "recommendations": [
    {
      "title": "Song Title",
      "artist_name": "Artist Name",
      "album_name": "Album Name",
      "duration": 210
    }
  ]
}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (resultText) {
      const parsed = JSON.parse(resultText);
      if (parsed && parsed.recommendations) {
        return parsed.recommendations.map((track, idx) => ({
          id: `gemini_${Date.now()}_${idx}`,
          title: track.title,
          artist_name: track.artist_name,
          album_name: track.album_name || 'Single',
          duration: track.duration || 180,
          audio_url: '', // Left empty as instructed
          image_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80', // generic placeholder
          is_gemini: true
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to get Gemini recommendations:', error);
    return [];
  }
};
