// Rule documentation for: dlitem
// Enhanced accessibility rule description

const dlitemRule = {
  plainLanguage: {
    whatItMeans:
      "Definition terms (`<dt>`) and definitions (`<dd>`) must be placed inside a definition list (`<dl>`). They cannot exist on their own.",
    whyItMatters:
      "If `<dt>` or `<dd>` tags are used outside of a `<dl>`, screen readers will not recognize them as part of a definition list. The relationship between the term and its definition will be lost.",
    whoItAffects:
      "Screen reader users who rely on correct list structures to understand content relationships and navigate efficiently.",
  },
  technicalSummary:
    "Ensures that every `<dt>` (definition term) and `<dd>` (definition description) element is a direct child of a `<dl>` (definition list) element, or a `<div>` that is a direct child of a `<dl>`.",
  whyItMatters: [
    "Maintains the correct semantic structure required by the HTML specification for definition lists",
    "Enables screen readers to correctly identify and announce the term-definition relationship",
    "Prevents assistive technologies from misinterpreting orphaned list items",
    "Ensures that the markup is valid and robust, leading to a more predictable user experience",
  ],
  howToFix: {
    overview:
      "Wrap any orphaned `<dt>` and `<dd>` elements in a parent `<dl>` element. If the content is not a true definition list, use more appropriate semantic elements like headings and paragraphs.",
    methods: [
      {
        approach: "Wrap orphaned items in a `<dl>` element",
        description:
          "If you have `<dt>` and `<dd>` elements that are not inside a `<dl>`, simply wrap them with a `<dl>` tag.",
        code: `<!-- Before: Orphaned definition items -->
<dt>Term</dt>
<dd>Definition</dd>

<!-- After: Properly contained within a <dl> -->
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>`,
      },
      {
        approach: "Use more appropriate semantic markup",
        description:
          "If your content isn't a true list of terms and definitions, it's better to use other elements. For a heading followed by text, use a heading element and a paragraph.",
        code: `<!-- Before: Misusing <dt> and <dd> -->
<dt>Section Title</dt>
<dd>Some explanatory text that isn't really a definition.</dd>

<!-- After: Using more appropriate semantics -->
<h3>Section Title</h3>
<p>Some explanatory text that isn't really a definition.</p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "A `<dt>` and `<dd>` element are used without a parent `<dl>`.",
        code: `<h2>Glossary</h2>
<dt>HTML</dt>
<dd>HyperText Markup Language</dd>`,
        issue:
          "The `<dt>` and `<dd>` elements are not contained within a `<dl>` element, so their relationship is not programmatically determinable.",
      },
    ],
    passing: [
      {
        description:
          "The `<dt>` and `<dd>` elements are correctly placed inside a `<dl>`.",
        code: `<dl>
  <dt>CSS</dt>
  <dd>Cascading Style Sheets</dd>
</dl>`,
        explanation:
          "The elements are properly contained, creating a valid and accessible definition list.",
      },
      {
        description: "The items are inside a `<div>` which is inside a `<dl>`.",
        code: `<dl>
  <div>
    <dt>IP Address</dt>
    <dd>192.168.1.1</dd>
  </div>
</dl>`,
        explanation:
          "This structure is also valid, as the parent of the `<dt>` and `<dd>` is a `<div>` which is a direct child of the `<dl>`.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "The parent/child relationship between a definition list and its items must be programmatically determinable. Orphaned items break this relationship.",
      },
    ],
    techniques: [
      {
        id: "H40",
        title: "Using definition lists",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H40",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.dlitemRule = dlitemRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["dlitem"] = dlitemRule;
}
