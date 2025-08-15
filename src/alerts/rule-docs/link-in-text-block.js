// Rule documentation for: link-in-text-block
// Enhanced accessibility rule description

const linkInTextBlockRule = {
  plainLanguage: {
    whatItMeans:
      "Links within text blocks must be visually distinguishable from surrounding text without relying only on color.",
    whyItMatters:
      "People with color blindness or low vision need other visual cues besides color to identify clickable links.",
    whoItAffects:
      "Users with color vision deficiencies, low vision, and anyone who has trouble distinguishing colors.",
  },
  technicalSummary:
    "Ensures links within paragraphs or text blocks have sufficient visual differentiation through underlines, borders, or other non-color indicators.",
  whyItMatters: [
    "Makes links discoverable for users with color vision deficiencies",
    "Provides visual cues that don't depend solely on color perception",
    "Improves link recognition in various viewing conditions",
    "Supports users who may have customized color settings",
  ],
  howToFix: {
    overview:
      "Add visual indicators like underlines, borders, or background changes to distinguish links from regular text.",
    methods: [
      {
        approach: "Use underlines",
        description: "Apply underlines to links within text blocks",
        code: `/* Ensure links are underlined */
p a, 
.text-content a {
  text-decoration: underline;
}

/* Maintain underline on hover */
p a:hover {
  text-decoration: underline;
}`,
      },
      {
        approach: "Add borders or backgrounds",
        description:
          "Use borders or background colors in addition to color changes",
        code: `/* Alternative visual indicators */
.content a {
  border-bottom: 1px solid;
  text-decoration: none;
}

.content a:hover {
  background-color: #f0f0f0;
  border-bottom: 2px solid;
}`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Link distinguished only by color",
        code: `<p>Visit our <a href="/about" style="color: blue; text-decoration: none;">about page</a> for more information.</p>`,
        issue:
          "Link is only distinguished by color, not visible to colorblind users",
      },
    ],
    passing: [
      {
        description: "Link with underline and color",
        code: `<p>Visit our <a href="/about" style="color: blue; text-decoration: underline;">about page</a> for more information.</p>`,
        explanation: "Link uses both color and underline for distinction",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.4.1 Use of Color (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html",
        relationship:
          "Color must not be the only visual means of conveying information",
      },
    ],
    techniques: [
      {
        id: "G183",
        title:
          "Using a contrast ratio of 3:1 with surrounding text and providing additional visual cues on focus",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G183",
      },
    ],
  },
};
