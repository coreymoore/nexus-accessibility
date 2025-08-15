// Rule documentation for: blink
// Enhanced accessibility rule description

const blinkRule = {
  plainLanguage: {
    whatItMeans:
      "Content on a page should not blink or flash. This type of effect is highly distracting and can trigger seizures in some individuals.",
    whyItMatters:
      "Blinking content can be extremely distracting for users with attention disorders. More critically, content that flashes at certain rates can trigger seizures in people with photosensitive epilepsy.",
    whoItAffects:
      "People with photosensitive epilepsy, ADHD, autism, and anyone who finds rapid visual changes disruptive or distracting.",
  },
  technicalSummary:
    "Ensures that the deprecated `<blink>` element is not used and that `text-decoration: blink` is not applied to any content. Both of these methods create blinking text that is harmful to accessibility.",
  whyItMatters: [
    "Prevents the risk of inducing seizures in users with photosensitive epilepsy",
    "Reduces cognitive overload and distraction, particularly for users with attention disorders",
    "Supports focus and concentration by creating a more stable and predictable viewing experience",
    "Adheres to modern web standards, which have deprecated blinking elements for being harmful and disruptive",
  ],
  howToFix: {
    overview:
      "Remove any use of the `<blink>` element or the `text-decoration: blink` CSS style. If you need to draw attention to an element, use a method that does not involve flashing, such as bold text, colors, or icons.",
    methods: [
      {
        approach: "Remove the `<blink>` element",
        description:
          "The `<blink>` element is obsolete and should be removed from the HTML entirely. Replace it with a `<span>` or `<div>` and use CSS for styling if needed.",
        code: `<!-- Before: Using the <blink> element -->
<blink>New Sale!</blink>

<!-- After: Using a standard element -->
<span>New Sale!</span>`,
      },
      {
        approach: "Remove `text-decoration: blink` from CSS",
        description:
          "This CSS property is also deprecated. Remove it from your stylesheets and use a different method to create emphasis.",
        code: `/* Before: Blinking style */
.urgent {
  text-decoration: blink;
}

/* After: Use a static style for emphasis */
.urgent {
  font-weight: bold;
  color: red;
}`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "The `<blink>` element is used.",
        code: `<blink>This text will blink and is not accessible.</blink>`,
        issue:
          "The `<blink>` element is deprecated and creates a distracting, potentially harmful effect.",
      },
      {
        description: "CSS `text-decoration: blink` is used.",
        code: `<p style="text-decoration: blink;">This text also blinks.</p>`,
        issue:
          "The `text-decoration: blink` style is deprecated and causes the same accessibility problems as the `<blink>` element.",
      },
    ],
    passing: [
      {
        description: "Static styling is used to draw attention.",
        code: `<p><strong>Important:</strong> Please review the updated terms.</p>`,
        explanation:
          "Using `<strong>` or other static styling (like color or borders) provides emphasis without the harm of blinking.",
      },
      {
        description: "A gentle, slow animation is used instead of blinking.",
        code: `<style>
.gentle-pulse {
  animation: gentle-pulse 3s ease-in-out infinite;
}
@keyframes gentle-pulse {
  50% { opacity: 0.7; }
}
</style>
<div class="gentle-pulse">This is a subtle notification.</div>`,
        explanation:
          "If an animation is necessary, it should be slow and subtle, and it must respect the user's motion preferences.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.3.1 Three Flashes or Below Threshold (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html",
        relationship:
          "Web pages shall not contain anything that flashes more than three times in any one second period.",
      },
      {
        criterion: "2.2.2 Pause, Stop, Hide (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html",
        relationship:
          "For any moving, blinking or scrolling information, there must be a mechanism for the user to pause, stop, or hide it.",
      },
    ],
    techniques: [
      {
        id: "F47",
        title:
          "Failure of Success Criterion 2.3.1 due to using the blink element",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/failures/F47",
      },
      {
        id: "F7",
        title:
          "Failure of Success Criterion 2.2.2 due to an object or applet, such as Java or Flash, that has blinking content",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/failures/F7",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.blinkRule = blinkRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["blink"] = blinkRule;
}
