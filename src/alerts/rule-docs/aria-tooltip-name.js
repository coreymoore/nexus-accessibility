// Rule documentation for: aria-tooltip-name
// Enhanced accessibility rule description

const ariaTooltipNameRule = {
  plainLanguage: {
    whatItMeans:
      "Any element acting as a tooltip must contain text that describes the element it is attached to.",
    whyItMatters:
      "If a tooltip is empty, it provides no information. Users of assistive technology will be notified that a tooltip is present but will not receive any of the helpful information it is supposed to contain.",
    whoItAffects:
      "Screen reader users, users with cognitive disabilities, and anyone who relies on tooltips for additional context or instructions.",
  },
  technicalSummary:
    'Ensures that any element with `role="tooltip"` is not empty and contains content that can serve as its accessible name. A tooltip\'s name is derived from its content.',
  whyItMatters: [
    "Ensures that supplementary information provided via tooltips is actually available to all users",
    "Prevents a confusing experience where a user is directed to an empty tooltip",
    "Maintains compliance with the ARIA specification for the `tooltip` role",
    "Supports discoverability and understanding of interface elements and their functions",
  ],
  howToFix: {
    overview:
      "The most common way to fix this is to ensure the tooltip element contains the text you want to display. The tooltip is then associated with its trigger element (like a button or link) using `aria-describedby`.",
    methods: [
      {
        approach: "Place descriptive text inside the tooltip element",
        description:
          "The text that makes up the tooltip's message must be placed within the element that has `role=\"tooltip\"`. The trigger element should then use `aria-describedby` to point to the tooltip's `id`.",
        code: `<!-- Before: The tooltip is empty -->
<button aria-describedby="tip-1">Help</button>
<div role="tooltip" id="tip-1"></div>

<!-- After: The tooltip contains descriptive text -->
<button aria-describedby="tip-1">Help</button>
<div role="tooltip" id="tip-1">
  Click here for detailed instructions.
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "An empty tooltip element",
        code: `<button aria-describedby="help-tooltip">Help</button>
<div role="tooltip" id="help-tooltip"></div>`,
        issue:
          "The `div` with the tooltip role has no content, so it cannot provide an accessible name or any information to the user.",
      },
      {
        description: "A tooltip with no text content",
        code: `<button aria-describedby="info-tooltip">Info</button>
<div role="tooltip" id="info-tooltip">
  <span></span>
</div>`,
        issue:
          "Even though this tooltip has a `span` inside it, the `span` is empty. The tooltip has no text content to serve as its name.",
      },
    ],
    passing: [
      {
        description:
          "A tooltip with text content, correctly linked to a trigger",
        code: `<button aria-label="Settings" aria-describedby="settings-tip">
  <svg focusable="false" aria-hidden="true" />
</button>

<div role="tooltip" id="settings-tip" class="tooltip-hidden">
  Adjust application settings
</div>`,
        explanation:
          "The button uses `aria-describedby` to reference the tooltip. The tooltip itself contains clear, descriptive text that serves as its accessible name.",
      },
      {
        description: "A tooltip containing structured content",
        code: `<label for="username">Username</label>
<input type="text" id="username" aria-describedby="username-tip">
<div role="tooltip" id="username-tip">
  <strong>Note:</strong> Usernames are case-sensitive.
</div>`,
        explanation:
          "The tooltip's content, including the `<strong>` element, serves as its accessible name.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "An element's name (in this case, the tooltip's content) must be programmatically determinable.",
      },
      {
        criterion: "2.5.3 Label in Name (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html",
        relationship:
          "The visible text content of the tooltip must be part of its accessible name.",
      },
    ],
    techniques: [
      {
        id: "G108",
        title: "Using markup features to expose name, role, and state",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G108",
      },
      {
        id: "ARIA9",
        title:
          "Using aria-labelledby to concatenate a label from several text nodes",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA9",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.ariaTooltipNameRule = ariaTooltipNameRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["aria-tooltip-name"] = ariaTooltipNameRule;
}
