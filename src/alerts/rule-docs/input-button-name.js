// Rule documentation for: input-button-name
// Enhanced accessibility rule description

const inputButtonNameRule = {
  plainLanguage: {
    whatItMeans:
      "Input elements that act as buttons must have clear names that describe what action they perform.",
    whyItMatters:
      "Users need to understand what will happen when they activate button inputs.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology.",
  },
  technicalSummary:
    "Ensures input elements with button types have accessible names through value, aria-label, aria-labelledby, or title attributes.",
  whyItMatters: [
    "Enables users to understand button purpose and function",
    "Supports voice control for form submission and actions",
    "Prevents confusion about what actions buttons will perform",
    "Ensures form controls are usable by assistive technology",
  ],
  howToFix: {
    overview:
      "Provide clear, descriptive names for input buttons using appropriate attributes.",
    methods: [
      {
        approach: "Use value attribute",
        description:
          "Set descriptive text in the value attribute for button inputs",
        code: `<input type="submit" value="Submit Order">
<input type="button" value="Calculate Total">
<input type="reset" value="Clear Form">`,
      },
      {
        approach: "Use aria-label",
        description: "Add aria-label when value isn't descriptive enough",
        code: `<input type="submit" value="Go" aria-label="Submit search query">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Button input without accessible name",
        code: `<input type="submit">`,
        issue: "No value, aria-label, or other accessible name provided",
      },
      {
        description: "Button with unclear value",
        code: `<input type="button" value="Click">`,
        issue: "Value 'Click' doesn't describe what the button does",
      },
    ],
    passing: [
      {
        description: "Submit button with clear value",
        code: `<input type="submit" value="Create Account">`,
        explanation: "Value clearly describes the button's action",
      },
      {
        description: "Button with descriptive aria-label",
        code: `<input type="button" value="+" aria-label="Add item to cart">`,
        explanation: "aria-label provides clear description of the action",
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
        id: "H91",
        title: "Using HTML form controls and links",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H91",
      },
    ],
  },
};
