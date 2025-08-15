// Rule documentation for: server-side-image-map
// Enhanced accessibility rule description

const serverSideImageMapRule = {
  plainLanguage: {
    whatItMeans:
      "Server-side image maps should not be used unless equivalent text links are provided.",
    whyItMatters:
      "Server-side image maps are not accessible to keyboard users or screen readers without alternative text navigation.",
    whoItAffects:
      "Keyboard users, screen reader users, and anyone who cannot precisely click on image coordinates.",
  },
  technicalSummary:
    "Ensures server-side image maps (using ismap attribute) have equivalent text-based alternatives for navigation.",
  whyItMatters: [
    "Provides keyboard accessible alternatives to image map navigation",
    "Ensures all users can access linked content",
    "Supports users who cannot see or precisely click on image areas",
    "Maintains functionality when images are disabled",
  ],
  howToFix: {
    overview:
      "Provide text-based link alternatives for server-side image maps or convert to client-side image maps.",
    methods: [
      {
        approach: "Add text link alternatives",
        description:
          "Provide equivalent text links for all image map destinations",
        code: `<!-- Server-side image map with text alternatives -->
<img src="navigation.png" alt="Site navigation" ismap>

<!-- Text alternatives -->
<ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/products">Products</a></li>
  <li><a href="/contact">Contact</a></li>
</ul>`,
      },
      {
        approach: "Convert to client-side image map",
        description: "Use client-side image maps which are more accessible",
        code: `<!-- Client-side image map -->
<img src="navigation.png" alt="Site navigation" usemap="#nav-map">
<map name="nav-map">
  <area shape="rect" coords="0,0,100,50" href="/home" alt="Home">
  <area shape="rect" coords="100,0,200,50" href="/products" alt="Products">
  <area shape="rect" coords="200,0,300,50" href="/contact" alt="Contact">
</map>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Server-side image map without alternatives",
        code: `<a href="/cgi-bin/imagemap">
  <img src="menu.png" alt="Navigation menu" ismap>
</a>`,
        issue: "No text-based alternatives for image map links",
      },
    ],
    passing: [
      {
        description: "Server-side image map with text alternatives",
        code: `<img src="menu.png" alt="Navigation menu" ismap>
<nav>
  <a href="/home">Home</a> |
  <a href="/about">About</a> |
  <a href="/contact">Contact</a>
</nav>`,
        explanation: "Text links provide equivalent navigation options",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "2.1.1 Keyboard (Level A)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
        relationship: "All functionality must be available via keyboard",
      },
    ],
    techniques: [
      {
        id: "H37",
        title: "Using alt attributes on img elements",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H37",
      },
    ],
  },
};
