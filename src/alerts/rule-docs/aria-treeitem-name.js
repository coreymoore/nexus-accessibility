// Rule documentation for: aria-treeitem-name
// Enhanced accessibility rule description

const ariaTreeitemNameRule = {
  plainLanguage: {
    whatItMeans:
      "Every item in a tree menu or folder structure must have a clear, accessible label that describes what it is.",
    whyItMatters:
      "Without labels, users of assistive technology cannot understand the options in a tree view. They won't know what a folder or item represents, making it impossible to navigate the hierarchy.",
    whoItAffects:
      "Screen reader users, users of voice control software, and anyone who relies on assistive technology to navigate hierarchical content.",
  },
  technicalSummary:
    'Ensures that any element with `role="treeitem"` has an accessible name. The name is typically derived from the element\'s text content but can also be provided by `aria-label` or `aria-labelledby`.',
  whyItMatters: [
    "Enables effective navigation and understanding of hierarchical tree structures",
    "Provides essential context for each tree item's content and purpose",
    "Allows screen readers to properly announce each item as the user navigates the tree",
    "Ensures that complex tree widgets are usable, compliant, and accessible to all users",
  ],
  howToFix: {
    overview:
      "Ensure every `treeitem` has a descriptive name. The best method is to place the visible label directly within the `treeitem` element. If that's not possible, use `aria-label` or `aria-labelledby`.",
    methods: [
      {
        approach: "Include descriptive text within the element",
        description:
          "The simplest and most robust method is to make the visible text the direct content of the `treeitem` element.",
        code: `<div role="tree">
  <div role="treeitem" aria-expanded="true">
    Documents
    <div role="group">
      <div role="treeitem">Q1-Report.pdf</div>
      <div role="treeitem">Presentation.pptx</div>
    </div>
  </div>
</div>`,
      },
      {
        approach: "Use `aria-label` for non-textual items",
        description:
          "If a `treeitem`'s content is not descriptive (e.g., just an icon), use `aria-label` to provide a concise accessible name.",
        code: `<!-- An icon is used, so aria-label provides the name -->
<div role="treeitem" aria-label="Profile Picture">
  <img src="photo.png" alt="">
</div>`,
      },
      {
        approach: "Use `aria-labelledby` to reference an existing label",
        description:
          "If a visible label exists but is separate from the `treeitem` element, use `aria-labelledby` to link them.",
        code: `<div role="treeitem" aria-labelledby="item-label-1">
  <img src="folder.svg" alt="">
</div>
<span id="item-label-1">My Vacation Photos</span>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A `treeitem` contains only a decorative image.",
        code: `<div role="treeitem">
  <img src="folder-icon.png" alt="">
</div>`,
        issue:
          "This `treeitem` has no text content or ARIA label, so a screen reader has nothing to announce.",
      },
      {
        description: "A `treeitem` has no content at all.",
        code: `<div role="treeitem" aria-expanded="false"></div>`,
        issue:
          "An empty `treeitem` is not focusable and provides no information to the user.",
      },
    ],
    passing: [
      {
        description: "A `treeitem` gets its name from its text content.",
        code: `<div role="treeitem" aria-expanded="true">
  Projects
</div>`,
        explanation:
          "The text 'Projects' serves as the accessible name for the tree item.",
      },
      {
        description: "A `treeitem` uses `aria-label` to provide a name.",
        code: `<div role="treeitem" aria-label="Annual Report (PDF, 2.5 MB)">
  <svg aria-hidden="true" focusable="false" />
</div>`,
        explanation:
          "The `aria-label` provides a detailed, accessible name when there is no visible text.",
      },
      {
        description:
          "A complex `treeitem` uses `aria-labelledby` to construct a name from multiple elements.",
        code: `<div role="treeitem" aria-labelledby="doc-name doc-type">
  <span id="doc-name">Financials</span>
  <span id="doc-type">Spreadsheet</span>
</div>`,
        explanation:
          "The `aria-labelledby` attribute combines 'Financials' and 'Spreadsheet' to create the full accessible name: 'Financials Spreadsheet'.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "All user interface components, including `treeitem` elements, must have a programmatically determinable name.",
      },
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "The name of a tree item is essential for understanding its relationship to other items in the tree structure.",
      },
      {
        criterion: "2.5.3 Label in Name (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html",
        relationship:
          "If a `treeitem` has a visible text label, that text must be part of its accessible name.",
      },
    ],
    techniques: [
      {
        id: "G108",
        title: "Using markup features to expose name, role, and state",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G108",
      },
      {
        id: "ARIA14",
        title:
          "Using aria-label to provide an invisible label where a visible label cannot be used",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA14",
      },
      {
        id: "ARIA16",
        title:
          "Using aria-labelledby to provide a name for a user interface control",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA16",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.ariaTreeitemNameRule = ariaTreeitemNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-treeitem-name"] = ariaTreeitemNameRule;
}
