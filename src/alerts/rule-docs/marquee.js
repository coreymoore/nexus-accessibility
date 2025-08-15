// Rule documentation for: marquee
// Enhanced accessibility rule description

const marqueeRule = {
  plainLanguage: {
    whatItMeans:
      "Scrolling or moving text (marquee elements) should not be used as they can cause seizures and are difficult to read.",
    whyItMatters:
      "Moving text can trigger seizures in people with photosensitive epilepsy and is very difficult for many users to read.",
    whoItAffects:
      "People with photosensitive epilepsy, ADHD, autism, reading difficulties, and cognitive disabilities.",
  },
  technicalSummary:
    "Ensures marquee elements are not used, as they create automatically moving content that cannot be paused or controlled.",
  whyItMatters: [
    "Prevents seizures in users with photosensitive epilepsy",
    "Avoids reading difficulties caused by moving text",
    "Reduces cognitive overload and distraction",
    "Ensures content is accessible to users with attention disorders",
  ],
  howToFix: {
    overview:
      "Replace marquee elements with static text or user-controlled animations that can be paused.",
    methods: [
      {
        approach: "Use static text",
        description: "Replace moving text with static alternatives",
        code: `<!-- Before: Moving text -->
<marquee>Important announcement!</marquee>

<!-- After: Static emphasis -->
<div class="important-notice">
  <strong>Important announcement!</strong>
</div>`,
      },
      {
        approach: "Implement pausable animations",
        description: "If animation is necessary, make it user-controlled",
        code: `<!-- User-controlled text animation -->
<div class="announcement">
  <p>Important announcement!</p>
  <button onclick="toggleAnimation()">Pause/Play</button>
</div>

<style>
@media (prefers-reduced-motion: reduce) {
  .animated-text {
    animation: none;
  }
}
</style>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Marquee with scrolling text",
        code: `<marquee behavior="scroll" direction="left">
  Breaking news: Important update!
</marquee>`,
        issue: "Moving text can cause seizures and is difficult to read",
      },
    ],
    passing: [
      {
        description: "Static emphasized text",
        code: `<div class="news-banner">
  <strong>Breaking news: Important update!</strong>
</div>`,
        explanation: "Static text with visual emphasis instead of movement",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.2.2 Pause, Stop, Hide (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html",
        relationship: "Moving content must be pausable or stoppable",
      },
    ],
    techniques: [
      {
        id: "G4",
        title:
          "Allowing the content to be paused and restarted from where it was paused",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G4",
      },
    ],
  },
};
