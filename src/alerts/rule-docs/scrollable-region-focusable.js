// Rule documentation for: scrollable-region-focusable
// Enhanced accessibility rule description

const scrollableRegionFocusableRule = {
  plainLanguage: {
    whatItMeans:
      "Scrollable content areas must be keyboard accessible so that users can scroll through content without a mouse.",
    whyItMatters:
      "Keyboard users need to be able to access and scroll through all content areas on a page.",
    whoItAffects:
      "Keyboard users, users with motor disabilities, and anyone who cannot use a mouse or touch interface.",
  },
  technicalSummary:
    "Ensures scrollable regions are focusable and keyboard accessible, typically by adding tabindex='0' to scrollable containers.",
  whyItMatters: [
    "Enables keyboard access to scrollable content",
    "Supports users who cannot use mouse or touch scrolling",
    "Ensures all content is reachable via keyboard navigation",
    "Provides equal access to interactive content areas",
  ],
  howToFix: {
    overview:
      "Make scrollable regions focusable by adding appropriate tabindex values and ensuring keyboard scrolling works.",
    methods: [
      {
        approach: "Add tabindex to scrollable containers",
        description: "Make custom scrollable areas keyboard focusable",
        code: `<!-- Before: Non-focusable scrollable area -->
<div class="scrollable-content">
  <p>Long content that scrolls...</p>
</div>

<!-- After: Keyboard accessible scrollable area -->
<div class="scrollable-content" tabindex="0" role="region" aria-label="Scrollable content area">
  <p>Long content that scrolls...</p>
</div>`,
      },
      {
        approach: "Use semantic scrollable elements",
        description: "Use elements that are naturally keyboard accessible",
        code: `<!-- Textarea is naturally keyboard scrollable -->
<textarea rows="10" cols="50">
  Long text content that can be scrolled with keyboard...
</textarea>

<!-- Select with multiple options is keyboard scrollable -->
<select size="5" multiple>
  <option>Option 1</option>
  <option>Option 2</option>
  <option>Option 3</option>
</select>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Scrollable div without keyboard access",
        code: `<div style="height: 200px; overflow-y: scroll;">
  <p>Very long content that requires scrolling...</p>
</div>`,
        issue: "Scrollable area cannot be focused or scrolled with keyboard",
      },
    ],
    passing: [
      {
        description: "Keyboard accessible scrollable region",
        code: `<div style="height: 200px; overflow-y: scroll;" tabindex="0" role="region" aria-label="Article content">
  <p>Very long content that requires scrolling...</p>
</div>`,
        explanation:
          "tabindex='0' makes the scrollable area keyboard focusable",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.1.1 Keyboard (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
        relationship: "All functionality must be available via keyboard",
      },
    ],
    techniques: [
      {
        id: "G202",
        title: "Ensuring keyboard control for all functionality",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G202",
      },
    ],
  },
};
