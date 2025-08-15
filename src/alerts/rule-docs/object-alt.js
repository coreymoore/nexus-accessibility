// Rule documentation for: object-alt
// Enhanced accessibility rule description

const objectAltRule = {
  plainLanguage: {
    whatItMeans:
      "Object elements (like embedded content) must have alternative text that describes their content or purpose.",
    whyItMatters:
      "Users who cannot access embedded content need to understand what information or functionality it provides.",
    whoItAffects:
      "Screen reader users, users with slow connections, and anyone who cannot load or access embedded content.",
  },
  technicalSummary:
    "Ensures object elements have accessible names or descriptions through alt attributes, aria-label, aria-labelledby, or descriptive text content.",
  whyItMatters: [
    "Provides access to embedded content information for all users",
    "Ensures functionality remains available when plugins fail to load",
    "Supports users who cannot or choose not to load embedded content",
    "Maintains content accessibility across different devices and capabilities",
  ],
  howToFix: {
    overview:
      "Provide alternative text or fallback content for object elements.",
    methods: [
      {
        approach: "Add descriptive text content",
        description: "Include alternative content inside the object element",
        code: `<object data="chart.svg" type="image/svg+xml">
  Sales chart showing 25% increase in Q3 revenue
</object>`,
      },
      {
        approach: "Use aria-label",
        description: "Add aria-label to describe the object's content",
        code: `<object data="interactive-map.swf" 
        aria-label="Interactive map of store locations">
  <p>Interactive map not available. Please see our store locator page.</p>
</object>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Object without alternative text",
        code: `<object data="presentation.pdf" type="application/pdf">
</object>`,
        issue: "No alternative text or fallback content provided",
      },
    ],
    passing: [
      {
        description: "Object with descriptive fallback",
        code: `<object data="financial-chart.svg" type="image/svg+xml">
  Financial performance chart showing revenue growth from 2020-2024
</object>`,
        explanation: "Descriptive fallback text explains the object's content",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.1.1 Non-text Content (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        relationship: "Non-text content must have text alternatives",
      },
    ],
    techniques: [
      {
        id: "H53",
        title: "Using the body of the object element",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H53",
      },
    ],
  },
};
