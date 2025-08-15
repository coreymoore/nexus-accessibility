// Rule documentation for: aria-required-parent
// Enhanced accessibility rule description

const ariaRequiredParentRule = {
  plainLanguage: {
    whatItMeans:
      "Certain ARIA roles are only meaningful when they are inside a specific parent component. For example, a 'listitem' role only makes sense inside a 'list' role.",
    whyItMatters:
      "Without the correct parent, a screen reader doesn't know what to do with the child element. A 'listitem' floating on its own is just text; inside a 'list', it becomes part of a navigable structure.",
    whoItAffects:
      "Screen reader users who rely on the correct structure to understand and navigate complex components.",
  },
  technicalSummary:
    "Ensures that elements with an ARIA role that requires a specific parent role are properly contained within an element with that parent role. For example, `role='listitem'` must be a child of an element with `role='list'` or `role='group'`.",
  whyItMatters: [
    "Maintains the required semantic structure of ARIA design patterns",
    "Ensures screen readers can correctly interpret and announce the context of an element",
    "Enables proper navigation of composite widgets like lists, menus, and grids",
    "Prevents assistive technology from ignoring or misinterpreting orphaned child elements",
  ],
  howToFix: {
    overview:
      "To fix this, either wrap the element in a container with the required parent role, or, if the role is not being used correctly, remove it. Often, using native HTML is a simpler and better solution.",
    methods: [
      {
        approach: "Add the required parent container",
        description:
          "Wrap the element with the child role inside an element with the required parent role.",
        code: `<!-- Before: 'listitem' has no parent 'list' -->
<div role="listitem">Orphaned list item</div>

<!-- After: The item is wrapped in a list container -->
<ul role="list">
  <li role="listitem">Contained list item</li>
</ul>`,
      },
      {
        approach: "Use native HTML elements",
        description:
          "Native HTML elements have the correct parent-child relationships built-in, which is less error-prone.",
        code: `<!-- ARIA version with required parent/child -->
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
          "A `role='listitem'` that is not contained within a `list` or `group`",
        code: `<div>
  <div role="listitem">An item that is not in a list.</div>
</div>`,
        issue:
          "The `listitem` role is only valid when it is a child of an element with `role='list'` or `role='group'`.",
      },
      {
        description: "A `role='tab'` that is not a child of a `role='tablist'`",
        code: `<button role="tab">Orphaned Tab</button>`,
        issue:
          "An element with `role='tab'` must be contained within an element with `role='tablist'`.",
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
          "The `listitem` children are correctly contained within a parent `list`.",
      },
      {
        description: "A correctly structured native HTML list",
        code: `<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>`,
        explanation:
          "Native HTML `<ul>` and `<li>` elements correctly handle the parent/child relationship automatically.",
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
          "The role of a child element is only correctly conveyed when it is within its required parent container.",
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
  window.ariaRequiredParentRule = ariaRequiredParentRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-required-parent"] = ariaRequiredParentRule;
}
