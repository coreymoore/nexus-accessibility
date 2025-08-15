// Rule documentation for: td-headers-attr
// Enhanced accessibility rule description

const tdHeadersAttrRule = {
  plainLanguage: {
    whatItMeans:
      "When table data cells use the headers attribute, it must reference valid header cell IDs.",
    whyItMatters:
      "Broken header references prevent screen readers from properly associating data with its context in complex tables.",
    whoItAffects:
      "Screen reader users navigating complex tables who need accurate header-data relationships.",
  },
  technicalSummary:
    "Ensures headers attribute values on td elements reference existing id values on th elements within the same table.",
  whyItMatters: [
    "Maintains accurate header-data relationships in complex tables",
    "Prevents broken references that confuse assistive technology",
    "Ensures table navigation features work correctly",
    "Provides reliable context for table data",
  ],
  howToFix: {
    overview:
      "Ensure all headers attribute values reference valid, existing header cell IDs.",
    methods: [
      {
        approach: "Verify header ID references",
        description:
          "Check that all headers attributes point to existing th element IDs",
        code: `<!-- Correct header references -->
<table>
  <tr>
    <th id="name">Name</th>
    <th id="dept">Department</th>
    <th id="salary">Salary</th>
  </tr>
  <tr>
    <td headers="name">Alice</td>
    <td headers="dept">Engineering</td>
    <td headers="salary">$75,000</td>
  </tr>
</table>`,
      },
      {
        approach: "Fix broken references",
        description: "Update headers attributes to match actual header IDs",
        code: `<!-- Before: Broken reference -->
<td headers="employee-name">John</td> <!-- ID doesn't exist -->

<!-- After: Correct reference -->
<th id="employee-name">Name</th>
<td headers="employee-name">John</td>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Headers attribute referencing non-existent ID",
        code: `<table>
  <tr><th id="product">Product</th></tr>
  <tr><td headers="item">Widget</td></tr>
</table>`,
        issue: "headers='item' references non-existent ID 'item'",
      },
    ],
    passing: [
      {
        description: "Valid headers attribute reference",
        code: `<table>
  <tr><th id="product">Product</th></tr>
  <tr><td headers="product">Widget</td></tr>
</table>`,
        explanation:
          "headers attribute correctly references existing header ID",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.3.1 Info and Relationships (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        relationship:
          "Table relationships must be programmatically determinable",
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

// Register the rule
if (typeof ruleDocs !== "undefined") {
  ruleDocs["td-headers-attr"] = tdHeadersAttrRule;
}
