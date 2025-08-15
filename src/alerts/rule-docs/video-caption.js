// Rule documentation for: video-caption
// Enhanced accessibility rule description

const videoCaptionRule = {
  plainLanguage: {
    whatItMeans: "Videos with audio content must provide captions that show what is being said and important sounds.",
    whyItMatters: "People who are deaf or hard of hearing need captions to understand video content.",
    whoItAffects: "Deaf and hard of hearing users, users in noisy environments, and users who prefer to watch videos without sound.",
  },
  technicalSummary: "Ensures video elements include captions through track elements, aria-describedby, or other accessibility methods.",
  whyItMatters: [
    "Provides access to audio content for deaf and hard of hearing users",
    "Enables video consumption in sound-sensitive environments",
    "Supports users who process visual text better than audio",
    "Improves comprehension for non-native speakers",
  ],
  howToFix: {
    overview: "Add captions to videos using track elements or embedded caption files.",
    methods: [
      {
        approach: "Use track element with captions",
        description: "Add WebVTT caption files using the track element",
        code: `<video controls>
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>`,
      },
      {
        approach: "Use embedded captions",
        description: "Include captions burned into the video file",
        code: `<!-- When captions are embedded in video file -->
<video controls aria-describedby="caption-info">
  <source src="video-with-captions.mp4" type="video/mp4">
</video>
<p id="caption-info">This video includes embedded captions</p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Video without any captions",
        code: `<video controls>
  <source src="presentation.mp4" type="video/mp4">
</video>`,
        issue: "No captions provided for video content",
      },
    ],
    passing: [
      {
        description: "Video with caption track",
        code: `<video controls>
  <source src="presentation.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>`,
        explanation: "Caption track provides access to audio content",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.2.2 Captions (Prerecorded) (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html",
        relationship: "Prerecorded video with audio must have captions",
      },
    ],
    techniques: [
      {
        id: "H95",
        title: "Using the track element to provide captions",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H95",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== 'undefined') {
  // Create global variable for the rule
  window.videoCaptionRule = videoCaptionRule;
  
  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS['video-caption'] = videoCaptionRule;
}