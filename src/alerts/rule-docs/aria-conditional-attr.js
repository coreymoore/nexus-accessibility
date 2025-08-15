// Rule documentation for: aria-conditional-attr
// Enhanced accessibility rule description

const ariaConditionalAttrRule = {
  plainLanguage: {
    whatItMeans:
      "Some ARIA attributes should only be used when certain conditions are met, like when other specific attributes are also present.",
    whyItMatters:
      "Using ARIA attributes incorrectly can confuse assistive technology and create unexpected behavior.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology.",
  },
  technicalSummary:
    "Ensures ARIA attributes that require other attributes or specific conditions are only used when those requirements are met.",
  whyItMatters: [
    "Prevents ARIA attributes from being ignored or misinterpreted",
    "Ensures assistive technology receives complete and consistent information",
    "Maintains proper semantic relationships between elements",
    "Follows ARIA specification requirements for attribute dependencies",
  ],
  howToFix: {
    overview:
      "Either add the required supporting attributes or remove the conditional attribute.",
    methods: [
      {
        approach: "Add required supporting attributes",
        description:
          "For example, 'aria-checked' requires a role like 'checkbox' or 'switch'. Add the required role for the attribute to be valid.",
        code: `<!-- Before: aria-checked without a required role -->
<div aria-checked="true">Option 1</div>

<!-- After: Add the required role -->
<div role="checkbox" aria-checked="true" tabindex="0">Option 1</div>`,
      },
      {
        approach: "Remove unnecessary conditional attributes",
        description:
          "If the supporting conditions cannot be met, remove the conditional ARIA attribute to avoid confusion.",
        code: `<!-- Before: aria-posinset without aria-setsize -->
<ul>
  <li role="option" aria-posinset="1">First</li>
</ul>

<!-- After: Remove the attribute if set size is unknown -->
<ul>
  <li role="option">First</li>
</ul>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "aria-posinset used without aria-setsize",
        code: `<ul role="listbox">
  <li role="option" aria-posinset="1">First item</li>
  <li role="option" aria-posinset="2">Second item</li>
</ul>`,
        issue:
          "The 'aria-posinset' attribute is used, but the total number of items is not defined with 'aria-setsize' on the container.",
      },
      {
        description: "aria-checked used without a valid role",
        code: `<div aria-checked="true">A checked div</div>`,
        issue:
          "The 'aria-checked' attribute is only valid on elements with a role of 'checkbox', 'radio', 'switch', or similar.",
      },
    ],
    passing: [
      {
        description:
          "Properly implemented list with aria-posinset and aria-setsize",
        code: `<ul role="listbox" aria-setsize="2">
  <li role="option" aria-posinset="1">First item</li>
  <li role="option" aria-posinset="2">Second item</li>
</ul>`,
        explanation:
          "The 'aria-setsize' on the parent properly supports the use of 'aria-posinset' on the children.",
      },
      {
        description: "Properly implemented custom checkbox",
        code: `<div role="checkbox" aria-checked="true" tabindex="0">
  Receive notifications
</div>`,
        explanation:
          "The 'aria-checked' attribute is correctly used because the element has a 'checkbox' role.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "ARIA attributes must be used correctly to convey proper semantics",
      },
    ],
    techniques: [
      {
        id: "ARIA5",
        title:
          "Using WAI-ARIA state and property attributes to expose the state of a user interface component",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA5.html",
      },
    ],
  },
};

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-conditional-attr"] = ariaConditionalAttrRule;
}
