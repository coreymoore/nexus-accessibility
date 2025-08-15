// Rule documentation for: aria-prohibited-attr
// Enhanced accessibility rule description

const ariaProhibitedAttrRule = {
  plainLanguage: {
    whatItMeans:
      "Certain ARIA attributes are not allowed on specific HTML elements because they conflict with the element's built-in features.",
    whyItMatters:
      "Using a prohibited ARIA attribute can create a conflict with the browser's default behavior, leading to confusing or unpredictable experiences for assistive technology users.",
    whoItAffects: "Screen reader users and other assistive technology users.",
  },
  technicalSummary:
    "Ensures that ARIA attributes are not used on elements where they are explicitly forbidden by the ARIA in HTML specification. This often happens when an ARIA attribute tries to override a native HTML feature.",
  whyItMatters: [
    "Avoids conflicts between native HTML semantics and ARIA attributes",
    "Ensures predictable behavior for assistive technology",
    "Maintains compliance with web standards",
    "Prevents bugs and inconsistent announcements in screen readers",
  ],
  howToFix: {
    overview:
      "The fix is always to remove the prohibited ARIA attribute. The native HTML element already provides the necessary semantics.",
    methods: [
      {
        approach: "Remove the prohibited attribute",
        description:
          "For example, you cannot use `aria-label` on a native `<label>` element because the label's own text content serves as its name. Adding `aria-label` would create a conflict.",
        code: `<!-- Before: Prohibited 'aria-label' on a <label> -->
<label for="email" aria-label="Email Address">Your Email:</label>
<input id="email" type="email">

<!-- After: Remove the conflicting attribute -->
<label for="email">Your Email:</label>
<input id="email" type="email">`,
      },
      {
        approach: "Rely on native semantics",
        description:
          "Similarly, you cannot use `aria-required` on an `<input>` that already has the native `required` attribute. The native attribute is sufficient.",
        code: `<!-- Before: Redundant and prohibited 'aria-required' -->
<input type="text" required aria-required="true">

<!-- After: Use only the native attribute -->
<input type="text" required>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Using `aria-label` on a `<label>` element",
        code: `<label for="name" aria-label="Full Name">Name:</label>
<input id="name" type="text">`,
        issue:
          "The `aria-label` attribute is prohibited on `<label>` elements. The accessible name should come from the label's content.",
      },
      {
        description: "Using `aria-hidden` on a `hidden` input",
        code: `<input type="hidden" name="session_id" value="123" aria-hidden="true">`,
        issue:
          "The `aria-hidden` attribute is not allowed on an input with `type='hidden'`, as it is already hidden natively.",
      },
    ],
    passing: [
      {
        description: "A correctly implemented label",
        code: `<label for="user-email">Email Address:</label>
<input id="user-email" type="email">`,
        explanation:
          "The `<label>` element correctly provides the accessible name for the input without any conflicting ARIA attributes.",
      },
      {
        description: "A correctly implemented required input",
        code: `<input type="text" aria-label="First Name" required>`,
        explanation:
          "The native `required` attribute is used to mark the field as mandatory, which is the correct approach.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Using prohibited ARIA attributes can lead to an incorrect or confusing programmatic name, role, or value.",
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
  window.ariaProhibitedAttrRule = ariaProhibitedAttrRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-prohibited-attr"] = ariaProhibitedAttrRule;
}
