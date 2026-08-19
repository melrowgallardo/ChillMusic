export const getSafeStorageItem = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return fallback;
    try {
      return JSON.parse(item);
    } catch (parseErr) {
      if (typeof fallback === 'string') return item;
      console.warn(`Storage parsing error for key "${key}":`, parseErr);
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      return fallback;
    }
  } catch (err) {
    console.warn(`Storage access error for key "${key}":`, err);
    return fallback;
  }
};
export const parseSafeJson = async (response) => {
  try {
    if (!response) return {};
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.warn('Failed to parse JSON response:', e);
    return {};
  }
};
