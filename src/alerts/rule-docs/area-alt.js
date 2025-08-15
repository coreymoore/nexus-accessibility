// Rule documentation for: area-alt
// Enhanced accessibility rule description

const areaAltRule = {
  plainLanguage: {
    whatItMeans:
      "All clickable areas in image maps must have alternative text that describes their purpose.",
    whyItMatters:
      "Screen reader users need to know what each clickable area does before deciding whether to activate it.",
    whoItAffects:
      "Screen reader users, voice control users, and anyone using assistive technology.",
  },
  technicalSummary:
    "Ensures all <area> elements within image maps have accessible names through alt attributes, aria-label, or aria-labelledby.",
  whyItMatters: [
    "Provides essential information about interactive elements to assistive technology users",
    "Enables users to make informed decisions about navigation choices",
    "Ensures equal access to image map functionality",
    "Prevents confusion when encountering unlabeled interactive areas",
  ],
  howToFix: {
    overview:
      "Add descriptive alternative text to all <area> elements in image maps.",
    methods: [
      {
        approach: "Use alt attribute",
        description: "Add a descriptive alt attribute to each area element",
        code: `<map name="navigation">
  <area shape="rect" coords="0,0,100,50" href="/home" alt="Home page">
  <area shape="rect" coords="100,0,200,50" href="/about" alt="About us">
</map>`,
      },
      {
        approach: "Use aria-label",
        description:
          "Provide accessible names using aria-label when alt is not sufficient",
        code: `<area shape="circle" coords="150,150,50" href="/contact" 
       aria-label="Contact us - opens contact form">`,
      },
      {
        approach: "Use aria-labelledby",
        description:
          "Reference descriptive text elsewhere on the page using aria-labelledby",
        code: `<map name="products">
  <area shape="rect" coords="0,0,100,50" href="/product1" aria-labelledby="product1-desc">
</map>
<p id="product1-desc">View details for our new flagship product</p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Area element without alternative text",
        code: `<area shape="rect" coords="0,0,100,50" href="/home">`,
        issue:
          "Screen readers cannot describe the purpose of this clickable area",
      },
    ],
    passing: [
      {
        description: "Area element with descriptive alt text",
        code: `<area shape="rect" coords="0,0,100,50" href="/home" alt="Home page">`,
        explanation: "Clearly describes the destination and purpose",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.4.4 Link Purpose (In Context) (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
        relationship:
          "Area elements must have clear purpose described in accessible name",
      },
      {
        criterion: "4.1.2 Name, Role, Value (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
        relationship: "Interactive elements require accessible names",
      },
    ],
    techniques: [
      {
        id: "H24",
        title:
          "Providing text alternatives for the area elements of image maps",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H24",
      },
    ],
  },
};

// Register globally
window.RULE_DESCRIPTIONS = window.RULE_DESCRIPTIONS || {};
window.RULE_DESCRIPTIONS["area-alt"] = areaAltRule;
