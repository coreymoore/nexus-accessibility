// Rule documentation for: aria-roledescription
// Enhanced accessibility rule description

const ariaRoledescriptionRule = {
  plainLanguage: {
    whatItMeans:
      "The `aria-roledescription` attribute should not contain the name of a standard ARIA role. Its purpose is to provide a more specific description for a custom widget, not to reinvent existing roles.",
    whyItMatters:
      "Using `aria-roledescription` to announce a standard role (like 'button' or 'slider') is redundant and can interfere with how screen readers are designed to announce those roles. It can lead to confusing or double announcements.",
    whoItAffects:
      "Screen reader users who rely on consistent and predictable announcements for standard interface elements.",
  },
  technicalSummary:
    "Ensures that the value of an `aria-roledescription` attribute is not a non-abstract ARIA role. This prevents developers from using it to redefine standard elements in a way that can conflict with assistive technology heuristics.",
  whyItMatters: [
    "Prevents conflicts with built-in screen reader announcements",
    "Ensures a consistent and predictable user experience",
    "Promotes the correct use of ARIA for its intended purpose",
    "Avoids redundant or confusing announcements (e.g., 'button, special button')",
  ],
  howToFix: {
    overview:
      "The `aria-roledescription` attribute should only be used to give a more descriptive name to a custom widget, not to state its base role. If the description is just repeating the role, remove the attribute.",
    methods: [
      {
        approach: "Remove redundant role descriptions",
        description:
          "If the `aria-roledescription` is simply 'button', 'link', or another standard role, it is not being used correctly and should be removed.",
        code: `<!-- Before: Redundant role description -->
<button aria-roledescription="button">Submit</button>

<!-- After: Remove the attribute -->
<button>Submit</button>`,
      },
      {
        approach: "Provide a genuinely descriptive value",
        description:
          "Use `aria-roledescription` to describe the *type* of widget, not its base role. For example, a 'slider' could be described as a 'rating selector'.",
        code: `<!-- Before: Confusing and non-specific -->
<div role="slider" aria-roledescription="slider" ...></div>

<!-- After: Provides a useful, specific description -->
<div role="slider" aria-roledescription="rating" ...></div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "Using `aria-roledescription` to restate the element's role",
        code: `<button aria-roledescription="button">Save</button>`,
        issue:
          "The `aria-roledescription` 'button' is redundant. The element already has a role of button.",
      },
      {
        description:
          "Using a different but still standard role in the description",
        code: `<a href="/" aria-roledescription="button">Home</a>`,
        issue:
          "Using `aria-roledescription` to change a link into a button is not its intended purpose and can be confusing. Use `role='button'` instead if that is the desired semantic.",
      },
    ],
    passing: [
      {
        description: "Using `aria-roledescription` to clarify a custom widget",
        code: `<div role="slider" aria-roledescription="volume control"
     aria-label="Master Volume" aria-valuenow="75"></div>`,
        explanation:
          "The description 'volume control' provides useful context that is more specific than the base role of 'slider'.",
      },
      {
        description: "A standard element without a role description",
        code: `<button>Delete Item</button>`,
        explanation:
          "No `aria-roledescription` is needed because the native role of 'button' is sufficient and announced correctly by screen readers.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Using `aria-roledescription` incorrectly can confuse the programmatic role of an element, leading to a failure of this criterion.",
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
  window.ariaRoledescriptionRule = ariaRoledescriptionRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-roledescription"] = ariaRoledescriptionRule;
}
