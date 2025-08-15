// Rule documentation for: aria-valid-attr-value
// Enhanced accessibility rule description

const ariaValidAttrValueRule = {
  plainLanguage: {
    whatItMeans:
      "ARIA attributes must be given valid, expected values. For example, an attribute that expects a true/false value cannot be set to 'maybe'.",
    whyItMatters:
      "If an ARIA attribute has an invalid or unexpected value, assistive technologies will ignore it or behave unpredictably. This can break the functionality of a component for some users.",
    whoItAffects:
      "Screen reader users and other assistive technology users who rely on ARIA attributes to correctly interpret the state and properties of interface components.",
  },
  technicalSummary:
    "Ensures that all ARIA attributes have values that are valid according to the WAI-ARIA specification. This applies to attributes that expect a specific type of value, such as a boolean (`true`/`false`), a tristate (`true`/`false`/`mixed`), a number, an ID reference, or a specific token (e.g., `assertive` for `aria-live`).",
  whyItMatters: [
    "Ensures that ARIA states and properties function as intended across all assistive technologies",
    "Prevents assistive technology from ignoring, misinterpreting, or crashing due to invalid values",
    "Maintains predictable and reliable behavior for custom widgets and components",
    "Upholds compliance with the strict requirements of the WAI-ARIA specification",
  ],
  howToFix: {
    overview:
      "Check the ARIA specification for the attribute in question to see what values it allows, and correct the value accordingly. Common fixes involve correcting booleans, numbers, and predefined tokens.",
    methods: [
      {
        approach: "Correct boolean and tristate values",
        description:
          "Attributes like `aria-hidden` expect a boolean (`true` or `false`). Attributes like `aria-pressed` or `aria-checked` can also accept `mixed`.",
        code: `<!-- Before: Invalid boolean and tristate values -->
<div aria-hidden="1">Hidden Content</div>
<button aria-pressed="yes">Toggle</button>

<!-- After: Correct boolean and tristate values -->
<div aria-hidden="true">Hidden Content</div>
<button aria-pressed="true">Toggle</button>`,
      },
      {
        approach: "Use valid tokens for token-based attributes",
        description:
          "Many ARIA attributes only allow a specific set of text values (tokens). For example, `aria-live` accepts `off`, `polite`, or `assertive`.",
        code: `<!-- Before: Invalid token -->
<div aria-live="impolite"></div>

<!-- After: Valid token -->
<div aria-live="assertive"></div>`,
      },
      {
        approach: "Provide valid numbers for numeric attributes",
        description:
          "Attributes like `aria-valuenow` or `aria-level` must be a number.",
        code: `<!-- Before: Invalid number -->
<div role="heading" aria-level="three"></div>

<!-- After: Valid number -->
<div role="heading" aria-level="3"></div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "An invalid value for `aria-expanded`",
        code: `<button aria-expanded="open">Menu</button>`,
        issue:
          "The `aria-expanded` attribute is a boolean and only accepts 'true' or 'false'.",
      },
      {
        description: "An invalid token for `aria-haspopup`",
        code: `<button aria-haspopup="yes">Open Dialog</button>`,
        issue:
          "The `aria-haspopup` attribute expects one of the following tokens: `false`, `true`, `menu`, `listbox`, `tree`, `grid`, or `dialog`. 'yes' is not a valid token.",
      },
      {
        description: "A non-numeric value for `aria-valuenow`",
        code: `<div role="slider" aria-valuenow="fifty"></div>`,
        issue: "The `aria-valuenow` attribute must be a number, not text.",
      },
    ],
    passing: [
      {
        description: "A valid boolean value for `aria-pressed`",
        code: `<button aria-pressed="false">Notifications</button>`,
        explanation:
          "The value 'false' is a valid boolean for the `aria-pressed` attribute.",
      },
      {
        description: "A valid token for `aria-live`",
        code: `<div class="status" aria-live="polite"></div>`,
        explanation:
          "The value 'polite' is one of the allowed tokens for the `aria-live` attribute.",
      },
      {
        description: "A valid number for `aria-level`",
        code: `<h1 aria-level="1">Main Heading</h1>`,
        explanation:
          "The value '1' is a valid integer for the `aria-level` attribute.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "The states and properties of a component must be programmatically settable. Using invalid values for ARIA attributes fails this requirement, as the state or property cannot be correctly determined.",
      },
    ],
    techniques: [
      {
        id: "G108",
        title: "Using markup features to expose name, role, and state",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G108",
      },
      {
        id: "ARIA5",
        title:
          "Using WAI-ARIA state and property attributes to expose the state of a user interface component",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA5",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.ariaValidAttrValueRule = ariaValidAttrValueRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-valid-attr-value"] = ariaValidAttrValueRule;
}
