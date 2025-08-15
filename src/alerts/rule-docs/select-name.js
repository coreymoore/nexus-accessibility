// Rule documentation for: select-name
// Enhanced accessibility rule description

const selectNameRule = {
  plainLanguage: {
    whatItMeans:
      "Dropdown select menus must have clear labels that describe what the user is choosing.",
    whyItMatters:
      "Users need to understand what they're selecting from dropdown menus to make informed choices.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology to interact with forms.",
  },
  technicalSummary:
    "Ensures select elements have accessible names through associated label elements, aria-label, aria-labelledby, or title attributes.",
  whyItMatters: [
    "Enables users to understand the purpose of dropdown menus",
    "Supports voice control for form interaction",
    "Reduces errors in form completion",
    "Ensures select controls are usable by assistive technology",
  ],
  howToFix: {
    overview:
      "Associate select elements with descriptive labels using proper labeling techniques.",
    methods: [
      {
        approach: "Use label element",
        description: "Associate select with a label using for/id attributes",
        code: `<label for="country">Country:</label>
<select id="country" name="country">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</select>`,
      },
      {
        approach: "Use aria-label",
        description: "Add aria-label when visible labels aren't appropriate",
        code: `<select aria-label="Filter results by category">
  <option value="">All categories</option>
  <option value="books">Books</option>
</select>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Select without any label",
        code: `<select name="state">
  <option value="ca">California</option>
  <option value="ny">New York</option>
</select>`,
        issue: "No label or aria-label provided for the select element",
      },
    ],
    passing: [
      {
        description: "Select with proper label",
        code: `<label for="timezone">Time Zone:</label>
<select id="timezone" name="timezone">
  <option value="pst">Pacific</option>
  <option value="est">Eastern</option>
</select>`,
        explanation: "Select is properly labeled with associated label element",
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
    ],
  },
};
