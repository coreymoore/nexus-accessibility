// Rule documentation for: avoid-inline-spacing
// Enhanced accessibility rule description

const avoidInlineSpacingRule = {
  plainLanguage: {
    whatItMeans:
      "Text spacing properties should be set using CSS stylesheets, not inline styles with `!important`. This ensures that users can adjust text spacing to meet their reading needs.",
    whyItMatters:
      "Some users with low vision or cognitive disabilities like dyslexia require custom text spacing to read effectively. If spacing is locked with an inline `!important` style, it cannot be changed by the user's browser or accessibility tools.",
    whoItAffects:
      "Users with dyslexia, low vision, and other reading or visual impairments who rely on custom stylesheets to adjust text appearance for better readability.",
  },
  technicalSummary:
    "Ensures that inline `style` attributes do not set `line-height`, `letter-spacing`, or `word-spacing` with an `!important` declaration. Using `!important` on these properties prevents users from overriding them with their own custom stylesheets, which is a failure of WCAG 1.4.12.",
  whyItMatters: [
    "Allows users to apply their own custom text spacing settings via browser extensions or user stylesheets",
    "Supports personalized reading experiences, which is critical for some users with disabilities",
    "Ensures that content remains readable and functional when spacing is adjusted",
    "Follows modern CSS best practices by separating content (HTML) from presentation (CSS)",
  ],
  howToFix: {
    overview:
      "Remove any inline styles for `line-height`, `letter-spacing`, or `word-spacing` that use `!important`. Define these styles in an external CSS stylesheet instead, where they can be easily overridden.",
    methods: [
      {
        approach: "Move inline styles to a CSS class",
        description:
          "The best practice is to define all presentational styles, including text spacing, in a CSS stylesheet. This keeps your HTML clean and allows user styles to take precedence.",
        code: `/* CSS Stylesheet */
.readable-text {
  line-height: 1.5 !important;
  letter-spacing: 0.1em !important;
}

<!-- Before: Inline styles with !important -->
<p style="line-height: 1.2 !important; letter-spacing: 0.05em !important;">
  Text content
</p>

<!-- After: Use a CSS class, which can be overridden -->
<p class="readable-text">Text content</p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Inline `line-height` with `!important`",
        code: `<p style="line-height: 1.1 !important;">This text is cramped and cannot be adjusted by the user.</p>`,
        issue:
          "The inline style with `!important` locks the line height, preventing user overrides.",
      },
      {
        description:
          "Inline `letter-spacing` and `word-spacing` with `!important`",
        code: `<div style="letter-spacing: -0.05em !important; word-spacing: -0.1em !important;">...</div>`,
        issue:
          "These inline styles restrict the user's ability to customize letter and word spacing.",
      },
    ],
    passing: [
      {
        description: "Text spacing is defined in a CSS stylesheet",
        code: `<p class="body-text">This text has appropriate spacing that users can customize if needed.</p>
<style>
  .body-text {
    line-height: 1.6;
    letter-spacing: 0.02em;
  }
</style>`,
        explanation:
          "Because the spacing is defined in a stylesheet and does not use `!important`, a user can easily override it with their own preferences.",
      },
      {
        description: "Inline style without `!important`",
        code: `<p style="line-height: 1.5;">This is acceptable because it can be overridden.</p>`,
        explanation:
          "While not best practice, an inline style without '!important' does not fail this specific WCAG criterion because a user can still override it (e.g., with 'line-height: 2.0 !important;' in their own stylesheet).",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.4.12 Text Spacing (Level AA)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html",
        relationship:
          "Content must not lose functionality or information when users adjust text spacing. Using `!important` in inline styles for spacing properties can prevent this adjustment.",
      },
    ],
    techniques: [
      {
        id: "C21",
        title: "Specifying text spacing in CSS",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/css/C21",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.avoidInlineSpacingRule = avoidInlineSpacingRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["avoid-inline-spacing"] = avoidInlineSpacingRule;
}
