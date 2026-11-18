/**
 * Audio playback utility with automatic SpeechSynthesis fallback
 * for 100% reliable pronunciation of dictionary words.
 */

// Track currently active audio element to stop previous audio when a new one is played
let activeAudio = null;

/**
 * Speaks a word using browser native SpeechSynthesis
 * @param {string} word - The word or text to speak
 * @returns {Promise<void>}
 */
export const speakWord = (word) => {
  return new Promise((resolve) => {
    if (!word || typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.trim());
      utterance.lang = "en-US";
      utterance.rate = 0.88; // Natural, clear pronunciation speed
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
};

/**
 * Plays pronunciation audio URL or falls back to alternative URLs and speech synthesis
 * @param {string} audioUrl - Primary audio URL (mp3/wav)
 * @param {string} [word] - Word to speak as fallback
 * @param {string[]} [alternativeUrls] - Secondary audio URLs to try before speech synthesis
 * @returns {Promise<void>}
 */
export const playAudio = (audioUrl, word = "", alternativeUrls = []) => {
  return new Promise((resolve, reject) => {
    const urlsToTry = [audioUrl, ...(Array.isArray(alternativeUrls) ? alternativeUrls : [])].filter(
      (u) => typeof u === "string" && u.trim().length > 0 && u.trim().startsWith("http")
    );

    const tryNext = (index) => {
      if (index < urlsToTry.length) {
        const url = urlsToTry[index].trim();
        try {
          if (activeAudio) {
            activeAudio.pause();
            activeAudio.currentTime = 0;
            activeAudio = null;
          }

          const audio = new Audio(url);
          activeAudio = audio;

          // Timeout if audio hangs or stalls (3 seconds max)
          const timeout = setTimeout(() => {
            if (activeAudio === audio) {
              activeAudio.pause();
              activeAudio = null;
              tryNext(index + 1);
            }
          }, 3000);

          audio.onended = () => {
            clearTimeout(timeout);
            activeAudio = null;
            resolve();
          };

          audio.onerror = () => {
            clearTimeout(timeout);
            activeAudio = null;
            tryNext(index + 1);
          };

          audio.play().catch(() => {
            clearTimeout(timeout);
            activeAudio = null;
            tryNext(index + 1);
          });
        } catch {
          activeAudio = null;
          tryNext(index + 1);
        }
        return;
      }

      // If all audio URLs failed or none provided, fall back to native speech synthesis
      if (word && typeof window !== "undefined" && "speechSynthesis" in window) {
        speakWord(word).then(resolve).catch(() => resolve());
        return;
      }

      reject(new Error("Unable to play pronunciation audio."));
    };

    tryNext(0);
  });
};
