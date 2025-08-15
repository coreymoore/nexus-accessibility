// Rule documentation for: form-field-multiple-labels
// Enhanced accessibility rule description

const formFieldMultipleLabelsRule = {
  plainLanguage: {
    whatItMeans:
      "A form field, like an input box, should only have one `<label>` associated with it. Having multiple labels can confuse assistive technologies.",
    whyItMatters:
      "When a form field has multiple labels, a screen reader may read out all of them, leading to a confusing and verbose experience. It can be unclear which label is the primary one.",
    whoItAffects:
      "Screen reader users and other assistive technology users who rely on programmatic label associations to understand and fill out forms.",
  },
  technicalSummary:
    "Ensures that each form control (like `<input>`, `<textarea>`, or `<select>`) has at most one associated `<label>` element. This rule checks for multiple `<label>` elements pointing to the same `id` via their `for` attribute.",
  whyItMatters: [
    "Prevents confusing, repetitive, or conflicting announcements by screen readers",
    "Maintains a clear and unambiguous one-to-one relationship between a label and its control",
    "Ensures a predictable and efficient form navigation experience for assistive technology users",
    "Avoids ambiguity in identifying the purpose of each form field, reducing cognitive load",
  ],
  howToFix: {
    overview:
      "Consolidate multiple labels into a single, comprehensive `<label>`. For supplemental information, like formatting requirements, use `aria-describedby` to link to a separate description.",
    methods: [
      {
        approach: "Combine multiple labels into one",
        description:
          "If you have separate labels for the field's name and its required status, merge them into a single `<label>` element.",
        code: `<!-- Before: Multiple labels for one input -->
<label for="phone">Phone Number</label>
<input type="tel" id="phone">
<label for="phone">(Required)</label>

<!-- After: A single, comprehensive label -->
<label for="phone">Phone Number (Required)</label>
<input type="tel" id="phone">`,
      },
      {
        approach: "Use `aria-describedby` for extra information",
        description:
          "Keep the primary label concise. For instructions or format requirements, place that text in a separate element and link to it with `aria-describedby`.",
        code: `<!-- Before: A second label for instructions -->
<label for="password">Create Password</label>
<input type="password" id="password">
<label for="password">Must be 8-20 characters long.</label>

<!-- After: Use aria-describedby for the description -->
<label for="password">Create Password</label>
<input type="password" id="password" aria-describedby="password-help">
<p id="password-help">Must be 8-20 characters long.</p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "An input field has two `<label>` elements pointing to it.",
        code: `<label for="email">Email Address</label>
<input type="email" id="email">
<label for="email">Enter your corporate email.</label>`,
        issue:
          "This input has two labels. A screen reader might announce 'Email Address Enter your corporate email', which is confusing.",
      },
    ],
    passing: [
      {
        description: "A single, clear label is associated with the input.",
        code: `<label for="email">Email Address</label>
<input type="email" id="email">`,
        explanation:
          "There is a single, unambiguous label for the input field.",
      },
      {
        description: "A primary label is supplemented by a description.",
        code: `<label for="username">Username</label>
<input id="username" aria-describedby="user-hint">
<p id="user-hint">May only contain letters and numbers.</p>`,
        explanation:
          "The primary label is 'Username'. The additional instruction is provided as a description, which is the correct semantic approach.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "3.3.2 Labels or Instructions (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html",
        relationship:
          "Providing clear and unambiguous labels for user input is essential. Multiple labels can create ambiguity.",
      },
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "The accessible name of a form control should be clear. Multiple labels can lead to a confusing or incorrect accessible name.",
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
  window.formFieldMultipleLabelsRule = formFieldMultipleLabelsRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["form-field-multiple-labels"] =
    formFieldMultipleLabelsRule;
}
