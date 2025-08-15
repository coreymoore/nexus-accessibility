// Rule documentation for: duplicate-id-aria
// Enhanced accessibility rule description

const duplicateIdAriaRule = {
  plainLanguage: {
    whatItMeans:
      "If an `id` is used to connect two elements for accessibility (like a label and an input), that `id` must be unique on the page.",
    whyItMatters:
      "Assistive technologies use `id`s to create relationships. If an `id` is duplicated, the technology gets confused and might connect the wrong elements, leading to a confusing or broken experience.",
    whoItAffects:
      "Screen reader users and other assistive technology users who rely on programmatic relationships created by `id` references (e.g., `aria-labelledby`, `aria-describedby`).",
  },
  technicalSummary:
    "Ensures that any `id` attribute value that is referenced by an ARIA attribute (such as `aria-labelledby`, `aria-describedby`, `aria-controls`, etc.) is not used on more than one element in the document. This is a specific check for a common cause of accessibility issues related to parsing.",
  whyItMatters: [
    "Prevents ambiguous and incorrect associations between elements, which can break component functionality",
    "Ensures that assistive technologies can reliably and accurately locate the correct element being referenced",
    "Maintains the integrity of programmatic relationships, which are essential for non-visual navigation",
    "Avoids unpredictable behavior in screen readers and other tools that rely on a valid document object model (DOM)",
  ],
  howToFix: {
    overview:
      "Find the duplicated `id` and change it to be unique. IDs should be descriptive and specific to the element they identify.",
    methods: [
      {
        approach: "Ensure all referenced IDs are unique",
        description:
          "Search the document for the duplicated `id` and rename one or more instances to ensure every `id` is unique.",
        code: `<!-- Before: Duplicate id="email-label" -->
<label id="email-label">Your Email</label>
<input aria-labelledby="email-label">

<label id="email-label">Contact's Email</label>
<input aria-labelledby="email-label">

<!-- After: Unique IDs -->
<label id="user-email-label">Your Email</label>
<input aria-labelledby="user-email-label">

<label id="contact-email-label">Contact's Email</label>
<input aria-labelledby="contact-email-label">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A duplicate `id` is used for `aria-describedby`.",
        code: `<label for="pw1">Password</label>
<input id="pw1" type="password" aria-describedby="pw-desc">
<p id="pw-desc">Must be 8 characters.</p>

<label for="pw2">Confirm Password</label>
<input id="pw2" type="password" aria-describedby="pw-desc">
<p id="pw-desc">Re-enter your password.</p>`,
        issue:
          "The `id` 'pw-desc' is used twice. An assistive technology may read the wrong description for one or both of the password fields.",
      },
    ],
    passing: [
      {
        description: "All `id`s referenced by ARIA attributes are unique.",
        code: `<label for="pw1">Password</label>
<input id="pw1" type="password" aria-describedby="pw-desc-1">
<p id="pw-desc-1">Must be 8 characters.</p>

<label for="pw2">Confirm Password</label>
<input id="pw2" type="password" aria-describedby="pw-desc-2">
<p id="pw-desc-2">Re-enter your password.</p>`,
        explanation:
          "By making the IDs unique (`pw-desc-1` and `pw-desc-2`), the relationship between each input and its description is clear and unambiguous.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.1 Parsing (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/parsing.html",
        relationship:
          "In documents using markup languages, `id` attributes must be unique to avoid parsing errors that can cause accessibility problems.",
      },
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "If an `id` is duplicated, the accessible name or description of a component may be computed incorrectly, leading to a failure.",
      },
    ],
    techniques: [
      {
        id: "H93",
        title: "Ensuring that id attributes are unique on a Web page",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H93",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.duplicateIdAriaRule = duplicateIdAriaRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["duplicate-id-aria"] = duplicateIdAriaRule;
}
