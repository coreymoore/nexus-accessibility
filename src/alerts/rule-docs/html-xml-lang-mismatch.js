// Rule documentation for: html-xml-lang-mismatch
// Enhanced accessibility rule description

const htmlXmlLangMismatchRule = {
  plainLanguage: {
    whatItMeans:
      "When both html lang and xml:lang attributes are present, they must specify the same language.",
    whyItMatters:
      "Conflicting language declarations can confuse assistive technology about which language the page is written in.",
    whoItAffects:
      "Screen reader users who rely on language settings for proper pronunciation and text-to-speech.",
  },
  technicalSummary:
    "Ensures that when both lang and xml:lang attributes are present on the html element, they specify the same language code.",
  whyItMatters: [
    "Prevents conflicting language information for assistive technology",
    "Ensures consistent language detection across different parsers",
    "Supports proper pronunciation by screen readers",
    "Maintains compatibility between HTML and XHTML documents",
  ],
  howToFix: {
    overview:
      "Make sure lang and xml:lang attributes specify the same language code, or remove the xml:lang attribute if not needed.",
    methods: [
      {
        approach: "Synchronize language codes",
        description: "Ensure both attributes use the same language value",
        code: `<!-- Before: Mismatched language codes -->
<html lang="en" xml:lang="fr">

<!-- After: Matching language codes -->
<html lang="en" xml:lang="en">`,
      },
      {
        approach: "Remove xml:lang if not needed",
        description: "Use only lang attribute for HTML5 documents",
        code: `<!-- Recommended for HTML5 -->
<html lang="en">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Mismatched language attributes",
        code: `<html lang="en" xml:lang="es">`,
        issue: "lang specifies English but xml:lang specifies Spanish",
      },
    ],
    passing: [
      {
        description: "Matching language attributes",
        code: `<html lang="fr" xml:lang="fr">`,
        explanation: "Both attributes specify the same language code",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "3.1.1 Language of Page (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
        relationship: "Page language must be consistently identified",
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
