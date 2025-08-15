// Rule documentation for: link-name
// Enhanced accessibility rule description

const linkNameRule = {
  plainLanguage: {
    whatItMeans:
      "All links must have text that clearly describes where the link goes or what it does.",
    whyItMatters:
      "Users need to understand the purpose and destination of links before deciding whether to follow them.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology for navigation.",
  },
  technicalSummary:
    "Ensures link elements have accessible names through text content, aria-label, aria-labelledby, or title attributes.",
  whyItMatters: [
    "Enables users to make informed decisions about link navigation",
    "Supports voice control commands that rely on link names",
    "Improves navigation efficiency and reduces confusion",
    "Ensures links are identifiable and distinguishable",
  ],
  howToFix: {
    overview:
      "Provide descriptive text or labels for all link elements that indicate their purpose or destination.",
    methods: [
      {
        approach: "Use descriptive link text",
        description: "Include meaningful text within the link element",
        code: `<a href="/contact">Contact Us</a>
<a href="/products">View Our Products</a>`,
      },
      {
        approach: "Use aria-label for complex links",
        description: "Add aria-label when link text alone isn't sufficient",
        code: `<a href="/report.pdf" aria-label="Download annual report (PDF, 2MB)">
  Annual Report <i class="download-icon"></i>
</a>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Link with non-descriptive text",
        code: `<a href="/contact">Click here</a>`,
        issue: "Link text doesn't indicate where the link goes",
      },
    ],
    passing: [
      {
        description: "Link with descriptive text",
        code: `<a href="/contact">Contact Us</a>`,
        explanation: "Link text clearly indicates the destination",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.4.4 Link Purpose (In Context) (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
        relationship:
          "Links must have clear purpose described in accessible name",
      },
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Interactive elements require accessible names",
      },
    ],
    techniques: [
      {
        id: "H30",
        title:
          "Providing link text that describes the purpose of a link for anchor elements",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H30",
      },
    ],
  },
};
