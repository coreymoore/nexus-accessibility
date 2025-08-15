// Rule documentation for: aria-allowed-attr
// Enhanced accessibility rule description

const ariaAllowedAttrRule = {
  plainLanguage: {
    whatItMeans:
      "ARIA attributes used on elements must be valid and allowed for that specific element type.",
    whyItMatters:
      "Invalid ARIA attributes can confuse assistive technology and cause it to behave unexpectedly.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology.",
  },
  technicalSummary:
    "Ensures all ARIA attributes used on elements are valid and permitted by the ARIA specification for that element.",
  whyItMatters: [
    "Prevents assistive technology from misinterpreting element behavior",
    "Ensures ARIA attributes function as intended",
    "Maintains consistent and predictable user experience",
    "Follows ARIA specification guidelines for proper implementation",
  ],
  howToFix: {
    overview:
      "Remove invalid ARIA attributes or replace them with valid alternatives appropriate for the element.",
    methods: [
      {
        approach: "Remove invalid attributes",
        description:
          "Remove ARIA attributes that are not allowed on the element",
        code: `<!-- Before: Invalid aria-placeholder on div -->
<div aria-placeholder="Enter text">Content</div>

<!-- After: Remove invalid attribute -->
<div>Content</div>`,
      },
      {
        approach: "Use correct attributes",
        description: "Replace invalid attributes with appropriate alternatives",
        code: `<!-- Before: Invalid aria-required on div -->
<div aria-required="true">Required field</div>

<!-- After: Use on input element instead -->
<input type="text" aria-required="true" aria-label="Required field">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Using aria-placeholder on non-input element",
        code: `<div aria-placeholder="Enter your name">User input area</div>`,
        issue: "aria-placeholder is only valid on input elements",
      },
      {
        description: "Using an invalid attribute for a specific role",
        code: `<div role="button" aria-checked="true">Check Me</div>`,
        issue:
          'The "aria-checked" attribute is not allowed on elements with role="button".',
      },
    ],
    passing: [
      {
        description: "Using aria-placeholder correctly on input",
        code: `<input type="text" aria-placeholder="Enter your full name">`,
        explanation:
          "aria-placeholder is appropriately used on an input element",
      },
      {
        description: "Using aria-expanded on button",
        code: `<button aria-expanded="false" aria-controls="menu">Menu</button>`,
        explanation:
          "aria-expanded is correctly used on an interactive element",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "ARIA attributes must be used correctly to provide proper semantics",
      },
    ],
    techniques: [
      {
        id: "ARIA5",
        title:
          "Using WAI-ARIA state and property attributes to expose the state of a user interface component",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA5",
      },
    ],
  },
};

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-allowed-attr"] = ariaAllowedAttrRule;
}
