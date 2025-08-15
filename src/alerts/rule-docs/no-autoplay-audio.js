// Rule documentation for: no-autoplay-audio
// Enhanced accessibility rule description

const noAutoplayAudioRule = {
  plainLanguage: {
    whatItMeans:
      "Audio should not play automatically when a page loads, as this can be startling and interfere with screen readers.",
    whyItMatters:
      "Automatic audio can mask screen reader announcements and can be disorienting or disturbing to users.",
    whoItAffects:
      "Screen reader users, people with hearing difficulties, and anyone in quiet environments or using assistive listening devices.",
  },
  technicalSummary:
    "Ensures audio and video elements do not have autoplay attributes or automatic playback functionality.",
  whyItMatters: [
    "Prevents interference with screen reader audio output",
    "Avoids startling users with unexpected audio",
    "Supports users in sound-sensitive environments",
    "Gives users control over their audio experience",
  ],
  howToFix: {
    overview:
      "Remove autoplay attributes and provide user controls to start audio playback.",
    methods: [
      {
        approach: "Remove autoplay attribute",
        description: "Let users choose when to start audio playback",
        code: `<!-- Before: Auto-playing audio -->
<audio autoplay>
  <source src="background.mp3" type="audio/mpeg">
</audio>

<!-- After: User-controlled audio -->
<audio controls>
  <source src="background.mp3" type="audio/mpeg">
</audio>`,
      },
      {
        approach: "Add play button",
        description: "Provide clear controls for starting media",
        code: `<div class="media-player">
  <audio id="audio-player">
    <source src="podcast.mp3" type="audio/mpeg">
  </audio>
  <button onclick="document.getElementById('audio-player').play()">
    Play Podcast
  </button>
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Audio with autoplay enabled",
        code: `<audio autoplay loop>
  <source src="ambient.mp3" type="audio/mpeg">
</audio>`,
        issue: "Audio starts playing automatically without user consent",
      },
    ],
    passing: [
      {
        description: "User-controlled audio",
        code: `<audio controls>
  <source src="ambient.mp3" type="audio/mpeg">
  Your browser does not support audio.
</audio>`,
        explanation: "User must explicitly choose to start audio playback",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.4.2 Audio Control (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html",
        relationship: "Users must be able to control audio playback",
      },
    ],
    techniques: [
      {
        id: "G60",
        title:
          "Playing a sound that turns off automatically within three seconds",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G60",
      },
    ],
  },
};
