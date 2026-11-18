import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env relative to backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Validates required environment variables and exports sanitized configuration
 */
export const validateEnv = () => {
  const errors = [];

  const isTest =
    (process.env.NODE_ENV || "").toLowerCase() === "test" ||
    process.argv.some((arg) => /[\/\\]test[\/\\]|\.test\.[cm]?js$/i.test(arg)) ||
    process.execArgv.some((flag) => flag.startsWith("--test"));

  const required = [
    { key: "PORT", default: "5000" },
    { key: "MONGODB_URI", default: isTest ? "mongodb://127.0.0.1:27017/lexora_test" : undefined, required: !isTest },
    { key: "JWT_SECRET", default: isTest ? "test_jwt_secret_key_for_testing_min_16_chars" : undefined, required: !isTest },
    { key: "NODE_ENV", default: "development" },
    { key: "FRONTEND_URL", default: "http://localhost:5173" },
    { key: "DICTIONARY_API_BASE_URL", default: "https://api.dictionaryapi.dev/api/v2/entries/en" },
    { key: "CACHE_TTL_DAYS", default: "30" }
  ];

  const config = {};

  for (const item of required) {
    const val = process.env[item.key] || item.default;
    if (item.required && (!val || val.trim() === "")) {
      errors.push(`Missing required environment variable: ${item.key}`);
    } else {
      config[item.key] = val;
    }
  }

  if (config.JWT_SECRET && config.JWT_SECRET.length < 16) {
    errors.push("JWT_SECRET must be at least 16 characters long for security.");
  }

  if (errors.length > 0) {
    const errorMsg = [
      "===========================================================",
      "FATAL: Environment configuration validation failed!",
      ...errors.map((e) => `  - ${e}`),
      "Please configure your backend/.env based on backend/.env.example",
      "==========================================================="
    ].join("\n");

    throw new Error(errorMsg);
  }

  return {
    PORT: parseInt(config.PORT, 10) || 5000,
    MONGODB_URI: config.MONGODB_URI,
    JWT_SECRET: config.JWT_SECRET,
    NODE_ENV: config.NODE_ENV,
    FRONTEND_URL: config.FRONTEND_URL,
    DICTIONARY_API_BASE_URL: config.DICTIONARY_API_BASE_URL,
    CACHE_TTL_DAYS: parseInt(config.CACHE_TTL_DAYS, 10) || 30,
    IS_PROD: config.NODE_ENV === "production",
    IS_TEST: isTest
  };
};

export const env = validateEnv();

