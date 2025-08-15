// Rule documentation for: document-title
// Enhanced accessibility rule description

const documentTitleRule = {
  plainLanguage: {
    whatItMeans:
      "Every web page must have a title that clearly describes its topic or purpose. This title appears in the browser tab, bookmarks, and search engine results.",
    whyItMatters:
      "The page title is the first piece of information announced by a screen reader. It helps all users understand where they are, what the page is about, and how to find it again later.",
    whoItAffects:
      "All users, but it is especially critical for screen reader users for orientation and navigation. It also aids users with cognitive disabilities by providing clear context.",
  },
  technicalSummary:
    "Ensures every HTML document has a non-empty `<title>` element within the `<head>` section. The title should be descriptive and provide a meaningful summary of the page's content.",
  whyItMatters: [
    "Provides essential context and orientation for users, especially those using assistive technologies",
    "Enables users to easily identify and distinguish between different pages in their browser tabs and history",
    "Improves search engine optimization (SEO), as search engines use the page title as a key piece of information",
    "Allows users to create meaningful bookmarks for returning to the page later",
  ],
  howToFix: {
    overview:
      "Add a unique and descriptive `<title>` element to the `<head>` of every HTML page. The title should be concise and clearly identify the page's purpose.",
    methods: [
      {
        approach: "Write a descriptive title",
        description:
          "The title should be specific and accurately reflect the page's content. A common best practice is to put the unique page name first, followed by the site name.",
        code: `<!-- Before: Generic or missing title -->
<head>
  <title>Home</title>
</head>

<!-- After: Descriptive title -->
<head>
  <title>Contact Us - Awesome Web Corp</title>
</head>`,
      },
      {
        approach: "Ensure every page has a title",
        description:
          "Every single HTML document, including those in an `<iframe>`, must have its own `<title>` element.",
        code: `<!-- Add a <title> to the <head> of the document -->
<!DOCTYPE html>
<html>
<head>
  <title>User Profile: Jane Doe</title>
</head>
<body>
  ...
</body>
</html>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "A page is missing a `<title>` element entirely.",
        code: `<head>
  <meta charset="UTF-8">
</head>`,
        issue:
          "There is no `<title>` element in the document's `<head>`, so the browser will display the file name, which is unhelpful.",
      },
      {
        description: "The `<title>` element is empty.",
        code: `<head>
  <title></title>
</head>`,
        issue:
          "An empty title provides no information to users or assistive technologies.",
      },
      {
        description: "The title is generic and not descriptive.",
        code: `<head>
  <title>Web page</title>
</head>`,
        issue:
          "This title is not specific enough to distinguish this page from any other page on the internet.",
      },
    ],
    passing: [
      {
        description: "A descriptive page title for a homepage.",
        code: `<head>
  <title>Awesome Web Corp - Solutions for Modern Businesses</title>
</head>`,
        explanation: "The title clearly identifies the site and its purpose.",
      },
      {
        description: "A specific title for an article page.",
        code: `<head>
  <title>How to Write Accessible Page Titles - Awesome Web Corp Blog</title>
</head>`,
        explanation:
          "The title is unique, descriptive, and follows a consistent pattern (Page - Site).",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.4.2 Page Titled (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html",
        relationship:
          "Web pages must have titles that describe their topic or purpose.",
      },
    ],
    techniques: [
      {
        id: "H25",
        title: "Providing a title using the title element",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H25",
      },
      {
        id: "G88",
        title: "Providing descriptive titles for Web pages",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G88",
      },
    ],
  },
};

// Register this rule description
if (typeof window !== "undefined" && window.RULE_DESCRIPTIONS) {
  window.RULE_DESCRIPTIONS["document-title"] = documentTitleRule;
}
