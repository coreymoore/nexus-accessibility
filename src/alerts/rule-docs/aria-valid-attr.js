// Rule documentation for: aria-valid-attr
// Enhanced accessibility rule description

const ariaValidAttrRule = {
  plainLanguage: {
    whatItMeans:
      "Only use ARIA attributes that are part of the official ARIA specification, and make sure they are spelled correctly.",
    whyItMatters:
      "Assistive technologies only understand a specific list of ARIA attributes. Misspelled or made-up attributes (like `aria-lable` instead of `aria-label`) are ignored, meaning the intended accessibility feature will not work.",
    whoItAffects:
      "Screen reader users and other assistive technology users who rely on ARIA attributes to understand and operate web content.",
  },
  technicalSummary:
    "Ensures that all attributes starting with `aria-` are valid, non-abstract ARIA attributes as defined by the WAI-ARIA specification. This check catches typos and the use of non-standard attributes.",
  whyItMatters: [
    "Ensures that ARIA attributes are correctly recognized and processed by all assistive technologies",
    "Prevents silent failures and bugs caused by simple typos in attribute names",
    "Maintains strict compliance with the ARIA specification, leading to more robust and predictable components",
    "Guarantees that the intended accessibility features are actually delivered to the user",
  ],
  howToFix: {
    overview:
      "Check the attribute name for typos and verify that it is a valid ARIA attribute. If it's a typo, correct it. If it's not a valid attribute, remove it or replace it with a valid one. For custom data, use `data-*` attributes instead.",
    methods: [
      {
        approach: "Correct typos in ARIA attribute names",
        description:
          "ARIA attributes are case-sensitive and must be spelled exactly as defined in the specification.",
        code: `<!-- Before: Misspelled attributes -->
<button aria-lable="Submit">Submit</button>
<div aria-describeby="info">...</div>

<!-- After: Correctly spelled attributes -->
<button aria-label="Submit">Submit</button>
<div aria-describedby="info">...</div>`,
      },
      {
        approach: "Replace non-standard attributes",
        description:
          "If an attribute like `aria-custom` is used, it is not valid. Replace it with a valid ARIA attribute or, if it's for your own scripts, a `data-*` attribute.",
        code: `<!-- Before: Invalid attribute -->
<div aria-action="delete">...</div>

<!-- After: Use a data-* attribute for custom data -->
<div data-action="delete">...</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A misspelled ARIA attribute",
        code: `<input aria-requried="true">`,
        issue:
          "The attribute `aria-requried` is a typo and should be `aria-required`.",
      },
      {
        description: "A non-existent ARIA attribute",
        code: `<div aria-tooltip="This is a tooltip">...</div>`,
        issue:
          '`aria-tooltip` is not a valid ARIA attribute. Tooltips are created using `role="tooltip"`, not a specific ARIA attribute.',
      },
    ],
    passing: [
      {
        description: "Correctly spelled, valid ARIA attributes",
        code: `<input type="email" aria-required="true" aria-label="Email Address">`,
        explanation:
          "Both `aria-required` and `aria-label` are valid and correctly spelled ARIA attributes.",
      },
      {
        description: "Using a `data-*` attribute for custom information",
        code: `<div data-element-id="user-panel-123">...</div>`,
        explanation:
          "For custom data not intended for assistive technologies, `data-*` attributes are the correct approach and will not trigger this rule.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Using invalid or misspelled ARIA attributes means that the states and properties of a component cannot be programmatically determined, failing this criterion.",
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
  window.ariaValidAttrRule = ariaValidAttrRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-valid-attr"] = ariaValidAttrRule;
}
