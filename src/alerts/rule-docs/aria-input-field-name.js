// Rule documentation for: aria-input-field-name
// Enhanced accessibility rule description

const ariaInputFieldNameRule = {
  plainLanguage: {
    whatItMeans:
      "Input fields that collect information must have clear labels that describe what information is expected.",
    whyItMatters:
      "Users need to understand what to enter in each form field to complete forms successfully.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology to fill out forms.",
  },
  technicalSummary:
    "Ensures input elements have accessible names through labels, aria-label, aria-labelledby, or title attributes.",
  whyItMatters: [
    "Enables users to understand form field purpose and requirements",
    "Supports voice control and form auto-completion features",
    "Reduces form completion errors and user frustration",
    "Ensures forms are usable by assistive technology",
  ],
  howToFix: {
    overview:
      "Provide accessible names for input fields using one of several methods, with the `<label>` element being the most robust.",
    methods: [
      {
        approach: "Use the <label> element",
        description:
          "The best method is to use a <label> element explicitly associated with the input using the 'for' and 'id' attributes.",
        code: `<label for="user-email">Email address:</label>
<input type="email" id="user-email">`,
      },
      {
        approach: "Use aria-label",
        description:
          "When a visible label is not present (e.g., for a search button with only an icon), use 'aria-label' to provide the accessible name.",
        code: `<input type="search" aria-label="Search site content">`,
      },
      {
        approach: "Use aria-labelledby",
        description:
          "If the text that describes the input already exists on the page, use 'aria-labelledby' to associate it with the input.",
        code: `<p id="email-label">Enter your email address below:</p>
<input type="email" aria-labelledby="email-label">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Input field without an accessible name",
        code: `<input type="text" placeholder="First name">`,
        issue:
          "The placeholder attribute is not a substitute for an accessible name. Screen readers do not consistently announce it, and it disappears on input.",
      },
    ],
    passing: [
      {
        description: "Input with a correctly associated <label>",
        code: `<label for="fname">First name:</label>
<input type="text" id="fname">`,
        explanation:
          "The <label> provides a persistent, accessible name for the input.",
      },
      {
        description: "Input with an aria-label",
        code: `<input type="search" aria-label="Search" placeholder="Search...">`,
        explanation:
          "The aria-label provides an accessible name when a visible label is absent.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Form controls must have accessible names",
      },
    ],
    techniques: [
      {
        id: "H44",
        title:
          "Using label elements to associate text labels with form controls",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H44",
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
  window.ariaInputFieldNameRule = ariaInputFieldNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-input-field-name"] = ariaInputFieldNameRule;
}
