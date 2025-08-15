// Rule documentation for: role-img-alt
// Enhanced accessibility rule description

const roleImgAltRule = {
  plainLanguage: {
    whatItMeans:
      "Elements with an image role must have alternative text that describes the image content.",
    whyItMatters:
      "When non-image elements are used to display images, screen readers need text descriptions to convey the visual information.",
    whoItAffects:
      "Screen reader users and anyone using assistive technology who cannot see image content.",
  },
  technicalSummary:
    "Ensures elements with role='img' have accessible names through aria-label, aria-labelledby, or other text alternatives.",
  whyItMatters: [
    "Provides image descriptions for non-visual users",
    "Supports screen reader interpretation of visual content",
    "Ensures image information is accessible regardless of implementation method",
    "Maintains semantic meaning when using CSS or SVG for images",
  ],
  howToFix: {
    overview: "Add appropriate text alternatives to elements with image roles.",
    methods: [
      {
        approach: "Use aria-label",
        description: "Provide descriptive text with aria-label",
        code: `<!-- CSS background image with image role -->
<div role="img" aria-label="Company logo" class="logo-image">
</div>

<!-- SVG icon with image role -->
<span role="img" aria-label="Warning icon">
  <svg>...</svg>
</span>`,
      },
      {
        approach: "Use aria-labelledby",
        description: "Reference existing text as the image description",
        code: `<h2 id="chart-title">Sales Data for Q3</h2>
<div role="img" aria-labelledby="chart-title" class="chart">
  <!-- Chart visualization -->
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Image role without alternative text",
        code: `<div role="img" class="product-photo">
  <!-- Background image set via CSS -->
</div>`,
        issue: "Element has image role but no text alternative",
      },
    ],
    passing: [
      {
        description: "Image role with descriptive label",
        code: `<div role="img" aria-label="Red bicycle with mountain bike features" class="product-photo">
  <!-- Background image set via CSS -->
</div>`,
        explanation: "aria-label provides description of the image content",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.1.1 Non-text Content (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        relationship: "Images must have text alternatives",
      },
    ],
    techniques: [
      {
        id: "ARIA6",
        title: "Using aria-label to provide labels for objects",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA6",
      },
    ],
  },
};
