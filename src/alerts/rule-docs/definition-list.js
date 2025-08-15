// Rule documentation for: definition-list
// Enhanced accessibility rule description

const definitionListRule = {
  plainLanguage: {
    whatItMeans:
      "Definition lists, used for glossaries or key-value pairs (like metadata), must be structured correctly using the proper HTML tags.",
    whyItMatters:
      "When structured correctly, screen readers can announce the relationship between terms and their definitions. If incorrect tags like `<p>` or `<div>` are used, this relationship is lost.",
    whoItAffects:
      "Screen reader users who rely on correct semantic markup to understand the structure and relationships in the content.",
  },
  technicalSummary:
    "Ensures that `<dl>` (definition list) elements only contain valid children: `<dt>` (definition term), `<dd>` (definition description), and `<div>` elements for grouping. Any other direct children are invalid.",
  whyItMatters: [
    "Enables screen readers to programmatically announce the relationships between terms and definitions",
    "Allows users of assistive technology to navigate lists of terms and definitions efficiently",
    "Maintains the correct semantic meaning of the content, separating it from visual presentation",
    "Provides a predictable and robust structure for displaying key-value data",
  ],
  howToFix: {
    overview:
      "Structure all definition lists using the correct HTML elements: a `<dl>` wrapper containing one or more groups of `<dt>` (the term) and `<dd>` (the definition).",
    methods: [
      {
        approach: "Use the standard `<dt>` and `<dd>` structure",
        description:
          "The most common structure is one or more pairs of a term followed by its definition.",
        code: `<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language, the standard markup language for documents designed to be displayed in a web browser.</dd>
  
  <dt>CSS</dt>
  <dd>Cascading Style Sheets, a style sheet language used for describing the presentation of a document.</dd>
</dl>`,
      },
      {
        approach: "Group multiple terms or definitions",
        description:
          "It is valid to have multiple terms for one definition, or one term with multiple definitions.",
        code: `<!-- Multiple terms, one definition -->
<dl>
  <dt>JS</dt>
  <dt>JavaScript</dt>
  <dd>A programming language that is one of the core technologies of the World Wide Web.</dd>
</dl>

<!-- One term, multiple definitions -->
<dl>
  <dt>Bank</dt>
  <dd>A financial institution.</dd>
  <dd>The land alongside a river.</dd>
</dl>`,
      },
      {
        approach: "Use `<div>` to wrap term-definition groups",
        description:
          "For styling or semantic grouping, you can wrap a term and its definition(s) in a `<div>` inside the `<dl>`.",
        code: `<dl>
  <div>
    <dt>Author</dt>
    <dd>John Doe</dd>
  </div>
  <div>
    <dt>Published</dt>
    <dd>2023-10-26</dd>
  </div>
</dl>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "A `<dl>` contains elements other than `<dt>`, `<dd>`, or `<div>`.",
        code: `<dl>
  <p>Term 1</p>
  <span>Definition 1</span>
</dl>`,
        issue:
          "A `<dl>` cannot have `<p>` or `<span>` as direct children. The content must be structured with `<dt>` and `<dd>` elements.",
      },
    ],
    passing: [
      {
        description: "A correctly structured definition list.",
        code: `<dl>
  <dt>Accessibility (A11Y)</dt>
  <dd>The practice of making websites usable by as many people as possible.</dd>
</dl>`,
        explanation:
          "This list correctly uses `<dt>` for the term and `<dd>` for the definition.",
      },
      {
        description: "A valid list using `<div>` wrappers for each pair.",
        code: `<dl>
  <div>
    <dt>IP Address</dt>
    <dd>192.168.1.1</dd>
  </div>
  <div>
    <dt>Status</dt>
    <dd>Connected</dd>
  </div>
</dl>`,
        explanation:
          "Using `<div>` to group pairs is valid and allows for easier styling without breaking semantics.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "The semantic relationship between terms and their definitions must be programmatically determinable, which is achieved by using the correct `<dl>`, `<dt>`, and `<dd>` markup.",
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
  window.definitionListRule = definitionListRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["definition-list"] = definitionListRule;
}
