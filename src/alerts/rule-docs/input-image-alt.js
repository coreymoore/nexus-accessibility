// Rule documentation for: input-image-alt
// Enhanced accessibility rule description

const inputImageAltRule = {
  plainLanguage: {
    whatItMeans:
      "Image inputs (like image submit buttons) must have alternative text that describes their function.",
    whyItMatters:
      "Users need to understand what action an image button will perform when activated.",
    whoItAffects:
      "Screen reader users and anyone who cannot see or load images.",
  },
  technicalSummary:
    "Ensures input elements with type='image' have accessible names through alt, aria-label, aria-labelledby, or title attributes.",
  whyItMatters: [
    "Provides essential information about image button functionality",
    "Enables users to make informed decisions about form submission",
    "Ensures image-based form controls are accessible to all users",
    "Supports voice control and keyboard navigation",
  ],
  howToFix: {
    overview:
      "Add descriptive alternative text to image input elements using the alt attribute.",
    methods: [
      {
        approach: "Use alt attribute",
        description:
          "Provide descriptive alt text that explains the button's function",
        code: `<input type="image" src="submit-button.png" alt="Submit form">
<input type="image" src="search-icon.png" alt="Search products">`,
      },
      {
        approach: "Use aria-label",
        description: "Add aria-label when more context is needed",
        code: `<input type="image" src="cart.png" alt="Add to cart" 
       aria-label="Add selected item to shopping cart">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Image input without alt text",
        code: `<input type="image" src="submit.png">`,
        issue: "No alt attribute or other accessible name provided",
      },
      {
        description: "Image input with filename as alt",
        code: `<input type="image" src="btn_submit.gif" alt="btn_submit.gif">`,
        issue: "Alt text is just the filename, not descriptive",
      },
    ],
    passing: [
      {
        description: "Image input with descriptive alt text",
        code: `<input type="image" src="search.png" alt="Search">`,
        explanation: "Alt text clearly describes the button's function",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.1.1 Non-text Content (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        relationship: "Image inputs must have text alternatives",
      },
    ],
    techniques: [
      {
        id: "H36",
        title: "Using alt attributes on images used as submit buttons",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H36",
      },
    ],
  },
};
