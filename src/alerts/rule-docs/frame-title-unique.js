// Rule documentation for: frame-title-unique
// Enhanced accessibility rule description

const frameTitleUniqueRule = {
  plainLanguage: {
    whatItMeans:
      "If a page has multiple `<iframe>`s, each one must have a unique title. You can't have two frames both titled 'Advertisement'.",
    whyItMatters:
      "Screen readers list all frames on a page by their titles. If the titles are identical, the user has no way to tell them apart and navigate to the correct one.",
    whoItAffects:
      "Screen reader users who navigate by frame titles to understand the layout of a page and move between different embedded sections.",
  },
  technicalSummary:
    "Ensures that the `title` attribute of each `<iframe>` and `<frame>` element is unique within the document. Duplicate frame titles make it difficult for users of assistive technologies to distinguish between them.",
  whyItMatters: [
    "Allows users to reliably distinguish between multiple `<iframe>` elements on the same page",
    "Supports efficient navigation and orientation within complex page layouts that use multiple frames",
    "Prevents confusion when frames contain similar types of content (e.g., multiple ads or videos)",
    "Enables screen readers to provide a distinct and meaningful list of frames for the user to choose from",
  ],
  howToFix: {
    overview:
      "Review all `<iframe>` elements on the page and ensure that each `title` attribute is unique. The title should be descriptive and clearly identify the specific content of its frame.",
    methods: [
      {
        approach: "Write specific, unique titles",
        description:
          "Give each frame a title that is distinct and accurately reflects its content.",
        code: `<!-- Before: Duplicate titles -->
<iframe src="ad1.html" title="Advertisement"></iframe>
<iframe src="ad2.html" title="Advertisement"></iframe>

<!-- After: Unique, descriptive titles -->
<iframe src="ad1.html" title="Advertisement for Awesome Brand shoes"></iframe>
<iframe src="ad2.html" title="Advertisement for Super Soda"></iframe>`,
      },
      {
        approach: "Include identifying context or numbers",
        description:
          "If frames contain very similar content, add a number or other identifier to make their titles unique.",
        code: `<!-- Before: Identical titles for related content -->
<iframe src="video1.html" title="Product Video"></iframe>
<iframe src="video2.html" title="Product Video"></iframe>

<!-- After: Unique titles with identifiers -->
<iframe src="video1.html" title="Product Video: Unboxing"></iframe>
<iframe src="video2.html" title="Product Video: Feature Demonstration"></iframe>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Two `<iframe>` elements have the exact same title.",
        code: `<iframe src="form-a.html" title="Contact Us"></iframe>
<iframe src="form-b.html" title="Contact Us"></iframe>`,
        issue:
          "Because both frames are titled 'Contact Us', a screen reader user cannot tell which one is for sales and which one is for support.",
      },
    ],
    passing: [
      {
        description:
          "Each `<iframe>` has a unique title that describes its specific purpose.",
        code: `<iframe src="form-a.html" title="Contact Sales"></iframe>
<iframe src="form-b.html" title="Contact Technical Support"></iframe>`,
        explanation:
          "The unique titles make it clear which form the user is about to interact with.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "The accessible name of each frame (provided by its title) must be sufficiently descriptive to distinguish it from other frames.",
      },
    ],
    techniques: [
      {
        id: "H64",
        title: "Using the title attribute of the frame and iframe elements",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H64",
      },
      {
        id: "G131",
        title: "Providing descriptive labels",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G131",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.frameTitleUniqueRule = frameTitleUniqueRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["frame-title-unique"] = frameTitleUniqueRule;
}
