// Rule documentation for: td-has-header
// Enhanced accessibility rule description

const tdHasHeaderRule = {
  plainLanguage: {
    whatItMeans:
      "Data cells in tables must be associated with header cells so that screen readers can announce the context for each piece of data.",
    whyItMatters:
      "When navigating table data with a screen reader, users need to know which headers apply to each data cell.",
    whoItAffects:
      "Screen reader users who navigate through table data and need context for understanding cell relationships.",
  },
  technicalSummary:
    "Ensures table data cells (td) are associated with header cells (th) through proper table structure or headers/id attributes.",
  whyItMatters: [
    "Provides context for table data when using screen readers",
    "Enables understanding of data relationships in complex tables",
    "Supports table navigation features in assistive technology",
    "Ensures tabular data is comprehensible without visual context",
  ],
  howToFix: {
    overview:
      "Ensure table data cells are properly associated with their headers through table structure or explicit associations.",
    methods: [
      {
        approach: "Use proper table structure",
        description: "Organize tables with clear header rows and columns",
        code: `<table>
  <thead>
    <tr>
      <th>Product</th>
      <th>Price</th>
      <th>Stock</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Widget A</td>
      <td>$19.99</td>
      <td>15</td>
    </tr>
  </tbody>
</table>`,
      },
      {
        approach: "Use headers and id attributes",
        description:
          "Explicitly associate cells with headers in complex tables",
        code: `<table>
  <tr>
    <th id="product">Product</th>
    <th id="q1">Q1 Sales</th>
    <th id="q2">Q2 Sales</th>
  </tr>
  <tr>
    <td headers="product">Widget A</td>
    <td headers="product q1">$50k</td>
    <td headers="product q2">$75k</td>
  </tr>
</table>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Data cells without header association",
        code: `<table>
  <tr>
    <td>Name</td>
    <td>Age</td>
  </tr>
  <tr>
    <td>John</td>
    <td>25</td>
  </tr>
</table>`,
        issue: "First row should use th elements, not td elements",
      },
    ],
    passing: [
      {
        description: "Properly structured table with headers",
        code: `<table>
  <tr>
    <th>Name</th>
    <th>Age</th>
  </tr>
  <tr>
    <td>John</td>
    <td>25</td>
  </tr>
</table>`,
        explanation: "Header cells (th) provide context for data cells (td)",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "Table header-data relationships must be programmatically determinable",
      },
    ],
    techniques: [
      {
        id: "H43",
        title:
          "Using id and headers attributes to associate data cells with header cells in data tables",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H43",
      },
    ],
  },
};
