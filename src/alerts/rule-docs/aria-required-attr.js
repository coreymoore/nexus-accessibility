// Rule documentation for: aria-required-attr
// Enhanced accessibility rule description

const ariaRequiredAttrRule = {
  plainLanguage: {
    whatItMeans:
      "When an element is given a specific ARIA role, it must also have all the ARIA attributes that are required to make that role work correctly.",
    whyItMatters:
      "Without the required supporting attributes, an ARIA role might not work as expected in screen readers. For example, a 'slider' role is meaningless without attributes that define its current value and its minimum and maximum values.",
    whoItAffects:
      "Screen reader users and other assistive technology users who rely on ARIA for understanding and interacting with custom components.",
  },
  technicalSummary:
    "Ensures that when an element has an ARIA role, it includes all the attributes that are required by the ARIA specification for that specific role. For example, `role='slider'` requires `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.",
  whyItMatters: [
    "Ensures custom ARIA components are complete and functional",
    "Prevents assistive technology from misinterpreting or ignoring incomplete components",
    "Maintains compliance with the ARIA specification",
    "Provides a predictable and reliable experience for users",
  ],
  howToFix: {
    overview:
      "Identify the ARIA role on the element and consult the ARIA specification to determine which attributes are required. Add any missing required attributes to the element.",
    methods: [
      {
        approach: "Add missing required attributes",
        description:
          "For a `role='slider'`, you must provide `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` for the slider to be understood.",
        code: `<!-- Before: Missing required attributes for the slider role -->
<div role="slider" aria-valuenow="50"></div>

<!-- After: All required attributes are present -->
<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>`,
      },
      {
        approach: "Add missing required attributes for a scrollbar",
        description:
          "A `role='scrollbar'` requires `aria-controls`, `aria-orientation`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.",
        code: `<!-- Before: Missing required attributes for the scrollbar role -->
<div role="scrollbar" aria-valuenow="25"></div>

<!-- After: All required attributes are present -->
<div role="scrollbar" aria-controls="main-content" aria-orientation="vertical" 
     aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A slider missing its min and max value attributes",
        code: `<div role="slider" aria-valuenow="7"></div>`,
        issue:
          "The 'slider' role requires the `aria-valuemin` and `aria-valuemax` attributes to define its range, but they are missing.",
      },
      {
        description: "A scrollbar missing multiple required attributes",
        code: `<div role="scrollbar" aria-orientation="horizontal" aria-valuenow="10"></div>`,
        issue:
          "The 'scrollbar' role requires `aria-controls`, `aria-valuemin`, and `aria-valuemax` in addition to the provided attributes.",
      },
    ],
    passing: [
      {
        description: "A complete slider implementation",
        code: `<div role="slider" aria-label="Volume"
     aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>`,
        explanation:
          "All required attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`) are present for the slider role.",
      },
      {
        description: "A complete scrollbar implementation",
        code: `<div role="scrollbar" aria-controls="content-area" aria-orientation="vertical"
     aria-valuenow="30" aria-valuemin="0" aria-valuemax="100"></div>`,
        explanation:
          "All required attributes for the scrollbar role are present.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "For a component's role and value to be programmatically determinable, all required ARIA attributes must be present.",
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
  window.ariaRequiredAttrRule = ariaRequiredAttrRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-required-attr"] = ariaRequiredAttrRule;
}
