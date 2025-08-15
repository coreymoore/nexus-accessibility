// Rule documentation for: button-name
// Enhanced accessibility rule description

const buttonNameRule = {
  plainLanguage: {
    whatItMeans:
      "Every button must have a clear, accessible name that describes its function. A button with just an 'X' icon, for example, must have an accessible name like 'Close' or 'Remove item'.",
    whyItMatters:
      "Without a proper name, a screen reader user will only hear 'button', with no idea what it does. This makes it impossible to understand or operate the interface.",
    whoItAffects:
      "Screen reader users, users of voice control software (who need to speak the button's name), and users with cognitive disabilities who benefit from clear labels.",
  },
  technicalSummary:
    'Ensures every `<button>` element and any element with `role="button"` has an accessible name. The name can be derived from the button\'s text content, an `aria-label`, or an `aria-labelledby` attribute.',
  whyItMatters: [
    "Enables users of assistive technology to understand a button's function before activating it",
    "Supports keyboard-only and voice control navigation by providing a clear target",
    "Provides essential context for the action that will be performed, reducing user error",
    "Ensures that interactive controls are discoverable, meaningful, and operable for all users",
  ],
  howToFix: {
    overview:
      "Provide a clear, descriptive name for every button. The best method is to put descriptive text directly inside the button. For icon-only buttons, use `aria-label`.",
    methods: [
      {
        approach: "Use descriptive text content",
        description:
          "The most robust method is to write a clear action-oriented label inside the button element.",
        code: `<!-- Before: Vague or missing text -->
<button>Click</button>
<button></button>

<!-- After: Descriptive text -->
<button>Save changes</button>
<button>Download full report</button>`,
      },
      {
        approach: "Use `aria-label` for icon-only buttons",
        description:
          "For buttons that only contain an icon, add an `aria-label` to describe the action. The icon itself should be hidden from assistive technology.",
        code: `<!-- Before: Icon button with no accessible name -->
<button><svg/></button>

<!-- After: Icon button with an aria-label -->
<button aria-label="Delete item">
  <svg aria-hidden="true" focusable="false" />
</button>`,
      },
      {
        approach: "Use `aria-labelledby` to combine text",
        description:
          "Reference other visible text to create a more complete button label. This is useful for buttons in tables or lists.",
        code: `<span id="file-name">Q3_Report.docx</span>
<button aria-labelledby="action-text file-name">
  <span id="action-text">Download</span>
</button>
<!-- Accessible name will be "Download Q3_Report.docx" -->`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A button with no text content or accessible name.",
        code: `<button></button>`,
        issue:
          "This button is empty and provides no information about its purpose.",
      },
      {
        description: "An icon-only button is missing an `aria-label`.",
        code: `<button>
  <img src="settings-icon.svg" alt="">
</button>`,
        issue:
          "The image has a null alt attribute, so the button has no accessible name. A screen reader would just announce 'button'.",
      },
    ],
    passing: [
      {
        description: "A button with clear, descriptive text.",
        code: `<button>Submit your application</button>`,
        explanation:
          "The button's text clearly describes the action it performs.",
      },
      {
        description: "An icon-only button with a descriptive `aria-label`.",
        code: `<button aria-label="Close dialog">
  <span aria-hidden="true">X</span>
</button>`,
        explanation:
          "The `aria-label` provides the accessible name 'Close dialog', while the 'X' is hidden to avoid redundant announcements.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "All user interface components, including buttons, must have a programmatically determinable name.",
      },
      {
        criterion: "2.5.3 Label in Name (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html",
        relationship:
          "The button's visible text label must be part of its accessible name to avoid confusion for voice control users.",
      },
      {
        criterion: "2.4.4 Link Purpose (In Context) (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
        relationship:
          "While written for links, the principle of having a clear purpose applies equally to buttons.",
      },
    ],
    techniques: [
      {
        id: "H91",
        title: "Using HTML form controls and links",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H91",
      },
      {
        id: "ARIA7",
        title:
          "Using aria-labelledby to provide a name for a user interface control",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA7",
      },
      {
        id: "ARIA14",
        title:
          "Using aria-label to provide an invisible label where a visible label cannot be used",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA14",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.buttonNameRule = buttonNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["button-name"] = buttonNameRule;
}
