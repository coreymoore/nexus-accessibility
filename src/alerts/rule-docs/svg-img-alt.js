// Rule documentation for: svg-img-alt
// Enhanced accessibility rule description

const svgImgAltRule = {
  plainLanguage: {
    whatItMeans:
      "SVG images must have alternative text that describes their content, unless they are purely decorative.",
    whyItMatters:
      "Users who cannot see SVG images need to understand what information or meaning the image conveys.",
    whoItAffects:
      "Screen reader users, users with slow connections, and anyone who cannot load or see SVG content.",
  },
  technicalSummary:
    "Ensures SVG elements used as images have accessible names through title elements, aria-label, aria-labelledby, or role='img' with descriptions.",
  whyItMatters: [
    "Provides essential information from visual content to all users",
    "Ensures SVG graphics are accessible across different assistive technologies",
    "Maintains content meaning when graphics cannot be perceived",
    "Supports users with various visual and cognitive needs",
  ],
  howToFix: {
    overview:
      "Add appropriate alternative text to SVG images using titles, ARIA labels, or role attributes.",
    methods: [
      {
        approach: "Use title element",
        description:
          "Add a title element inside the SVG for simple descriptions",
        code: `<svg role="img">
  <title>Company logo - Acme Corporation</title>
  <!-- SVG content -->
</svg>`,
      },
      {
        approach: "Use aria-label",
        description: "Add aria-label for concise descriptions",
        code: `<svg aria-label="Sales increased 15% this quarter" role="img">
  <!-- chart content -->
</svg>`,
      },
      {
        approach: "Mark as decorative",
        description: "Use aria-hidden for purely decorative SVGs",
        code: `<svg aria-hidden="true" role="presentation">
  <!-- decorative border pattern -->
</svg>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "SVG image without alternative text",
        code: `<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>`,
        issue: "No title, aria-label, or other accessible name provided",
      },
    ],
    passing: [
      {
        description: "SVG with descriptive title",
        code: `<svg role="img">
  <title>Progress indicator showing 75% complete</title>
  <circle cx="50" cy="50" r="40" fill="lightgray"/>
  <circle cx="50" cy="50" r="30" fill="green"/>
</svg>`,
        explanation:
          "Title element provides clear description of the SVG's meaning",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.1.1 Non-text Content (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        relationship: "SVG images must have text alternatives",
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
