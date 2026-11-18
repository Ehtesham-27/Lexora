/**
 * Utility functions for validating and normalizing word inputs
 */

/**
 * Validates and normalizes user input for dictionary words, favorites, and history
 * @param {string} rawWord
 * @returns {string} normalized lowercase word
 */
export const validateWord = (rawWord) => {
  if (typeof rawWord !== "string") {
    const error = new Error("Word parameter must be a string.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  const trimmed = rawWord.trim().toLowerCase();

  if (trimmed.length === 0) {
    const error = new Error("Word parameter cannot be empty.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  if (trimmed.length > 50) {
    const error = new Error("Word exceeds maximum allowed length of 50 characters.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  // Allow letters, spaces, hyphens, and apostrophes (e.g. "mother-in-law", "o'clock")
  const validPattern = /^[a-zA-Z\s'-]+$/;
  if (!validPattern.test(trimmed)) {
    const error = new Error("Word contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.");
    error.statusCode = 400;
    error.code = "INVALID_WORD";
    throw error;
  }

  return trimmed;
};

/**
 * Normalizes a word string safely without throwing (for display or lookup)
 * @param {string} rawWord
 * @returns {string}
 */
export const normalizeWord = (rawWord) => {
  if (typeof rawWord !== "string") return "";
  return rawWord.trim().toLowerCase();
};
