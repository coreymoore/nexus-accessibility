// Rule documentation for: aria-braille-equivalent
// Enhanced accessibility rule description

const ariaBrailleEquivalentRule = {
  plainLanguage: {
    whatItMeans:
      "Elements with a braille-specific ARIA label must also have a non-braille accessible name.",
    whyItMatters:
      "This ensures that information is available to all users, not just those with braille displays. Screen readers need a standard text label to announce, while braille displays can use the specialized braille version.",
    whoItAffects:
      "Screen reader users, especially those who use braille displays.",
  },
  technicalSummary:
    "Ensures that if an element has an `aria-braillelabel` attribute, it also has a general accessible name (e.g., from `aria-label`, `aria-labelledby`, or its content). Similarly, an `aria-brailleroledescription` must be paired with an `aria-roledescription`.",
  whyItMatters: [
    "Provides a necessary fallback for non-braille assistive technologies",
    "Ensures a consistent experience for users who switch between speech and braille output",
    "Follows the ARIA specification for correct use of braille-specific attributes",
    "Prevents situations where information is only available to braille users",
  ],
  howToFix: {
    overview:
      "When using `aria-braillelabel` or `aria-brailleroledescription`, always provide a corresponding non-braille alternative. The braille version should provide an equivalent experience, often as a more concise or braille-friendly version of the main label.",
    methods: [
      {
        approach: "Add a non-braille accessible name",
        description:
          "If you use `aria-braillelabel`, ensure the element has an accessible name from another source, like `aria-label` or visible text content.",
        code: `<!-- Failing: No non-braille name -->
<span aria-braillelabel="Info"></span>

<!-- Passing: Added aria-label -->
<span aria-label="Information" aria-braillelabel="Info"></span>`,
      },
      {
        approach: "Add aria-roledescription",
        description:
          "If you use `aria-brailleroledescription`, you must also include the standard `aria-roledescription` attribute.",
        code: `<!-- Failing: Missing aria-roledescription -->
<div role="term" aria-brailleroledescription="def">ARIA</div>

<!-- Passing: Added aria-roledescription -->
<div role="term" aria-roledescription="definition" aria-brailleroledescription="def">ARIA</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Element with `aria-braillelabel` but no accessible name",
        code: `<span aria-braillelabel="Exit"></span>`,
        issue:
          "This element has a braille label but no general accessible name for screen readers to announce.",
      },
      {
        description:
          "Element with `aria-brailleroledescription` but no `aria-roledescription`",
        code: `<div role="navigation" aria-brailleroledescription="nav">...</div>`,
        issue:
          "The `aria-brailleroledescription` is present without its required non-braille counterpart, `aria-roledescription`.",
      },
    ],
    passing: [
      {
        description: "Element with both `aria-label` and `aria-braillelabel`",
        code: `<button aria-label="Close dialog" aria-braillelabel="Close dlg">X</button>`,
        explanation:
          "The element has a standard accessible name (`aria-label`) and a specific, equivalent label for braille users.",
      },
      {
        description:
          "Element with both `aria-roledescription` and `aria-brailleroledescription`",
        code: `<div role="slider" aria-roledescription="rating" aria-brailleroledescription="rtg"></div>`,
        explanation:
          "The element provides both a standard and a braille-specific role description.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Using ARIA attributes correctly is essential for providing an element's name and role to assistive technologies.",
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

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-braille-equivalent"] =
    ariaBrailleEquivalentRule;
}

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-braille-equivalent"] =
    ariaBrailleEquivalentRule;
}
