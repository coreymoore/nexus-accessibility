// Rule documentation for: aria-deprecated-role
// Enhanced accessibility rule description

const ariaDeprecatedRoleRule = {
  plainLanguage: {
    whatItMeans:
      "ARIA roles that are outdated and no longer recommended should not be used on elements.",
    whyItMatters:
      "Deprecated roles may not work properly with current assistive technology and could be removed in future updates.",
    whoItAffects:
      "Screen reader users and anyone using assistive technology that interprets ARIA roles.",
  },
  technicalSummary:
    "Ensures elements do not use deprecated ARIA roles that have been superseded by newer, better alternatives.",
  whyItMatters: [
    "Ensures compatibility with current and future assistive technology",
    "Provides users with the most accurate and reliable semantic information",
    "Prevents potential issues when deprecated roles are removed from specifications",
    "Encourages use of current best practices in accessibility implementation",
  ],
  howToFix: {
    overview:
      "Replace deprecated ARIA roles with their modern equivalents or use native HTML elements.",
    methods: [
      {
        approach: "Replace with modern equivalents",
        description:
          "Update deprecated roles to their current alternatives. For example, the `directory` role is deprecated and can often be replaced by a standard list or a `<nav>` element.",
        code: `<!-- Before: Deprecated 'directory' role -->
<ul role="directory">
  <li><a href="/page1">Page 1</a></li>
</ul>

<!-- After: Use a <nav> element or a simple list -->
<nav>
  <ul>
    <li><a href="/page1">Page 1</a></li>
  </ul>
</nav>`,
      },
      {
        approach: "Use semantic HTML instead of ARIA",
        description:
          "In many cases, a native HTML element provides the required semantics without needing an ARIA role at all.",
        code: `<!-- Before: Deprecated 'document' role on a section -->
<div role="document">
  <h2>Chapter 1</h2>
  <p>It was a dark and stormy night...</p>
</div>

<!-- After: Use the <article> element -->
<article>
  <h2>Chapter 1</h2>
  <p>It was a dark and stormy night...</p>
</article>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Using the deprecated 'directory' role",
        code: `<ul role="directory">
  <li><a href="/docs">Documentation</a></li>
  <li><a href="/help">Help</a></li>
</ul>`,
        issue:
          "The 'directory' role is deprecated. A <nav> element or a standard list should be used instead.",
      },
    ],
    passing: [
      {
        description: "Using a <nav> element for site navigation",
        code: `<nav aria-label="Main">
  <ul>
    <li><a href="/docs">Documentation</a></li>
    <li><a href="/help">Help</a></li>
  </ul>
</nav>`,
        explanation:
          "The native <nav> element correctly provides navigation semantics without using a deprecated role.",
      },
      {
        description: "Using an <article> element for self-contained content",
        code: `<article>
  <h2>Blog Post Title</h2>
  <p>Content of the blog post...</p>
</article>`,
        explanation:
          "The <article> element is the modern, semantic equivalent for content that previously might have used role='document'.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Elements must use valid, current ARIA roles",
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
  window.RULE_DESCRIPTIONS["aria-deprecated-role"] = ariaDeprecatedRoleRule;
}
