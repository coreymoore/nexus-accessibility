// Rule documentation for: meta-refresh
// Enhanced accessibility rule description

const metaRefreshRule = {
  plainLanguage: {
    whatItMeans:
      "Pages should not automatically refresh or redirect users without warning, as this can be disorienting and disruptive.",
    whyItMatters:
      "Automatic page refreshes can interrupt screen readers, cause users to lose their place, and be confusing for people with cognitive disabilities.",
    whoItAffects:
      "Screen reader users, people with cognitive disabilities, and anyone who needs time to read and understand content.",
  },
  technicalSummary:
    "Ensures meta refresh elements do not automatically refresh or redirect pages without user control.",
  whyItMatters: [
    "Prevents interruption of screen reader announcements",
    "Allows users to control their browsing experience",
    "Avoids disorientation from unexpected page changes",
    "Supports users who need more time to read content",
  ],
  howToFix: {
    overview:
      "Remove automatic refresh/redirect meta tags and provide user-controlled alternatives.",
    methods: [
      {
        approach: "Remove automatic refresh",
        description: "Replace meta refresh with user-controlled options",
        code: `<!-- Before: Automatic refresh -->
<meta http-equiv="refresh" content="30">

<!-- After: User-controlled refresh -->
<button onclick="location.reload()">Refresh page</button>
<p>Last updated: <span id="timestamp"></span></p>`,
      },
      {
        approach: "Provide manual redirect links",
        description:
          "Replace automatic redirects with links users can choose to follow",
        code: `<!-- Before: Automatic redirect -->
<meta http-equiv="refresh" content="0; url=https://example.com/new-page">

<!-- After: Manual redirect -->
<div class="redirect-notice">
  <p>This page has moved.</p>
  <a href="https://example.com/new-page">Continue to new page</a>
</div>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Automatic page refresh",
        code: `<meta http-equiv="refresh" content="60">`,
        issue:
          "Page automatically refreshes every 60 seconds without user control",
      },
      {
        description: "Automatic redirect",
        code: `<meta http-equiv="refresh" content="5; url=/new-location">`,
        issue: "Page automatically redirects after 5 seconds",
      },
    ],
    passing: [
      {
        description: "User-controlled refresh option",
        code: `<div class="page-controls">
  <button onclick="location.reload()">Refresh content</button>
  <span>Last updated: 2 minutes ago</span>
</div>`,
        explanation: "Users can choose when to refresh the page",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.2.1 Timing Adjustable (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html",
        relationship: "Users must be able to control timing of content changes",
      },
    ],
    techniques: [
      {
        id: "G110",
        title: "Using an instant client-side redirect",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G110",
      },
    ],
  },
};
