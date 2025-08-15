// Rule documentation for: color-contrast
// Enhanced accessibility rule description

const colorContrastRule = {
  plainLanguage: {
    whatItMeans:
      "Text must have enough contrast against its background color to be easily readable. For example, light gray text on a white background is very hard to read.",
    whyItMatters:
      "People with low vision or color blindness may not be able to read text if the contrast is too low. Good contrast benefits everyone, especially when reading on a mobile device in bright sunlight.",
    whoItAffects:
      "Users with low vision, color vision deficiencies, older adults with age-related vision loss, and anyone viewing a screen in challenging lighting conditions.",
  },
  technicalSummary:
    "Ensures that the contrast ratio between text and its background color meets WCAG 2.1 Level AA requirements: 4.5:1 for normal-sized text and 3:1 for large text (18pt/24px or 14pt/19px bold).",
  whyItMatters: [
    "Makes text readable and legible for users with moderate visual impairments",
    "Improves the user experience in various lighting conditions, such as glare or bright sunlight",
    "Supports users with color vision deficiencies who perceive colors differently",
    "Benefits all users by reducing eye strain and improving overall readability",
  ],
  howToFix: {
    overview:
      "Adjust the text color or the background color to increase the contrast ratio until it meets the minimum requirement. Use a color contrast checking tool to verify the ratio.",
    methods: [
      {
        approach: "Increase text color darkness or lightness",
        description:
          "On a light background, make the text darker. On a dark background, make the text lighter.",
        code: `/* Before: Poor contrast (light gray on white) */
.low-contrast {
  color: #888888; /* Contrast ratio: 3.0:1 */
  background-color: #FFFFFF;
}

/* After: Good contrast (dark gray on white) */
.good-contrast {
  color: #595959; /* Contrast ratio: 4.5:1 */
  background-color: #FFFFFF;
}`,
      },
      {
        approach: "Adjust the background color",
        description:
          "Change the background color to be sufficiently different from the text color.",
        code: `/* Before: Poor contrast (dark text on a medium-dark background) */
.poor-contrast {
  color: #333333;
  background-color: #666666; /* Contrast ratio: 2.4:1 */
}

/* After: Good contrast (dark text on a light background) */
.better-contrast {
  color: #333333;
  background-color: #DDDDDD; /* Contrast ratio: 4.8:1 */
}`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Insufficient contrast for normal-sized text",
        code: `<p style="color: #999999; background-color: #FFFFFF;">Light gray text on a white background.</p>`,
        issue:
          "The contrast ratio is 2.32:1, which is below the required minimum of 4.5:1 for normal text.",
      },
      {
        description: "Insufficient contrast for large text",
        code: `<h2 style="color: #808080; background-color: #FFFFFF; font-size: 24px;">Large gray text on white.</h2>`,
        issue:
          "The contrast ratio is 2.77:1, which is below the required minimum of 3:1 for large text.",
      },
    ],
    passing: [
      {
        description: "Sufficient contrast for normal-sized text",
        code: `<p style="color: #595959; background-color: #FFFFFF;">Dark gray text on a white background.</p>`,
        explanation:
          "The contrast ratio is 4.5:1, meeting the minimum requirement.",
      },
      {
        description: "Sufficient contrast for large text",
        code: `<h2 style="color: #767676; background-color: #FFFFFF; font-size: 19px; font-weight: bold;">Large bold text.</h2>`,
        explanation:
          "The contrast ratio is 3.0:1, meeting the minimum requirement for large text.",
      },
      {
        description: "Logos and decorative text are exempt",
        code: `<p>Text in a <span class="logo">companyLogo</span> is exempt.</p>`,
        explanation:
          "Text that is part of a logo or is purely decorative has no contrast requirement.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.4.3 Contrast (Minimum) (Level AA)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
        relationship:
          "Requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.",
      },
    ],
    techniques: [
      {
        id: "G18",
        title:
          "Ensuring that a contrast ratio of at least 4.5:1 exists between text (and images of text) and background behind the text",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G18",
      },
      {
        id: "G145",
        title:
          "Ensuring that a contrast ratio of at least 3:1 exists between text (and images of text) and background behind the text",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G145",
      },
      {
        id: "F24",
        title:
          "Failure of Success Criterion 1.4.3, 1.4.6 and 1.4.8 due to specifying foreground colors without specifying background colors or vice versa",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/failures/F24",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.colorContrastRule = colorContrastRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["color-contrast"] = colorContrastRule;
}
