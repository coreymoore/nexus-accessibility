// Rule documentation for: valid-lang
// Enhanced accessibility rule description

const validLangRule = {
  plainLanguage: {
    whatItMeans: "When elements specify a language different from the page, they must use valid language codes.",
    whyItMatters: "Screen readers need valid language codes to pronounce words correctly when language changes within content.",
    whoItAffects: "Screen reader users reading multilingual content or content with foreign words and phrases.",
  },
  technicalSummary: "Ensures lang attributes on elements contain valid BCP 47 language codes for proper language identification.",
  whyItMatters: [
    "Enables correct pronunciation of foreign words and phrases",
    "Supports proper text-to-speech conversion for multilingual content",
    "Prevents confusion when content includes multiple languages",
    "Ensures assistive technology can adapt to language changes within content",
  ],
  howToFix: {
    overview: "Replace invalid language codes with valid BCP 47 language tags.",
    methods: [
      {
        approach: "Fix invalid language codes",
        description: "Use proper language codes for foreign language content",
        code: `<!-- Before: Invalid codes -->
<p>Welcome! <span lang="spanish">Bienvenidos</span></p>
<p>Hello <span lang="FR">Bonjour</span></p>

<!-- After: Valid codes -->
<p>Welcome! <span lang="es">Bienvenidos</span></p>
<p>Hello <span lang="fr">Bonjour</span></p>`,
      },
      {
        approach: "Use specific regional codes when needed",
        description: "Include region codes for language variants",
        code: `<p>Price: <span lang="en-US">$50.00</span></p>
<p>Prix: <span lang="fr-CA">50,00 $</span></p>`,
      },
    ],
  },
  examples: {
    failing: [
      {
        description: "Invalid language code on span",
        code: `<p>The French word <span lang="french">bonjour</span> means hello.</p>`,
        issue: "Language code 'french' is not valid, should be 'fr'",
      },
    ],
    passing: [
      {
        description: "Valid language code for foreign phrase",
        code: `<p>The Spanish phrase <span lang="es">buenos días</span> means good morning.</p>`,
        explanation: "Uses valid 'es' code for Spanish content",
      },
    ],
  },
  wcagMapping: {
    guidelines: [
      {
        criterion: "3.1.2 Language of Parts (Level AA)",
        link: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html",
        relationship: "Language changes within content must be programmatically determinable",
      },
    ],
    techniques: [
      {
        id: "H58",
        title: "Using language attributes to identify changes in the human language",
        link: "https://www.w3.org/WAI/WCAG21/Techniques/html/H58",
      },
    ],
  },
};

// Register this rule description globally
if (typeof window !== 'undefined') {
  // Create global variable for the rule
  window.validLangRule = validLangRule;
  
  // Also register in RULE_DESCRIPTIONS if it exists
  if (!window.RULE_DESCRIPTIONS) {
    window.RULE_DESCRIPTIONS = {};
  }
  window.RULE_DESCRIPTIONS['valid-lang'] = validLangRule;
}