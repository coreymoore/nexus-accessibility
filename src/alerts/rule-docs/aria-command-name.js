// Rule documentation for: aria-command-name
// Enhanced accessibility rule description

const ariaCommandNameRule = {
  plainLanguage: {
    whatItMeans:
      "Interactive elements that perform actions (like buttons and links) must have clear names that describe what they do.",
    whyItMatters:
      "Users need to understand what will happen when they activate an interactive element.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology.",
  },
  technicalSummary:
    "Ensures elements with command roles (button, link, menuitem, etc.) have accessible names through text content, aria-label, or aria-labelledby.",
  whyItMatters: [
    "Enables users to understand the purpose of interactive elements",
    "Supports voice control users who need to speak element names",
    "Prevents confusion about what actions elements will perform",
    "Ensures all users can navigate and interact with interfaces effectively",
  ],
  howToFix: {
    overview:
      "Provide clear, descriptive names for all interactive elements that perform actions.",
    methods: [
      {
        approach: "Use descriptive text content",
        description: "Include clear text within the element",
        code: `<button>Save Changes</button>
<a href="/contact">Contact Us</a>`,
      },
      {
        approach: "Use aria-label for icon buttons",
        description: "Provide accessible names for buttons with only icons",
        code: `<button aria-label="Close dialog">
  <svg><!-- close icon --></svg>
</button>`,
      },
      {
        approach: "Use aria-labelledby to create a full description",
        description:
          "Reference other elements to create a complete accessible name for the command.",
        code: `<h2 id="section-title">Profile</h2>
...
<button id="edit-button" aria-labelledby="edit-button section-title">
  Edit
</button>
// The accessible name will be "Edit Profile"`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Button with no accessible name",
        code: `<button><svg><!-- icon --></svg></button>`,
        issue: "Button has no text content or aria-label",
      },
      {
        description: "Link with generic text",
        code: `<a href="/article1">Click here</a>`,
        issue: "Link text doesn't describe the destination or purpose",
      },
    ],
    passing: [
      {
        description: "Button with clear purpose",
        code: `<button>Delete Item</button>`,
        explanation: "Button text clearly describes the action",
      },
      {
        description: "Icon button with aria-label",
        code: `<button aria-label="Add to favorites">
  <svg><!-- heart icon --></svg>
</button>`,
        explanation: "aria-label clearly describes the button's function",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Interactive elements must have accessible names",
      },
      {
        criterion: "2.4.4 Link Purpose (In Context) (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
        relationship: "Link purpose must be clear from the link text",
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
      {
        id: "H30",
        title: "Providing link text that describes the purpose of a link",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H30",
      },
    ],
  },
};

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-command-name"] = ariaCommandNameRule;
}
