// Rule documentation for: aria-required-children
// Enhanced accessibility rule description

const ariaRequiredChildrenRule = {
  plainLanguage: {
    whatItMeans:
      "Some complex ARIA components are made of a parent element and specific types of child elements. This rule checks that the parent element contains at least one of its required children.",
    whyItMatters:
      "Screen readers rely on this specific parent-child structure to understand and interact with complex widgets like menus, lists, and grids. A `list` without `listitem` children is just a generic container to a screen reader.",
    whoItAffects:
      "Screen reader users who need the correct structure to navigate and understand composite widgets.",
  },
  technicalSummary:
    "Ensures that elements with an ARIA role that requires specific child roles actually have at least one of the required children. For example, a `role='list'` must contain at least one element with `role='listitem'`.",
  whyItMatters: [
    "Enables correct navigation and interaction within complex ARIA widgets",
    "Ensures screen readers can announce the structure and relationship of components",
    "Maintains the semantic integrity of ARIA design patterns",
    "Prevents assistive technology from treating a composite widget as a simple container",
  ],
  howToFix: {
    overview:
      "Ensure that any element with a composite ARIA role has the necessary child elements with their own required roles. If the child elements are not present, either add them or remove the parent role.",
    methods: [
      {
        approach: "Add the required child elements",
        description:
          "For a parent element with `role='list'`, ensure its children have `role='listitem'`.",
        code: `<!-- Before: A 'list' with no 'listitem' children -->
<div role="list">
  <div>Just a div</div>
</div>

<!-- After: The child is given its required role -->
<div role="list">
  <div role="listitem">A proper list item</div>
</div>`,
      },
      {
        approach: "Use native HTML elements",
        description:
          "Often, the simplest fix is to use native HTML, which has these parent-child relationships built-in.",
        code: `<!-- ARIA version -->
<div role="list">
  <div role="listitem">Item 1</div>
</div>

<!-- Equivalent and simpler HTML version -->
<ul>
  <li>Item 1</li>
</ul>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "A `role='list'` that contains no `role='listitem'` children",
        code: `<div role="list">
  <p>This is just a paragraph, not a list item.</p>
</div>`,
        issue:
          "Elements with `role='list'` must contain at least one child with `role='listitem'`.",
      },
      {
        description:
          "A `role='tablist'` that contains no `role='tab'` children",
        code: `<div role="tablist">
  <button>This button is missing role='tab'</button>
</div>`,
        issue:
          "A `tablist` must contain children with `role='tab'` to be valid.",
      },
    ],
    passing: [
      {
        description: "A correctly structured ARIA list",
        code: `<div role="list">
  <div role="listitem">First item</div>
  <div role="listitem">Second item</div>
</div>`,
        explanation:
          "The parent `list` correctly contains `listitem` children.",
      },
      {
        description: "A correctly structured ARIA tablist",
        code: `<div role="tablist" aria-label="Sample Tabs">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>`,
        explanation: "The `tablist` parent correctly contains `tab` children.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "The parent-child relationship in ARIA widgets must be programmatically determinable to be understood by assistive technology.",
      },
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "The role of a composite widget is only correctly conveyed when its required children are present.",
      },
    ],
    techniques: [
      {
        id: "G108",
        title: "Using markup features to expose name, role, and state",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G108",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.ariaRequiredChildrenRule = ariaRequiredChildrenRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-required-children"] = ariaRequiredChildrenRule;
}
