// Rule documentation for: bypass
// Enhanced accessibility rule description

const bypassRule = {
  plainLanguage: {
    whatItMeans:
      "A page with repeating blocks of content, like a main navigation menu, must provide a way for users to skip directly to the main content.",
    whyItMatters:
      "Without a bypass mechanism, keyboard and screen reader users are forced to navigate through the same list of links on every single page before reaching the unique content. This is tedious and inefficient.",
    whoItAffects:
      "Keyboard-only users, screen reader users, and anyone who navigates sequentially through a page's content.",
  },
  technicalSummary:
    "Ensures that a mechanism is available to bypass blocks of content that are repeated on multiple web pages. This is typically achieved with a 'skip link', ARIA landmarks, or a logical heading structure.",
  whyItMatters: [
    "Dramatically reduces the time and effort needed for keyboard users to reach the main content",
    "Improves navigation efficiency and reduces frustration",
    "Supports screen reader users who can navigate via landmarks or headings to jump to specific sections",
    "Enhances the overall usability and accessibility of any site with a consistent navigation structure",
  ],
  howToFix: {
    overview:
      "Implement a skip link, use native HTML landmark elements, or ensure a logical heading structure is in place. A skip link is the most direct and explicit method.",
    methods: [
      {
        approach: "Add a 'skip to main content' link",
        description:
          "This is the most common technique. Provide a link at the very top of the `<body>` that jumps the user to the main content area of the page. The link should be one of the first items to receive keyboard focus.",
        code: `<!-- The link should be visible on keyboard focus -->
<style>
  .skip-link {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .skip-link:focus {
    left: auto;
    width: auto;
    height: auto;
    overflow: visible;
  }
</style>

<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header>
    <!-- Navigation, logo, etc. -->
  </header>
  <main id="main-content">
    <!-- Main page content -->
  </main>
</body>`,
      },
      {
        approach: "Use HTML5 landmark elements",
        description:
          "Structure your page using native HTML elements like `<header>`, `<nav>`, `<main>`, and `<aside>`. Assistive technologies can use these landmarks to navigate directly to the main content area.",
        code: `<header>
  <nav aria-label="Main Navigation">
    <!-- Navigation links -->
  </nav>
</header>
<main>
  <!-- All main content goes here -->
</main>
<footer>
  <!-- Footer content -->
</footer>`,
      },
      {
        approach: "Use a logical heading structure",
        description:
          "Screen reader users can navigate a page by its headings. By placing an `<h1>` at the start of the main content, you provide a target they can easily jump to.",
        code: `<body>
  <header>
    <nav>...</nav>
  </header>
  <main>
    <h1>The Main Topic of the Page</h1>
    <!-- Page content -->
  </main>
</body>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description:
          "A page has a large navigation menu but no mechanism to bypass it.",
        code: `<body>
  <div class="header">
    <a href="/">Home</a>
    <a href="/products">Products</a>
    <!-- 20 more links -->
  </div>
  <div class="content">
    The main content starts here...
  </div>
</body>`,
        issue:
          "A keyboard user must tab through all 22 links in the header on every page to reach the content.",
      },
    ],
    passing: [
      {
        description: "A skip link is provided as the first element.",
        code: `<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <nav><!-- Navigation --></nav>
  <main id="main">
    <h1>Page Title</h1>
    <!-- Content -->
  </main>
</body>`,
        explanation:
          "The skip link allows keyboard users to immediately bypass the navigation block.",
      },
      {
        description: "The page is structured with landmarks and headings.",
        code: `<header>
  <nav>...</nav>
</header>
<main>
  <h1>Main Content</h1>
  ...
</main>`,
        explanation:
          "Assistive technology users can use the `<main>` landmark or the `<h1>` to jump directly to the content.",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.4.1 Bypass Blocks (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
        relationship:
          "A mechanism must be available to bypass blocks of content that are repeated on multiple Web pages.",
      },
    ],
    techniques: [
      {
        id: "G1",
        title:
          "Adding a link at the top of each page that goes directly to the main content area",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G1",
      },
      {
        id: "G123",
        title:
          "Adding a link at the beginning of a block of repeated content to go to the end of the block",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G123",
      },
      {
        id: "ARIA11",
        title: "Using ARIA landmarks to identify regions of a page",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA11",
      },
      {
        id: "H69",
        title:
          "Providing heading elements at the beginning of each section of content",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H69",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== "undefined") {
  // Create global variable for the rule
  window.bypassRule = bypassRule;

  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS["bypass"] = bypassRule;
}
