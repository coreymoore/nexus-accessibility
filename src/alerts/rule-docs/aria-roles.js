// Rule documentation for: aria-roles
// Enhanced accessibility rule description

const ariaRolesRule = {
  plainLanguage: {
    whatItMeans:
      "Any `role` used on an element must be a valid, recognized ARIA role. Misspelled or made-up roles will not be understood by assistive technology.",
    whyItMatters:
      "Screen readers rely on a specific list of roles to understand what an element is and how to interact with it. An invalid role is ignored, and the element may be announced incorrectly or not at all.",
    whoItAffects:
      "Screen reader users and other assistive technology users who depend on correct role semantics.",
  },
  technicalSummary:
    "Ensures that the value of any `role` attribute is a valid, non-abstract ARIA role name as defined by the WAI-ARIA specification. Roles are case-sensitive.",
  whyItMatters: [
    "Ensures that assistive technology can correctly interpret an element's purpose",
    "Prevents bugs caused by misspelled or non-existent roles",
    "Maintains compliance with the ARIA specification",
    "Provides a predictable experience for users of assistive technology",
  ],
  howToFix: {
    overview:
      "Check the `role` attribute for typos or incorrect names. Replace any invalid role with a valid ARIA role from the official specification, or remove the `role` attribute if it is not needed.",
    methods: [
      {
        approach: "Correct typos and capitalization",
        description:
          "ARIA roles are case-sensitive. Check for misspellings and ensure the role is in lowercase.",
        code: `<!-- Before: Misspelled and incorrectly capitalized roles -->
<div role="buton">Click me</div>
<div role="List">Items</div>

<!-- After: Corrected roles -->
<div role="button">Click me</div>
<div role="list">Items</div>`,
      },
      {
        approach: "Use a valid ARIA role",
        description:
          "If a role name is invented (e.g., 'custom-widget'), it is not valid. Replace it with a suitable, existing ARIA role like 'region' or 'group', or remove it.",
        code: `<!-- Before: Invented role -->
<div role="my-special-box">Content</div>

<!-- After: Use a valid, appropriate role -->
<div role="region" aria-label="Special Box">Content</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A misspelled ARIA role",
        code: `<nav role="navigationn">Main Menu</nav>`,
        issue:
          "The role 'navigationn' is not a valid ARIA role. It should be 'navigation'.",
      },
      {
        description: "An abstract role that cannot be used directly",
        code: `<div role="widget">Interactive Element</div>`,
        issue:
          "The role 'widget' is an abstract role and cannot be used on elements. A specific widget role like 'button' or 'slider' should be used instead.",
      },
    ],
    passing: [
      {
        description: "A valid ARIA role",
        code: `<div role="search">
  <input type="text" aria-label="Search">
  <button>Go</button>
</div>`,
        explanation: "The role 'search' is a valid ARIA landmark role.",
      },
      {
        description: "A valid ARIA widget role",
        code: `<div role="button" tabindex="0">Custom Button</div>`,
        explanation: "The role 'button' is a valid ARIA widget role.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "An element's role cannot be programmatically determined if the `role` attribute contains an invalid value.",
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
  window.ariaRolesRule = ariaRolesRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-roles"] = ariaRolesRule;
}
