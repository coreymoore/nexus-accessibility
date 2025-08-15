// Rule documentation for: listitem
// Enhanced accessibility rule description

const listitemRule = {
  plainLanguage: {
    whatItMeans:
      "List items must be contained within proper list structures like ul, ol, or menu elements.",
    whyItMatters:
      "Screen readers depend on proper list structure to understand and navigate content correctly.",
    whoItAffects:
      "Screen reader users who use list navigation commands to move through content efficiently.",
  },
  technicalSummary:
    "Ensures li elements are contained within ul, ol, or menu parent elements as required by HTML semantics.",
  whyItMatters: [
    "Enables proper list navigation in screen readers",
    "Ensures accurate announcement of list context and item count",
    "Maintains semantic meaning for automated tools and browsers",
    "Supports consistent interpretation across assistive technologies",
  ],
  howToFix: {
    overview:
      "Wrap orphaned list items in appropriate list container elements.",
    methods: [
      {
        approach: "Add list container",
        description: "Wrap li elements in ul or ol as appropriate",
        code: `<!-- Before: Orphaned list items -->
<li>First item</li>
<li>Second item</li>

<!-- After: Proper list structure -->
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>`,
      },
      {
        approach: "Use different elements",
        description:
          "Replace li with appropriate elements if not actually a list",
        code: `<!-- Before: Misusing li elements -->
<li>Not really a list item</li>

<!-- After: Use appropriate element -->
<p>Regular paragraph content</p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "List item without list container",
        code: `<div>
  <li>Orphaned list item</li>
  <li>Another orphaned item</li>
</div>`,
        issue: "li elements must be children of ul, ol, or menu elements",
      },
    ],
    passing: [
      {
        description: "List items in proper container",
        code: `<ul>
  <li>Properly contained item</li>
  <li>Another properly contained item</li>
</ul>`,
        explanation: "li elements are properly contained within ul",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "List relationships must be programmatically determinable",
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
