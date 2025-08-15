// Rule documentation for: audio-caption
// Enhanced accessibility rule description

const audioCaptionRule = {
  plainLanguage: {
    whatItMeans:
      "All prerecorded audio-only content, like a podcast or an MP3 file, must have a text transcript. This allows people who are deaf or hard of hearing to access the information.",
    whyItMatters:
      "Without a text version, anyone who cannot hear the audio is completely excluded from accessing the information, announcements, or story being told.",
    whoItAffects:
      "Users who are deaf or hard of hearing, people with auditory processing disorders, or anyone in a noisy environment or without headphones.",
  },
  technicalSummary:
    'Ensures that every `<audio>` element has a text alternative. The rule checks for the presence of a `<track>` element with `kind="captions"` or `kind="descriptions"`, or a nearby link that can be identified as a transcript.',
  whyItMatters: [
    "Provides equal access to information for users who are deaf or hard of hearing, which is a core principle of accessibility.",
    "Allows content to be consumed in sound-sensitive environments (like a library or quiet office).",
    "Makes the audio content searchable, as search engines can index the text transcript.",
    "Improves comprehension for non-native speakers or users with auditory processing difficulties who can follow along with the text.",
  ],
  howToFix: {
    overview:
      "The best way to fix this is to provide a full, accurate transcript of the audio content. The transcript should be clearly linked or placed near the audio player. Using a `<track>` element is also a valid technique.",
    methods: [
      {
        approach: "Provide a link to a transcript",
        description:
          "Place a link to a separate page containing the full transcript directly before or after the `<audio>` element.",
        code: `<audio controls src="podcast.mp3"></audio>
<a href="podcast-transcript.html">Read transcript</a>`,
      },
      {
        approach: "Include the transcript on the same page",
        description:
          "Display the full transcript on the same page, often within a collapsible `<details>` element for a cleaner layout.",
        code: `<audio controls src="interview.mp3"></audio>
<details>
  <summary>Show Transcript</summary>
  <p><strong>Interviewer:</strong> Welcome to the show.</p>
  <p><strong>Guest:</strong> Thank you for having me.</p>
</details>`,
      },
      {
        approach: "Add a captions or descriptions track",
        description:
          'Use a `<track>` element with a VTT file. While `kind="captions"` is for video, it\'s often used. `kind="descriptions"` is also appropriate for audio-only content.',
        code: `<audio controls>
  <source src="podcast.mp3" type="audio/mpeg">
  <track kind="descriptions" src="podcast-desc.vtt" srclang="en">
</audio>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "An `<audio>` element is provided with no text alternative.",
        code: `<audio controls src="podcast.mp3">
  Your browser does not support the audio element.
</audio>`,
        issue:
          "There is no `<track>` element or linked transcript, so users who cannot hear the audio have no way to access its content.",
      },
    ],
    passing: [
      {
        description: "A transcript is provided in a `<details>` element.",
        code: `<audio controls src="meeting-audio.mp3"></audio>
<details>
  <summary>Transcript</summary>
  <p>Team meeting recording...</p>
</details>`,
        explanation:
          "A full text transcript is available on the page, providing an equivalent experience.",
      },
      {
        description:
          "A `<track>` element is used to provide a text description.",
        code: `<audio controls>
  <source src="announcement.ogg" type="audio/ogg">
  <track kind="descriptions" src="announcement.vtt" srclang="en" label="English">
</audio>`,
        explanation:
          "The `<track>` element provides a time-synced text alternative for the audio content.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.2.1 Audio-only and Video-only (Prerecorded) (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html",
        relationship:
          "Requires a text transcript for all prerecorded audio-only content.",
      },
    ],
    techniques: [
      {
        id: "G158",
        title:
          "Providing an alternative for time-based media for audio-only content",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G158",
      },
      {
        id: "G159",
        title: "Providing an alternative for time-based media",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G159",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.audioCaptionRule = audioCaptionRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["audio-caption"] = audioCaptionRule;
}
