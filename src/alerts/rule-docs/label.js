// Rule documentation for: label
// Enhanced accessibility rule description

const labelRule = {
  plainLanguage: {
    whatItMeans:
      "Every form input must have a clear label that describes what information should be entered.",
    whyItMatters:
      "Users need to understand what to type in each field to successfully complete forms.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology to fill out forms.",
  },
  technicalSummary:
    "Ensures form elements have accessible names through properly associated label elements, aria-label, or aria-labelledby attributes.",
  whyItMatters: [
    "Enables users to understand the purpose of each form field",
    "Supports voice control users who need to speak field names",
    "Reduces form completion errors and user frustration",
    "Ensures forms are usable by assistive technology",
  ],
  howToFix: {
    overview:
      "Associate form inputs with descriptive labels using proper labeling techniques.",
    methods: [
      {
        approach: "Use label element with for attribute",
        description: "Connect labels to form controls using the for attribute",
        code: `<label for="email">Email Address:</label>
<input type="email" id="email" name="email" required>`,
      },
      {
        approach: "Wrap input in label element",
        description: "Place form controls inside label elements",
        code: `<label>
  <input type="checkbox" name="newsletter">
  Subscribe to our newsletter
</label>`,
      },
      {
        approach: "Use aria-label for compact forms",
        description:
          "Provide accessible names using aria-label when visible labels aren't ideal",
        code: `<input type="search" aria-label="Search products" placeholder="Search...">`,
      },
      {
        approach: "Use aria-labelledby for complex labeling",
        description: "Reference multiple elements that describe the input",
        code: `<fieldset>
  <legend id="contact-legend">Contact Information</legend>
  <input type="tel" aria-labelledby="contact-legend phone-label">
  <span id="phone-label">Phone Number</span>
</fieldset>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Input field without any label",
        code: `<input type="text" name="username" placeholder="Username">`,
        issue:
          "No label element or aria-label provided - placeholder is not sufficient",
      },
      {
        description: "Label not properly associated",
        code: `<label>Email</label>
<input type="email" name="email">`,
        issue:
          "Label is not connected to input with for attribute or by wrapping",
      },
    ],
    passing: [
      {
        description: "Properly labeled input with for attribute",
        code: `<label for="username">Username:</label>
<input type="text" id="username" name="username">`,
        explanation:
          "Label is explicitly associated with input using for and id attributes",
      },
      {
        description: "Input wrapped in label",
        code: `<label>
  <input type="password" name="password">
  Password
</label>`,
        explanation:
          "Input is implicitly labeled by being wrapped in the label element",
      },
      {
        description: "Search input with aria-label",
        code: `<input type="search" aria-label="Search our product catalog">`,
        explanation: "aria-label provides accessible name for the search input",
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
      {
        criterion: "3.3.2 Labels or Instructions (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html",
        relationship:
          "Form inputs require labels or instructions for proper completion",
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
        id: "ARIA6",
        title: "Using aria-label to provide labels for objects",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA6",
      },
    ],
  },
};
