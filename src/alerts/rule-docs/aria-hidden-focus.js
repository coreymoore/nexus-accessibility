// Rule documentation for: aria-hidden-focus
// Enhanced accessibility rule description

const ariaHiddenFocusRule = {
  plainLanguage: {
    whatItMeans:
      "Elements that can receive keyboard focus must not be hidden from assistive technology users.",
    whyItMatters:
      "If focusable elements are hidden from screen readers, keyboard users may get stuck on invisible elements.",
    whoItAffects:
      "Screen reader users, keyboard navigation users, and anyone using assistive technology.",
  },
  technicalSummary:
    "Ensures elements that can receive focus (focusable elements) are not hidden from assistive technology using aria-hidden='true'.",
  whyItMatters: [
    "Prevents keyboard users from getting stuck on invisible elements",
    "Ensures screen reader users know what element has focus",
    "Maintains consistency between visual and programmatic focus indicators",
    "Prevents confusion when keyboard navigation encounters hidden focusable content",
  ],
  howToFix: {
    overview:
      "An element that can be focused must not be hidden with `aria-hidden='true'`. To fix this, either remove the `aria-hidden` attribute or make the element non-focusable by adding `tabindex='-1'`.",
    methods: [
      {
        approach: "Remove aria-hidden='true'",
        description:
          "If the element should be interactive and visible to all users, remove the `aria-hidden` attribute.",
        code: `<!-- Before: Focusable button is hidden from screen readers -->
<button aria-hidden="true">Save Changes</button>

<!-- After: The attribute is removed -->
<button>Save Changes</button>`,
      },
      {
        approach: "Make the element non-focusable",
        description:
          "If an element must be hidden from screen readers (e.g., it's off-screen or decorative), it must also be removed from the keyboard tab order.",
        code: `<!-- Before: Hidden but still focusable -->
<a href="/extra" aria-hidden="true">Details</a>

<!-- After: Hidden and not focusable -->
<a href="/extra" aria-hidden="true" tabindex="-1">Details</a>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A focusable button is hidden with `aria-hidden='true'`",
        code: `<button aria-hidden="true">Submit</button>`,
        issue:
          "This button can receive keyboard focus, but it is hidden from screen readers, which can cause a 'keyboard trap'.",
      },
      {
        description: "A focusable link is hidden with `aria-hidden='true'`",
        code: `<a href="/next" aria-hidden="true">Next Page</a>`,
        issue:
          "A screen reader user can tab to this link, but their screen reader will not announce it, creating confusion.",
      },
    ],
    passing: [
      {
        description: "A decorative icon inside a button is hidden",
        code: `<button>
  <span aria-hidden="true">✔</span>
  Confirm
</button>`,
        explanation:
          "The focusable `<button>` is visible to screen readers, while the purely decorative `<span>` inside it is correctly hidden.",
      },
      {
        description: "A hidden element is correctly removed from focus order",
        code: `<div id="offscreen-panel" aria-hidden="true">
  <a href="/action" tabindex="-1">Perform Action</a>
</div>`,
        explanation:
          "The link is inside a hidden container and is correctly given `tabindex='-1'` to prevent keyboard focus.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship:
          "Focusable elements must be programmatically determinable by assistive technology.",
      },
      {
        criterion: "2.4.3 Focus Order (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html",
        relationship:
          "Hiding a focusable element can disrupt the logical focus order, creating confusion.",
      },
    ],
    techniques: [
      {
        id: "F79",
        title:
          "Failure of Success Criterion 4.1.2 due to the focus state of a user interface component not being programmatically determinable or no notification of change of focus is available",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/failures/F79.html",
      },
    ],
  },
};

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["aria-hidden-focus"] = ariaHiddenFocusRule;
}
