// Rule documentation for: nested-interactive
// Enhanced accessibility rule description

const nestedInteractiveRule = {
  plainLanguage: {
    whatItMeans:
      "Interactive elements like buttons and links should not be nested inside each other.",
    whyItMatters:
      "When interactive elements are nested, it's unclear which action will happen when a user clicks, and it confuses assistive technology.",
    whoItAffects:
      "Keyboard users, screen reader users, and anyone who relies on clear, predictable interactive elements.",
  },
  technicalSummary:
    "Ensures interactive elements (buttons, links, form controls) are not nested within other interactive elements.",
  whyItMatters: [
    "Prevents ambiguous user interactions",
    "Ensures predictable behavior for assistive technology",
    "Supports clear keyboard navigation patterns",
    "Avoids confusion about which element will receive focus",
  ],
  howToFix: {
    overview:
      "Restructure content so that interactive elements are not nested within each other.",
    methods: [
      {
        approach: "Separate interactive elements",
        description:
          "Place interactive elements as siblings rather than nesting them",
        code: `<!-- Before: Nested interactive elements -->
<button>
  <a href="/details">View Details</a>
</button>

<!-- After: Separate elements -->
<div class="action-group">
  <button>Action</button>
  <a href="/details">View Details</a>
</div>`,
      },
      {
        approach: "Use one interactive element",
        description: "Choose the most appropriate single interactive element",
        code: `<!-- Before: Button inside link -->
<a href="/product">
  <button>Buy Now</button>
</a>

<!-- After: Single interactive element -->
<a href="/product" class="buy-button">Buy Now</a>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Button nested inside link",
        code: `<a href="/article">
  <h3>Article Title</h3>
  <button>Read More</button>
</a>`,
        issue:
          "Button is nested inside a link, creating conflicting interactions",
      },
    ],
    passing: [
      {
        description: "Separate interactive elements",
        code: `<article>
  <h3><a href="/article">Article Title</a></h3>
  <button onclick="toggleBookmark()">Bookmark</button>
</article>`,
        explanation: "Link and button are separate, avoiding nesting conflicts",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Interactive elements must have clear, unambiguous roles",
      },
    ],
    techniques: [
      {
        id: "G90",
        title: "Providing keyboard-triggered event handlers",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G90",
      },
    ],
  },
};
