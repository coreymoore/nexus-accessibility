// Rule documentation for: table-fake-caption
// Enhanced accessibility rule description

const tableFakeCaptionRule = {
  plainLanguage: {
    whatItMeans:
      "Tables should use proper caption elements rather than fake captions made from other elements.",
    whyItMatters:
      "Screen readers need real caption elements to understand what a table is about and to provide proper table navigation.",
    whoItAffects:
      "Screen reader users who rely on table structure and captions for understanding tabular data.",
  },
  technicalSummary:
    "Ensures tables use proper caption elements instead of paragraphs, headings, or other elements positioned to look like captions.",
  whyItMatters: [
    "Enables screen readers to associate captions with tables",
    "Provides proper semantic structure for table identification",
    "Supports table navigation features in assistive technology",
    "Ensures tables are properly labeled and described",
  ],
  howToFix: {
    overview:
      "Replace fake caption elements with proper caption elements inside table elements.",
    methods: [
      {
        approach: "Use proper caption element",
        description: "Replace styled elements with actual table captions",
        code: `<!-- Before: Fake caption -->
<h3>Quarterly Sales Data</h3>
<table>
  <tr><th>Quarter</th><th>Sales</th></tr>
  <tr><td>Q1</td><td>$100k</td></tr>
</table>

<!-- After: Proper caption -->
<table>
  <caption>Quarterly Sales Data</caption>
  <tr><th>Quarter</th><th>Sales</th></tr>
  <tr><td>Q1</td><td>$100k</td></tr>
</table>`,
      },
      {
        approach: "Move caption inside table",
        description: "Ensure captions are the first child of table elements",
        code: `<table>
  <caption>Employee Contact Information</caption>
  <thead>
    <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
  </thead>
  <tbody>
    <tr><td>John Doe</td><td>john@example.com</td><td>555-1234</td></tr>
  </tbody>
</table>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Table with paragraph caption",
        code: `<p><strong>Price Comparison</strong></p>
<table>
  <tr><th>Product</th><th>Price</th></tr>
  <tr><td>Widget A</td><td>$10</td></tr>
</table>`,
        issue:
          "Paragraph above table acts as caption but isn't semantically connected",
      },
    ],
    passing: [
      {
        description: "Table with proper caption",
        code: `<table>
  <caption>Price Comparison</caption>
  <tr><th>Product</th><th>Price</th></tr>
  <tr><td>Widget A</td><td>$10</td></tr>
</table>`,
        explanation: "Caption element is properly associated with the table",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "Table structure and relationships must be programmatically determinable",
      },
    ],
    techniques: [
      {
        id: "H39",
        title:
          "Using caption elements to associate data table captions with data tables",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H39",
      },
    ],
  },
};
