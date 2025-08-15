// Rule documentation for: aria-toggle-field-name
// Enhanced accessibility rule description

const ariaToggleFieldNameRule = {
  plainLanguage: {
    whatItMeans:
      "Toggle controls like checkboxes, radio buttons, and switches must have a clear, accessible label that describes the option they control.",
    whyItMatters:
      "Without a label, users of assistive technology won't know what they are turning on or off when they interact with a toggle control. This makes it impossible to operate the interface confidently.",
    whoItAffects:
      "Screen reader users, users of voice control software, and anyone who needs clear labeling to understand form controls.",
  },
  technicalSummary:
    "Ensures that any element with a `role` of `checkbox`, `radio`, or `switch` has an accessible name. The name can be provided by a native `<label>`, `aria-label`, or `aria-labelledby`.",
  whyItMatters: [
    "Enables users to understand the purpose and context of all toggle controls",
    "Supports informed decision-making when changing settings or making selections",
    "Ensures that essential form controls are usable and compliant for all users",
    "Provides the necessary context for assistive technology to announce what state is being changed (e.g., 'On, Notifications')",
  ],
  howToFix: {
    overview:
      "Add a clear, descriptive label to every toggle control using the most appropriate labeling method for your code.",
    methods: [
      {
        approach: "Use a native `<label>` element",
        description:
          "For standard HTML form controls, the best method is to associate a `<label>` element using the `for` attribute, which points to the `id` of the input.",
        code: `<!-- Associate the label with the checkbox -->
<input type="checkbox" id="newsletter">
<label for="newsletter">Subscribe to newsletter</label>`,
      },
      {
        approach: "Use `aria-label` for custom controls",
        description:
          "For custom elements that don't have a visible label, use the `aria-label` attribute to provide an accessible name directly on the element.",
        code: `<!-- The aria-label provides the name for this custom switch -->
<div role="switch" aria-checked="true" tabindex="0"
     aria-label="Enable dark mode">
</div>`,
      },
      {
        approach: "Use `aria-labelledby` to reference existing text",
        description:
          "If text that can serve as a label already exists elsewhere on the page, use `aria-labelledby` to create a relationship between the control and the text.",
        code: `<!-- This text will serve as the label -->
<span id="notifications-label">Email notifications</span>

<!-- The input is linked to the text via aria-labelledby -->
<input type="checkbox" aria-labelledby="notifications-label">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A checkbox is missing a label.",
        code: `<input type="checkbox" name="terms">`,
        issue:
          "There is no accessible name to describe what this checkbox controls.",
      },
      {
        description: "A custom switch control has no accessible name.",
        code: `<div role="switch" aria-checked="false" tabindex="0"></div>`,
        issue:
          "This switch has no `aria-label` or `aria-labelledby` to describe its purpose.",
      },
      {
        description: "Radio buttons in a group are missing names.",
        code: `<div role="radiogroup" aria-label="Font Size">
  <div role="radio" aria-checked="true" tabindex="0"></div>
  <div role="radio"aria-checked="false" tabindex="-1"></div>
</div>`,
        issue:
          "While the group is labeled, the individual radio buttons are not, so a screen reader would just announce 'radio' without context like 'Small' or 'Large'.",
      },
    ],
    passing: [
      {
        description: "A checkbox is correctly paired with a `<label>`.",
        code: `<input type="checkbox" id="terms">
<label for="terms">I agree to the terms and conditions</label>`,
        explanation: "The `<label>` clearly describes the checkbox's function.",
      },
      {
        description: "A custom switch uses `aria-label`.",
        code: `<div role="switch" aria-checked="true" tabindex="0"
     aria-label="Enable notifications">
</div>`,
        explanation:
          "The `aria-label` provides a concise, accessible name for the switch.",
      },
      {
        description: "A radio button is labeled with `aria-labelledby`.",
        code: `<div role="radiogroup" aria-label="Text Alignment">
  <span id="align-left">Left</span>
  <div role="radio" aria-checked="true" tabindex="0" aria-labelledby="align-left"></div>
</div>`,
        explanation:
          "The `aria-labelledby` attribute efficiently re-uses the visible text 'Left' as the accessible name for the radio button.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "All user interface components, including toggle controls, must have a programmatically determinable name.",
      },
      {
        criterion: "3.3.2 Labels or Instructions (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html",
        relationship:
          "Providing labels for toggle controls fulfills the requirement to provide labels for user input.",
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
  window.ariaToggleFieldNameRule = ariaToggleFieldNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-toggle-field-name"] = ariaToggleFieldNameRule;
}
