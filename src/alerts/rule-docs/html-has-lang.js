// Rule documentation for: html-has-lang
// Enhanced accessibility rule description

const htmlHasLangRule = {
  plainLanguage: {
    whatItMeans:
      "The main HTML element of every webpage must specify what language the content is written in.",
    whyItMatters:
      "Screen readers need to know the page language so they can pronounce text correctly and use the right voice.",
    whoItAffects:
      "Screen reader users who rely on proper pronunciation and language-specific speech synthesis.",
  },
  technicalSummary:
    "Ensures the <html> element has a valid lang attribute that identifies the primary language of the page content.",
  whyItMatters: [
    "Enables screen readers to use correct pronunciation and speech patterns",
    "Helps translation tools understand the source language",
    "Supports language-specific spell checking and grammar tools",
    "Improves search engine optimization for international content",
  ],
  howToFix: {
    overview:
      "Add a lang attribute to the HTML element with a valid language code.",
    methods: [
      {
        approach: "Add lang attribute to html element",
        description: "Specify the primary language using ISO language codes",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>My English Page</title>
</head>`,
      },
      {
        approach: "Use specific language codes",
        description:
          "Use more specific codes when needed for regional variations",
        code: `<!-- For US English -->
<html lang="en-US">

<!-- For British English -->
<html lang="en-GB">

<!-- For Spanish -->
<html lang="es">

<!-- For French Canadian -->
<html lang="fr-CA">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "HTML element without lang attribute",
        code: `<!DOCTYPE html>
<html>
<head>
  <title>Welcome to Our Site</title>
</head>`,
        issue: "No lang attribute specified on html element",
      },
    ],
    passing: [
      {
        description: "HTML with English language specified",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Welcome to Our Site</title>
</head>`,
        explanation:
          "lang='en' tells assistive technology this is English content",
      },
      {
        description: "HTML with Spanish language specified",
        code: `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Bienvenido a Nuestro Sitio</title>
</head>`,
        explanation:
          "lang='es' enables proper Spanish pronunciation by screen readers",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "3.1.1 Language of Page (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
        relationship:
          "The primary language of each Web page must be programmatically determinable",
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
