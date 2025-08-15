// Rule documentation for: p-as-heading
// Enhanced accessibility rule description

const pAsHeadingRule = {
  plainLanguage: {
    whatItMeans:
      "Paragraphs should not be styled to look like headings instead of using proper heading elements.",
    whyItMatters:
      "Screen readers rely on actual heading elements to understand page structure and provide navigation shortcuts.",
    whoItAffects:
      "Screen reader users who navigate by headings and anyone using assistive technology to understand page structure.",
  },
  technicalSummary:
    "Ensures content that appears to be headings uses proper heading elements (h1-h6) rather than styled paragraph elements.",
  whyItMatters: [
    "Enables screen reader users to navigate by headings",
    "Provides proper document structure for assistive technology",
    "Supports automated content analysis and SEO",
    "Maintains semantic meaning of content hierarchy",
  ],
  howToFix: {
    overview:
      "Replace styled paragraphs with appropriate heading elements and apply styles to the headings.",
    methods: [
      {
        approach: "Use proper heading elements",
        description: "Convert styled paragraphs to actual heading elements",
        code: `<!-- Before: Styled paragraph as heading -->
<p class="large-bold">Section Title</p>
<p>Content for this section...</p>

<!-- After: Proper heading element -->
<h2>Section Title</h2>
<p>Content for this section...</p>`,
      },
      {
        approach: "Apply styles to headings",
        description: "Style actual heading elements instead of paragraphs",
        code: `/* CSS for proper heading styling */
h1, h2, h3 {
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Paragraph styled as heading",
        code: `<p style="font-size: 24px; font-weight: bold;">Chapter 1</p>
<p>This chapter covers the basics...</p>`,
        issue:
          "Paragraph is visually a heading but not semantically marked as one",
      },
    ],
    passing: [
      {
        description: "Proper heading element",
        code: `<h2>Chapter 1</h2>
<p>This chapter covers the basics...</p>`,
        explanation: "Uses semantic heading element for proper structure",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "Document structure must be programmatically determinable",
      },
    ],
    techniques: [
      {
        id: "H42",
        title: "Using h1-h6 to identify headings",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H42",
      },
    ],
  },
};
