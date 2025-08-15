// Rule documentation for: list
// Enhanced accessibility rule description

const listRule = {
  plainLanguage: {
    whatItMeans:
      "Lists must be properly structured with only list items, scripts, or templates as direct children.",
    whyItMatters:
      "Screen readers need proper list structure to announce the number of items and navigate through them correctly.",
    whoItAffects:
      "Screen reader users who rely on list navigation commands and semantic structure.",
  },
  technicalSummary:
    "Ensures ul and ol elements only contain li, script, or template elements as direct children.",
  whyItMatters: [
    "Enables screen readers to announce accurate list information",
    "Supports list navigation commands in assistive technology",
    "Maintains proper semantic structure for automated tools",
    "Ensures consistent behavior across different browsers and devices",
  ],
  howToFix: {
    overview:
      "Remove non-list elements from inside ul/ol tags or restructure the content appropriately.",
    methods: [
      {
        approach: "Move content to list items",
        description: "Place content inside proper li elements",
        code: `<!-- Before: Invalid structure -->
<ul>
  <div>Not a list item</div>
  <li>Valid list item</li>
</ul>

<!-- After: Proper structure -->
<ul>
  <li>Content moved to list item</li>
  <li>Valid list item</li>
</ul>`,
      },
      {
        approach: "Use proper container elements",
        description: "Use div or section for mixed content, not lists",
        code: `<!-- Before: Misusing list for layout -->
<ul>
  <li>Item 1</li>
  <p>Not a list item</p>
</ul>

<!-- After: Use appropriate container -->
<div>
  <ul>
    <li>Item 1</li>
  </ul>
  <p>Regular paragraph</p>
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "List with non-list-item children",
        code: `<ul>
  <li>First item</li>
  <div>Invalid div in list</div>
  <li>Second item</li>
</ul>`,
        issue: "div element is not allowed as direct child of ul",
      },
    ],
    passing: [
      {
        description: "Properly structured list",
        code: `<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>`,
        explanation: "All direct children are li elements",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship: "List structure must be programmatically determinable",
      },
    ],
    techniques: [
      {
        id: "H48",
        title: "Using ol, ul and dl for lists or groups of links",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H48",
      },
    ],
  },
};
