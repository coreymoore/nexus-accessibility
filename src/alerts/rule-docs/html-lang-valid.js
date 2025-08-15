// Rule documentation for: html-lang-valid
// Enhanced accessibility rule description

const htmlLangValidRule = {
  plainLanguage: {
    whatItMeans:
      "The language specified for the webpage must be a valid language code that assistive technology can recognize.",
    whyItMatters:
      "Screen readers need valid language codes to use the correct pronunciation and speech patterns.",
    whoItAffects:
      "Screen reader users who depend on proper language pronunciation for understanding content.",
  },
  technicalSummary:
    "Ensures the lang attribute on HTML elements contains valid language codes according to BCP 47 standards.",
  whyItMatters: [
    "Enables screen readers to use correct pronunciation for the specified language",
    "Prevents mispronunciation that could make content unintelligible",
    "Supports proper text-to-speech conversion across different languages",
    "Ensures compatibility with language-specific assistive technology features",
  ],
  howToFix: {
    overview: "Use valid language codes that conform to BCP 47 standards.",
    methods: [
      {
        approach: "Use standard language codes",
        description: "Replace invalid codes with proper BCP 47 language tags",
        code: `<!-- Before: Invalid language codes -->
<html lang="english">  <!-- Invalid -->
<html lang="EN">       <!-- Invalid casing -->

<!-- After: Valid language codes -->
<html lang="en">       <!-- Valid -->
<html lang="en-US">    <!-- Valid with region -->
<html lang="es">       <!-- Valid Spanish -->
<html lang="fr-CA">    <!-- Valid French Canadian -->`,
      },
      {
        approach: "Check language code validity",
        description: "Verify language codes against official standards",
        code: `<!-- Common valid language codes -->
<html lang="en">    <!-- English -->
<html lang="es">    <!-- Spanish -->
<html lang="fr">    <!-- French -->
<html lang="de">    <!-- German -->
<html lang="ja">    <!-- Japanese -->
<html lang="zh">    <!-- Chinese -->`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Invalid language code",
        code: `<html lang="english">`,
        issue: "Language code 'english' is not a valid BCP 47 code",
      },
      {
        description: "Incorrect casing",
        code: `<html lang="EN-us">`,
        issue: "Language codes should be lowercase, region codes uppercase",
      },
    ],
    passing: [
      {
        description: "Valid language code",
        code: `<html lang="en">`,
        explanation: "Uses valid BCP 47 language code for English",
      },
      {
        description: "Valid language with region",
        code: `<html lang="en-GB">`,
        explanation: "Valid code for British English",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "3.1.1 Language of Page (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
        relationship:
          "Page language must be programmatically determinable with valid codes",
      },
    ],
    techniques: [
      {
        id: "H57",
        title: "Using language attributes on the html element",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H57",
      },
    ],
  },
};
