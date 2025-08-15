// Rule documentation for: image-alt
// Enhanced accessibility rule description

const imageAltRule = {
  plainLanguage: {
    whatItMeans:
      "All images must have alternative text that describes their content or purpose.",
    whyItMatters:
      "People who cannot see images need to understand what information or function the image provides.",
    whoItAffects:
      "Screen reader users, users with slow internet connections, and anyone whose images fail to load.",
  },
  technicalSummary:
    "Ensures img elements have alt attributes that provide appropriate alternative text for the image content or function.",
  whyItMatters: [
    "Provides essential visual information to users who cannot see images",
    "Ensures content remains meaningful when images don't load",
    "Supports users with cognitive disabilities who may prefer text",
    "Enables voice control and other assistive technologies to identify images",
  ],
  howToFix: {
    overview:
      "Add descriptive alt attributes to all img elements based on their purpose.",
    methods: [
      {
        approach: "Descriptive alt text",
        description: "Describe the content or purpose of informative images",
        code: `<img src="chart.png" alt="Sales increased 25% from January to March">
<img src="profile.jpg" alt="Jane Smith, CEO">`,
      },
      {
        approach: "Empty alt for decorative images",
        description: "Use empty alt text for purely decorative images",
        code: `<img src="decorative-border.png" alt="">
<img src="bullet-point.gif" alt="">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Image without alt attribute",
        code: `<img src="important-chart.png">`,
        issue: "No alternative text provided for image content",
      },
    ],
    passing: [
      {
        description: "Image with descriptive alt text",
        code: `<img src="important-chart.png" alt="Monthly sales showing 25% increase">`,
        explanation:
          "Alt text conveys the essential information from the image",
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
        id: "H37",
        title: "Using alt attributes on img elements",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H37",
      },
    ],
  },
};
