// Rule documentation for: summary-name
// Enhanced accessibility rule description

const summaryNameRule = {
  plainLanguage: {
    whatItMeans:
      "Summary elements for expandable content must have descriptive text that explains what will be revealed.",
    whyItMatters:
      "Users need to understand what content they'll see before expanding disclosure widgets or collapsible sections.",
    whoItAffects:
      "Screen reader users and anyone using assistive technology to navigate expandable content sections.",
  },
  technicalSummary:
    "Ensures summary elements within details elements have meaningful text content that describes the collapsible content.",
  whyItMatters: [
    "Provides context for expandable content sections",
    "Helps users decide whether to expand content",
    "Supports screen reader navigation of disclosure widgets",
    "Ensures summary elements serve their intended purpose",
  ],
  howToFix: {
    overview:
      "Provide descriptive text content for summary elements that clearly explains what content will be revealed.",
    methods: [
      {
        approach: "Use descriptive summary text",
        description: "Write clear summaries that describe the hidden content",
        code: `<!-- Before: Vague summary -->
<details>
  <summary>More</summary>
  <p>Technical specifications and warranty information...</p>
</details>

<!-- After: Descriptive summary -->
<details>
  <summary>Technical specifications and warranty</summary>
  <p>Technical specifications and warranty information...</p>
</details>`,
      },
      {
        approach: "Include context in summaries",
        description: "Provide enough context to understand the content type",
        code: `<details>
  <summary>Shipping and return policy details</summary>
  <div>
    <h3>Shipping</h3>
    <p>We offer free shipping on orders over $50...</p>
    <h3>Returns</h3>
    <p>Items can be returned within 30 days...</p>
  </div>
</details>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Summary with generic text",
        code: `<details>
  <summary>Click here</summary>
  <p>Detailed product specifications...</p>
</details>`,
        issue: "Summary doesn't describe what content will be revealed",
      },
    ],
    passing: [
      {
        description: "Summary with descriptive text",
        code: `<details>
  <summary>Product specifications</summary>
  <p>Detailed product specifications...</p>
</details>`,
        explanation: "Summary clearly indicates what content will be shown",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Summary elements must have meaningful names",
      },
    ],
    techniques: [
      {
        id: "H91",
        title: "Using HTML form controls and links",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H91",
      },
    ],
  },
};
