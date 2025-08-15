// Rule documentation for: aria-hidden-body
// Enhanced accessibility rule description

const ariaHiddenBodyRule = {
  plainLanguage: {
    whatItMeans:
      "The main body element of a webpage must never be hidden from assistive technology users.",
    whyItMatters:
      "If the body is hidden, screen readers won't be able to access any of the page content.",
    whoItAffects:
      "Screen reader users and anyone using assistive technology to navigate web content.",
  },
  technicalSummary:
    "Ensures the document body element does not have aria-hidden='true' which would hide all page content from assistive technology.",
  whyItMatters: [
    "Prevents complete loss of page content for assistive technology users",
    "Ensures the fundamental structure of the page remains accessible",
    "Maintains basic navigation and content discovery capabilities",
    "Prevents accidental exclusion of all users who rely on assistive technology",
  ],
  howToFix: {
    overview:
      "Remove `aria-hidden='true'` from the `<body>` element. If you need to hide content, such as when a modal dialog is open, apply `aria-hidden='true'` to specific background elements, not the body itself.",
    methods: [
      {
        approach: "Remove the attribute",
        description:
          "The simplest fix is to remove the `aria-hidden` attribute from the `<body>` element entirely.",
        code: `<!-- Before: Body is hidden from assistive technology -->
<body aria-hidden="true">
  <!-- All page content is inaccessible -->
</body>

<!-- After: The attribute is removed -->
<body>
  <!-- Page content is accessible -->
</body>`,
      },
      {
        approach: "Manage visibility with a modal",
        description:
          "When a modal is open, hide the main content and leave the modal visible. Never hide the `<body>`.",
        code: `<body>
  <main id="main-content" aria-hidden="true">
    <!-- The main page content is hidden -->
  </main>
  <div role="dialog" aria-modal="true">
    <!-- The modal content remains accessible -->
  </div>
</body>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "The `<body>` element is hidden from assistive technology",
        code: `<body aria-hidden="true">
  <main>This entire page is inaccessible to screen readers.</main>
</body>`,
        issue:
          "Applying `aria-hidden='true'` to the `<body>` makes all content on the page inaccessible to assistive technology.",
      },
    ],
    passing: [
      {
        description: "The `<body>` element is visible to all users",
        code: `<body>
  <main>Page content is accessible.</main>
</body>`,
        explanation:
          "The absence of `aria-hidden='true'` ensures the content is accessible to assistive technology.",
      },
      {
        description: "Hiding background content for a modal dialog",
        code: `<body>
  <header aria-hidden="true">...</header>
  <main aria-hidden="true">...</main>
  <div role="dialog" aria-modal="true" aria-label="Login">
    <p>This dialog is the only thing accessible to screen readers.</p>
  </div>
</body>`,
        explanation:
          "Specific sections are hidden, but the `<body>` itself is not, ensuring the modal remains accessible.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "The document's content must be programmatically determinable, which is impossible if the body is hidden.",
      },
    ],
    techniques: [
      {
        id: "G108",
        title: "Using markup features to expose the name and role",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G108.html",
      },
    ],
  },
};

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-hidden-body"] = ariaHiddenBodyRule;
}
