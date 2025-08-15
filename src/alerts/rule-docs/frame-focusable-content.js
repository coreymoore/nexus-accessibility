// Rule documentation for: frame-focusable-content
// Enhanced accessibility rule description

const frameFocusableContentRule = {
  plainLanguage: {
    whatItMeans:
      "If an `<iframe>` contains interactive elements like links or buttons, the `<iframe>` itself must have a descriptive title.",
    whyItMatters:
      "When a keyboard user navigates into an `<iframe>`, a screen reader announces the frame's title. This tells the user they've entered a new section of the page (e.g., 'Advertisement' or 'Video Player'). Without a title, the user has no context for where their focus has gone.",
    whoItAffects:
      "Screen reader users and keyboard-only users who need to understand the context of different sections of a page to navigate effectively.",
  },
  technicalSummary:
    "Ensures that any `<iframe>` element that contains focusable content (such as links, buttons, or form fields) has a non-empty `title` attribute that describes its contents.",
  whyItMatters: [
    "Provides essential context when a user's focus moves from the main page into an embedded document",
    "Helps users understand the purpose of the embedded content before they start interacting with it",
    "Supports efficient navigation by allowing users to identify and bypass irrelevant frames (like ads)",
    "Enables screen readers to announce the boundary and purpose of the frame, creating a more understandable experience",
  ],
  howToFix: {
    overview:
      "Add a descriptive `title` attribute to any `<iframe>` that contains interactive or focusable elements. The title should accurately describe the content or purpose of the frame.",
    methods: [
      {
        approach: "Add a descriptive `title` attribute",
        description:
          "Provide a `title` that clearly explains what the `<iframe>` contains.",
        code: `<!-- Before: No title on a frame with interactive content -->
<iframe src="signup-form.html"></iframe>

<!-- After: A descriptive title is added -->
<iframe src="signup-form.html" title="Newsletter signup form"></iframe>`,
      },
      {
        approach: "Describe the embedded content's purpose",
        description:
          "The title should be specific. Instead of 'Map', use 'Interactive map of our store locations'.",
        code: `<!-- A good title for an embedded video player -->
<iframe src="https://www.youtube.com/embed/..."
        title="Product demonstration video">
</iframe>

<!-- A good title for an embedded advertisement -->
<iframe src="https://example.com/ad"
        title="Advertisement: 50% off sale">
</iframe>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "An `<iframe>` containing a form has no `title`.",
        code: `<iframe src="contact-us.html"></iframe>`,
        issue:
          "This frame contains focusable form fields, but without a title, a screen reader user won't know what this section is when they tab into it.",
      },
      {
        description: "An `<iframe>` has an empty `title` attribute.",
        code: `<iframe src="video-player.html" title=""></iframe>`,
        issue:
          "An empty title is treated the same as a missing title and provides no information.",
      },
    ],
    passing: [
      {
        description:
          "An `<iframe>` with interactive content has a descriptive title.",
        code: `<iframe src="https://www.google.com/maps/embed?..."
        title="Map showing the location of our office">
</iframe>`,
        explanation:
          "The title clearly and accurately describes the purpose of the embedded content.",
      },
      {
        description:
          "A decorative `<iframe>` with no focusable content does not require a title.",
        code: `<iframe src="decorative-background.html" tabindex="-1"></iframe>`,
        explanation:
          'If an `<iframe>` is purely for visual effect and contains no focusable elements, it does not need a title. Making it non-focusable with `tabindex="-1"` is also a good practice in this case.',
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "An `<iframe>` is a user interface component, and its `title` attribute provides its accessible name.",
      },
      {
        criterion: "2.4.1 Bypass Blocks (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
        relationship:
          "Frame titles help users identify and bypass blocks of content, such as embedded advertisements.",
      },
    ],
    techniques: [
      {
        id: "H64",
        title: "Using the title attribute of the frame and iframe elements",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H64",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.frameFocusableContentRule = frameFocusableContentRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["frame-focusable-content"] =
    frameFocusableContentRule;
}
