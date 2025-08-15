// Rule documentation for: aria-meter-name
// Enhanced accessibility rule description

const ariaMeterNameRule = {
  plainLanguage: {
    whatItMeans:
      "Elements that function as a meter (showing a value within a known range) must have an accessible name that explains what they represent.",
    whyItMatters:
      "Without a label, a screen reader might announce '75 percent' but not what that percentage refers to—such as 'Storage usage' or 'Profile completion'.",
    whoItAffects:
      "Primarily screen reader users who need context for data visualizations.",
  },
  technicalSummary:
    "Ensures elements with `role='meter'` have an accessible name provided by `aria-label`, `aria-labelledby`, or a `<label>` element.",
  whyItMatters: [
    "Provides essential context for data visualization components",
    "Enables screen reader users to understand the purpose of the meter",
    "Ensures that the meaning of the meter's value is clear",
    "Follows ARIA best practices for custom controls",
  ],
  howToFix: {
    overview:
      "Provide a descriptive, accessible name for each meter element. This can be done using `aria-label`, `aria-labelledby`, or a standard `<label>`.",
    methods: [
      {
        approach: "Use aria-label",
        description:
          "Add an `aria-label` attribute to the meter element to describe what it measures.",
        code: `<div role="meter" aria-label="Storage usage" 
     aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  75%
</div>`,
      },
      {
        approach: "Use aria-labelledby",
        description:
          "Reference a visible heading or label that describes the meter.",
        code: `<h3 id="cpu-label">CPU Usage</h3>
<div role="meter" aria-labelledby="cpu-label" 
     aria-valuenow="45" aria-valuemin="0" aria-valuemax="100">
  45%
</div>`,
      },
      {
        approach: "Use a <label> element",
        description:
          "Use a native `<label>` element to provide the name, which is a robust and recommended pattern.",
        code: `<label for="disk-space">Disk Space Used</label>
<div id="disk-space" role="meter" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">
  60%
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Meter without an accessible name",
        code: `<div role="meter" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">75%</div>`,
        issue:
          "This meter announces its value ('75%') but gives no context. A user won't know what is at 75%.",
      },
    ],
    passing: [
      {
        description: "Meter with a descriptive aria-label",
        code: `<div role="meter" aria-label="Profile completion" 
     aria-valuenow="80" aria-valuemin="0" aria-valuemax="100">
  80%
</div>`,
        explanation:
          "The `aria-label` clearly describes what the meter represents.",
      },
      {
        description: "Meter labeled by a visible heading",
        code: `<h2 id="storage-label">Storage Used</h2>
<div role="meter" aria-labelledby="storage-label" aria-valuenow="50" ...>50%</div>`,
        explanation:
          "The meter is correctly associated with its visible heading.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Elements with a `meter` role must have an accessible name to be understandable.",
      },
      {
        criterion: "1.1.1 Non-text Content (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        relationship:
          "Meters are a form of non-text content and require a text alternative.",
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
  window.ariaMeterNameRule = ariaMeterNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-meter-name"] = ariaMeterNameRule;
}
