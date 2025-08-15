// Rule documentation for: meta-viewport
// Enhanced accessibility rule description

const metaViewportRule = {
  plainLanguage: {
    whatItMeans:
      "The viewport meta tag must not prevent users from zooming in on content to make it larger.",
    whyItMatters:
      "People with visual impairments need to be able to zoom content up to 200% to read it comfortably.",
    whoItAffects:
      "Users with visual impairments, users on small screens, and anyone who needs to enlarge content to read it.",
  },
  technicalSummary:
    "Ensures viewport meta tags do not use maximum-scale less than 2 or user-scalable=no, which would prevent zooming.",
  whyItMatters: [
    "Enables users to enlarge content for better readability",
    "Supports accessibility requirements for content scaling",
    "Prevents barriers for users with visual impairments",
    "Maintains user control over their viewing experience",
  ],
  howToFix: {
    overview:
      "Remove or modify viewport restrictions that prevent zooming to at least 200%.",
    methods: [
      {
        approach: "Allow zooming",
        description:
          "Remove user-scalable=no and ensure maximum-scale allows 200% zoom",
        code: `<!-- Before: Prevents zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="viewport" content="width=device-width, maximum-scale=1.0">

<!-- After: Allows proper zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">`,
      },
      {
        approach: "Use responsive design instead",
        description: "Rely on responsive CSS instead of viewport restrictions",
        code: `<!-- Recommended viewport tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Viewport prevents user scaling",
        code: `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">`,
        issue: "user-scalable=no prevents users from zooming",
      },
      {
        description: "Maximum scale too restrictive",
        code: `<meta name="viewport" content="width=device-width, maximum-scale=1.0">`,
        issue: "maximum-scale=1.0 prevents zooming beyond 100%",
      },
    ],
    passing: [
      {
        description: "Viewport allows proper scaling",
        code: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        explanation: "Allows users to zoom content for better accessibility",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "1.4.4 Resize text (Level AA)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html",
        relationship:
          "Content must be resizable up to 200% without assistive technology",
      },
    ],
    techniques: [
      {
        id: "G142",
        title:
          "Using a technology that has commonly-available user agents that support zoom",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/general/G142",
      },
    ],
  },
};
