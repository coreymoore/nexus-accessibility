// Rule documentation for: aria-progressbar-name
// Enhanced accessibility rule description

const ariaProgressbarNameRule = {
  plainLanguage: {
    whatItMeans:
      "A progress bar must have an accessible name that explains what task is in progress.",
    whyItMatters:
      "Without a label, a screen reader might announce 'progress bar, 60 percent' but not whether it's a file upload, a form submission, or something else.",
    whoItAffects:
      "Primarily screen reader users who need context for status indicators.",
  },
  technicalSummary:
    "Ensures elements with `role='progressbar'` have an accessible name provided by `aria-label` or `aria-labelledby`.",
  whyItMatters: [
    "Provides essential context for loading and progress indicators",
    "Enables users to understand which task is currently running",
    "Ensures progress indicators are meaningful beyond their visual appearance",
    "Follows ARIA best practices for custom controls",
  ],
  howToFix: {
    overview:
      "Provide a descriptive, accessible name for each progress bar element using either `aria-label` or `aria-labelledby`.",
    methods: [
      {
        approach: "Use aria-label",
        description:
          "Add an `aria-label` attribute to the progress bar to describe the running task.",
        code: `<div role="progressbar" aria-label="File upload progress" 
     aria-valuenow="45" aria-valuemin="0" aria-valuemax="100">
</div>`,
      },
      {
        approach: "Use aria-labelledby",
        description:
          "Reference visible text that describes the progress bar's purpose.",
        code: `<p id="upload-status">Uploading your report...</p>
<div role="progressbar" aria-labelledby="upload-status" 
     aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Progress bar without an accessible name",
        code: `<div role="progressbar" aria-valuenow="50"></div>`,
        issue:
          "This progress bar indicates that something is 50% complete, but a screen reader user has no way of knowing what process is running.",
      },
    ],
    passing: [
      {
        description: "Progress bar with a descriptive aria-label",
        code: `<div role="progressbar" aria-label="Loading search results" 
     aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
</div>`,
        explanation:
          "The `aria-label` clearly describes the process that is underway.",
      },
      {
        description: "Progress bar labeled by visible text",
        code: `<span id="progress-label">Exporting data</span>
<div role="progressbar" aria-labelledby="progress-label" aria-valuenow="75"></div>`,
        explanation:
          "The progress bar is correctly associated with the visible text that describes it.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Elements with a `progressbar` role must have an accessible name.",
      },
      {
        criterion: "1.1.1 Non-text Content (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        relationship:
          "Progress bars are a form of non-text content and require a text alternative.",
      },
    ],
    techniques: [
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
  window.ariaProgressbarNameRule = ariaProgressbarNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-progressbar-name"] = ariaProgressbarNameRule;
}
