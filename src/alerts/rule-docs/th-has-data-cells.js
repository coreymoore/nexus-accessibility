// Rule documentation for: th-has-data-cells
// Enhanced accessibility rule description

const thHasDataCellsRule = {
  plainLanguage: {
    whatItMeans: "Table header cells should have corresponding data cells that they describe.",
    whyItMatters: "Empty header cells or headers without data can confuse screen readers and provide no useful information.",
    whoItAffects: "Screen reader users who navigate tables and expect headers to provide context for actual data.",
  },
  technicalSummary: "Ensures table header cells (th) have associated data cells (td) that they describe within the table structure.",
  whyItMatters: [
    "Ensures headers provide meaningful context for table data",
    "Prevents empty or orphaned headers that confuse assistive technology",
    "Maintains logical table structure for screen reader navigation",
    "Supports proper table interpretation and comprehension",
  ],
  howToFix: {
    overview: "Ensure every header cell describes actual data cells, or remove unnecessary headers.",
    methods: [
      {
        approach: "Add corresponding data cells",
        description: "Provide data cells for each header cell",
        code: `<!-- Before: Header without data -->
<table>
  <tr>
    <th>Name</th>
    <th>Email</th>
    <th>Phone</th>
  </tr>
  <tr>
    <td>John Doe</td>
    <td>john@example.com</td>
    <!-- Missing phone data -->
  </tr>
</table>

<!-- After: Complete data for all headers -->
<table>
  <tr>
    <th>Name</th>
    <th>Email</th>
    <th>Phone</th>
  </tr>
  <tr>
    <td>John Doe</td>
    <td>john@example.com</td>
    <td>555-1234</td>
  </tr>
</table>`,
      },
      {
        approach: "Remove unnecessary headers",
        description: "Remove header cells that don't describe any data",
        code: `<!-- Remove headers that don't apply -->
<table>
  <tr>
    <th>Product</th>
    <th>Price</th>
    <!-- Removed unnecessary third header -->
  </tr>
  <tr>
    <td>Widget</td>
    <td>$10</td>
  </tr>
</table>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Header cell without corresponding data",
        code: `<table>
  <tr>
    <th>Item</th>
    <th>Description</th>
    <th>Notes</th>
  </tr>
  <tr>
    <td>Widget</td>
    <td>A useful tool</td>
    <!-- No data for Notes column -->
  </tr>
</table>`,
        issue: "Notes header has no corresponding data cell",
      },
    ],
    passing: [
      {
        description: "Headers with corresponding data",
        code: `<table>
  <tr>
    <th>Item</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>Widget</td>
    <td>A useful tool</td>
  </tr>
</table>`,
        explanation: "Both headers have corresponding data cells",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship: "Table structure must be logically organized",
      },
    ],
    techniques: [
      {
        id: "H51",
        title: "Using table markup to present tabular information",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H51",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== 'undefined') {
  // Create global variable for the rule
  window.thHasDataCellsRule = thHasDataCellsRule;
  
  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS['th-has-data-cells'] = thHasDataCellsRule;
}