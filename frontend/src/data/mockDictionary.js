/**
 * Curated Mock Dictionary Entries for Lexora
 * Formatted consistently with Free Dictionary API schema.
 */

export const mockDictionary = {
  hello: {
    word: "hello",
    phonetic: "/həˈloʊ/",
    audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-au.mp3",
    meanings: [
      {
        partOfSpeech: "exclamation",
        definitions: [
          {
            definition: "Used as a greeting or to begin a telephone conversation.",
            example: "Hello there, how are you doing today?",
            synonyms: ["hi", "greetings", "salutations"],
            antonyms: ["goodbye", "farewell"]
          }
        ]
      },
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "An utterance of 'hello'; a greeting.",
            example: "She gave him a warm hello as he walked into the library.",
            synonyms: ["greeting", "welcome"],
            antonyms: []
          }
        ]
      }
    ]
  },

  serendipity: {
    word: "serendipity",
    phonetic: "/ˌsɛr.ənˈdɪp.ə.ti/",
    audio: "https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3",
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "The occurrence and development of events by chance in a happy or beneficial way.",
            example: "Finding that antique book in a small corner cafe was pure serendipity.",
            synonyms: ["chance", "happy accident", "fortuity", "fluke"],
            antonyms: ["misfortune", "bad luck"]
          }
        ]
      }
    ]
  },

  ephemeral: {
    word: "ephemeral",
    phonetic: "/ɪˈfɛm.ər.əl/",
    audio: "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3",
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          {
            definition: "Lasting for a very short time; transitory; fleeting.",
            example: "The ephemeral bloom of cherry blossoms reminds us to appreciate every moment.",
            synonyms: ["transitory", "fleeting", "short-lived", "momentary"],
            antonyms: ["permanent", "eternal", "enduring"]
          }
        ]
      },
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "An ephemeral plant or thing.",
            example: "Desert ephemerals sprout, flower, and die in just a few short weeks after rain.",
            synonyms: ["transience"],
            antonyms: []
          }
        ]
      }
    ]
  },

  beautiful: {
    word: "beautiful",
    phonetic: "/ˈbjuː.tɪ.fəl/",
    audio: "https://api.dictionaryapi.dev/media/pronunciations/en/beautiful-us.mp3",
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          {
            definition: "Pleasing the senses or mind aesthetically.",
            example: "The evening sky was painted in beautiful shades of lavender and peach.",
            synonyms: ["gorgeous", "lovely", "attractive", "exquisite"],
            antonyms: ["ugly", "hideous", "unattractive"]
          },
          {
            definition: "Of a very high standard; excellent.",
            example: "The pianist delivered a beautiful rendition of Chopin's nocturne.",
            synonyms: ["superb", "splendid", "masterful"],
            antonyms: ["poor", "mediocre"]
          }
        ]
      }
    ]
  },

  petrichor: {
    word: "petrichor",
    phonetic: "/ˈpɛt.rɪ.kɔːr/",
    audio: "https://api.dictionaryapi.dev/media/pronunciations/en/petrichor-us.mp3",
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "A pleasant, distinctive smell that frequently accompanies the first rain after a long period of warm, dry weather.",
            example: "She opened the window to inhale the sweet petrichor rising from the garden path.",
            synonyms: ["earthy scent", "rain fragrance"],
            antonyms: []
          }
        ]
      }
    ]
  },

  resilience: {
    word: "resilience",
    phonetic: "/rɪˈzɪl.jəns/",
    audio: null,
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "The capacity to withstand or recover quickly from difficulties; toughness.",
            example: "The community showed remarkable resilience in rebuilding after the storm.",
            synonyms: ["toughness", "endurance", "fortitude", "perseverance"],
            antonyms: ["fragility", "vulnerability", "weakness"]
          },
          {
            definition: "The ability of a substance or object to spring back into shape; elasticity.",
            example: "Nylon is renowned for its remarkable resilience and strength.",
            synonyms: ["elasticity", "flexibility", "springiness"],
            antonyms: ["rigidity", "brittleness"]
          }
        ]
      }
    ]
  },

  sonder: {
    word: "sonder",
    phonetic: "/ˈsɒn.dər/",
    audio: null, // audio absent to test conditional pronunciation control
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "The profound feeling of realizing that everyone, including strangers passing by, has a life as complex and vivid as one's own.",
            example: "Watching commuters on the train, she felt a quiet surge of sonder.",
            synonyms: ["empathy", "perspective", "epiphany"],
            antonyms: []
          }
        ]
      }
    ]
  }
};
