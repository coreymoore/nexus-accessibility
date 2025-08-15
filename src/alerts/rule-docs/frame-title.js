// Rule documentation for: frame-title
// Enhanced accessibility rule description

const frameTitleRule = {
  plainLanguage: {
    whatItMeans:
      "Every `<iframe>` on a page must have a `title` attribute that describes what the frame contains.",
    whyItMatters:
      "The `title` is announced by screen readers when a user navigates to a frame. It tells them what the frame is for (e.g., 'Advertisement', 'Video Player', 'Contact Form') so they can decide whether to interact with it.",
    whoItAffects:
      "Screen reader users, who rely on the frame title to understand the page layout and navigate efficiently. It also helps keyboard-only users understand where their focus has moved.",
  },
  technicalSummary:
    "Ensures every `<iframe>` and `<frame>` element has a non-empty `title` attribute. This title acts as the accessible name for the frame, which is essential for users of assistive technologies.",
  whyItMatters: [
    "Provides a label for the frame so users understand its purpose without having to load or navigate its content",
    "Enables users to distinguish between multiple frames on a page and navigate efficiently",
    "Gives context for embedded content, especially when it's from a third-party source",
    "Allows users to identify and skip non-essential frames, such as advertisements or social media widgets",
  ],
  howToFix: {
    overview:
      "Add a concise and descriptive `title` attribute to every `<iframe>` and `<frame>` element on the page.",
    methods: [
      {
        approach: "Add a descriptive `title` attribute",
        description:
          "The title should accurately describe the contents or purpose of the frame.",
        code: `<!-- Before: No title -->
<iframe src="map.html"></iframe>

<!-- After: Descriptive title -->
<iframe src="map.html" title="Interactive map showing our location"></iframe>`,
      },
      {
        approach: "Be specific, not generic",
        description:
          "Avoid generic titles like 'iframe' or 'embedded content'. Be specific about what the content is.",
        code: `<!-- Before: Generic title -->
<iframe src="video.html" title="Video"></iframe>

<!-- After: Specific title -->
<iframe src="video.html" title="Product demonstration video"></iframe>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "An `<iframe>` is missing a `title` attribute.",
        code: `<iframe src="external-content.html"></iframe>`,
        issue:
          "This frame has no `title` attribute, so a screen reader user will not know what it contains when they navigate to it.",
      },
      {
        description: "An `<iframe>` has an empty `title` attribute.",
        code: `<iframe src="widget.html" title=""></iframe>`,
        issue:
          "An empty title is not descriptive and is equivalent to having no title at all.",
      },
    ],
    passing: [
      {
        description:
          "An `<iframe>` embedding a payment form has a clear, descriptive title.",
        code: `<iframe src="payment-form.html" 
        title="Secure payment processing form">
</iframe>`,
        explanation:
          "The title clearly and accurately describes the purpose of the iframe's content.",
      },
      {
        description:
          "An `<iframe>` embedding an advertisement is clearly identified.",
        code: `<iframe src="ad.html" title="Advertisement: 25% off sale"></iframe>`,
        explanation:
          "The title allows users to quickly identify the frame as an ad and skip it if they choose.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "The `title` attribute provides the accessible name for the `<iframe>` element, which is a user interface component.",
      },
      {
        criterion: "2.4.1 Bypass Blocks (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
        relationship:
          "Descriptive frame titles help users identify and bypass blocks of content.",
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
  window.frameTitleRule = frameTitleRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["frame-title"] = frameTitleRule;
}
