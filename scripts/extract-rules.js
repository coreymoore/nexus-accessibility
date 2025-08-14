/**
 * Axe-Core Rule Metadata Extractor
 *
 * This script extracts all rule metadata from axe-core and generates
 * the guidance page content. Run this script when updating axe-core
 * to ensure the guidance page has the latest rule information.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the bundled axe-core
// Note: This assumes the build has been run and axe-core.js exists
const axeCorePath = path.join(__dirname, "../src/libs/axe-core.js");

if (!fs.existsSync(axeCorePath)) {
  console.error("axe-core.js not found. Please run npm run build first.");
  process.exit(1);
}

// Load axe-core in Node.js environment
const axeCore = fs.readFileSync(axeCorePath, "utf8");

// Create a mock browser environment for axe-core
const sandbox = {
  window: {},
  document: {},
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
};

// Execute axe-core in sandbox
vm.createContext(sandbox);
vm.runInContext(axeCore, sandbox);

// Get the axe object
const axe = sandbox.window.axe;

if (!axe) {
  console.error("Failed to load axe-core from bundle");
  process.exit(1);
}

/**
 * Extract all rule metadata from axe-core
 */
function extractRuleMetadata() {
  try {
    const rules = axe.getRules();
    const metadata = {
      version: getAxeVersion(),
      extractedAt: new Date().toISOString(),
      totalRules: rules.length,
      rules: {},
    };

    // Count rules by impact level for validation
    const impactCounts = {};

    for (const rule of rules) {
      // Try to find internal rule definition with impact
      let ruleImpact = "unknown";

      // Check internal axe rule definitions for impact
      if (axe._audit && axe._audit.rules) {
        const internalRule = axe._audit.rules.find((r) => r.id === rule.ruleId);
        if (internalRule && internalRule.impact) {
          ruleImpact = internalRule.impact;
        }
      }

      // Count impacts for validation
      impactCounts[ruleImpact] = (impactCounts[ruleImpact] || 0) + 1;

      metadata.rules[rule.ruleId] = {
        ruleId: rule.ruleId,
        description: rule.description || "",
        help: rule.help || "",
        helpUrl: rule.helpUrl || "",
        impact: ruleImpact,
        tags: rule.tags || [],
        wcag: extractWcagInfo(rule.tags || []),
        category: categorizeRule(rule.tags || []),
        enabled: rule.enabled !== false,
      };
    }

    // Log impact distribution
    console.log("\nImpact level distribution:");
    Object.entries(impactCounts).forEach(([impact, count]) => {
      console.log(`  ${impact}: ${count} rules`);
    });

    return metadata;
  } catch (error) {
    console.error("Error extracting rule metadata:", error);
    throw error;
  }
}

/**
 * Get axe-core version
 */
function getAxeVersion() {
  try {
    // Read package.json from axe-core
    const packageJsonPath = path.join(
      __dirname,
      "../node_modules/axe-core/package.json"
    );
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    return "unknown";
  }
}

/**
 * Extract WCAG information from rule tags
 */
function extractWcagInfo(tags) {
  const wcagTags = tags.filter((tag) => tag.startsWith("wcag"));
  return wcagTags.map((tag) => {
    const matches = tag.match(/wcag(\d+)(\w+)/);
    if (matches) {
      const level = matches[1];
      const criteria = matches[2];
      return {
        version: `WCAG ${
          level === "2"
            ? "2.0"
            : level === "21"
            ? "2.1"
            : level === "22"
            ? "2.2"
            : level
        }`,
        level: criteria.toUpperCase(),
        criterion: formatCriteria(criteria),
        tag: tag,
      };
    }
    return { tag };
  });
}

/**
 * Format WCAG criteria for display
 */
function formatCriteria(criteria) {
  // Convert something like "111" to "1.1.1"
  if (criteria.length >= 3) {
    return criteria.split("").join(".");
  }
  return criteria;
}

/**
 * Categorize rules by their primary purpose
 */
function categorizeRule(tags) {
  if (tags.includes("color")) return "Color and Contrast";
  if (tags.includes("keyboard")) return "Keyboard Navigation";
  if (tags.includes("forms")) return "Forms";
  if (tags.includes("images")) return "Images";
  if (tags.includes("links")) return "Links";
  if (tags.includes("tables")) return "Tables";
  if (tags.includes("headings")) return "Headings and Structure";
  if (tags.includes("landmarks")) return "Landmarks";
  if (tags.includes("lists")) return "Lists";
  if (tags.includes("media")) return "Media";
  if (tags.includes("language")) return "Language";
  if (tags.includes("parsing")) return "HTML Parsing";
  if (tags.includes("semantics")) return "Semantics";
  if (tags.includes("sensory")) return "Sensory Characteristics";
  if (tags.includes("timing")) return "Timing";
  if (tags.includes("focus")) return "Focus Management";
  return "General";
}

/**
 * Generate the guidance HTML page
 */
function generateAlertsPage(metadata) {
  const rulesArray = Object.values(metadata.rules).sort((a, b) =>
    a.ruleId.localeCompare(b.ruleId)
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Accessibility Alerts</title>
    <link rel="stylesheet" href="alerts.css">
</head>
<body>
    <div class="alerts-container">
        <header class="alerts-header">
            <h1>
                <img src="../assets/nexus-logo.svg" alt="Nexus" class="logo">
                Accessibility Alerts
            </h1>
            <p>Complete reference of accessibility rules from axe-core ${
              metadata.version
            }</p>
        </header>

        <main class="alerts-content">
            <h2>All Accessibility Rules (${rulesArray.length})</h2>
            
            ${rulesArray
              .map(
                (rule) => `
            <section id="rule-${rule.ruleId}" class="rule-section impact-${
                  rule.impact
                }">
                <h3>
                    <a href="#rule-${rule.ruleId}" class="rule-anchor">${
                  rule.ruleId
                }</a>
                    <span class="impact-badge impact-${rule.impact}">${
                  rule.impact
                }</span>
                </h3>
                <div class="rule-content">
                    <p class="rule-description">${escapeHtml(
                      rule.description
                    )}</p>
                    <p class="rule-help">${escapeHtml(rule.help)}</p>
                    ${
                      rule.helpUrl
                        ? `<p class="rule-link"><a href="${rule.helpUrl}" target="_blank" rel="noopener">Learn more</a></p>`
                        : ""
                    }
                    ${
                      rule.tags && rule.tags.length > 0
                        ? `
                    <div class="rule-tags">
                        <strong>Tags:</strong> ${rule.tags
                          .map((tag) => `<span class="tag">${tag}</span>`)
                          .join(" ")}
                    </div>`
                        : ""
                    }
                    ${
                      rule.wcag && rule.wcag.length > 0
                        ? `
                    <div class="rule-wcag">
                        <strong>WCAG:</strong> ${rule.wcag
                          .map((w) => `${w.version} ${w.criteria}`)
                          .join(", ")}
                    </div>`
                        : ""
                    }
                </div>
            </section>
            `
              )
              .join("")}
        </main>

        <footer class="alerts-footer">
            <p>
                Accessibility testing and alerts powered by 
                <a href="https://github.com/dequelabs/axe-core" target="_blank" rel="noopener">axe-core</a> 
                v${metadata.version}
            </p>
            <p>Generated on ${new Date(
              metadata.extractedAt
            ).toLocaleDateString()}</p>
        </footer>
    </div>
</body>
</html>`;
}

/**
 * Generate a rule card for the overview
 */
function generateRuleCard(rule) {
  const impactClass = `impact-${rule.impact}`;
  return `
    <article class="rule-card ${impactClass}" data-rule-id="${rule.ruleId}">
        <header class="rule-card-header">
            <h4>
                <a href="#rule-${rule.ruleId}">${rule.ruleId}</a>
            </h4>
            <span class="rule-impact ${impactClass}">${rule.impact}</span>
        </header>
        <p class="rule-description">${escapeHtml(
          rule.help || rule.description
        )}</p>
        ${
          rule.wcag.length > 0
            ? `
            <div class="rule-wcag">
                ${rule.wcag
                  .map(
                    (w) =>
                      `<span class="wcag-tag">${w.version} ${w.level}</span>`
                  )
                  .join("")}
            </div>
        `
            : ""
        }
    </article>
  `;
}

/**
 * Generate detailed rule information
 */
function generateRuleDetail(rule) {
  return `
    <section id="rule-${rule.ruleId}" class="rule-detail" data-rule-id="${
    rule.ruleId
  }">
        <header class="rule-detail-header">
            <h2>${rule.ruleId}</h2>
            <span class="rule-impact impact-${rule.impact}">${
    rule.impact
  } impact</span>
        </header>
        
        <div class="rule-content">
            <div class="rule-description">
                <h3>What this rule checks</h3>
                <p>${escapeHtml(rule.description)}</p>
            </div>
            
            <div class="rule-help">
                <h3>Why this matters</h3>
                <p>${escapeHtml(rule.help)}</p>
            </div>
            
            ${
              rule.wcag.length > 0
                ? `
                <div class="rule-wcag-details">
                    <h3>WCAG Success Criteria</h3>
                    <ul>
                        ${rule.wcag
                          .map(
                            (w) => `
                            <li>
                                <strong>${w.version} ${w.level}</strong>
                                ${
                                  w.criterion
                                    ? ` - Criterion ${w.criterion}`
                                    : ""
                                }
                            </li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
            `
                : ""
            }
            
            <div class="rule-actions">
                <a href="${
                  rule.helpUrl
                }" target="_blank" rel="noopener noreferrer" class="external-link">
                    Learn more about this rule
                </a>
                <button type="button" class="back-to-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
                    Back to top
                </button>
            </div>
        </div>
    </section>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert text to URL-friendly slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Main execution
 */
function main() {
  try {
    console.log("Extracting axe-core rule metadata...");
    const metadata = extractRuleMetadata();

    console.log(
      `Found ${metadata.totalRules} rules from axe-core ${metadata.version}`
    );

    // Ensure alerts directory exists
    const alertsDir = path.join(__dirname, "../src/alerts");
    if (!fs.existsSync(alertsDir)) {
      fs.mkdirSync(alertsDir, { recursive: true });
    }

    // Write metadata JSON
    const metadataPath = path.join(alertsDir, "rules-metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Metadata written to ${metadataPath}`);

    // Generate and write HTML alerts page
    const alertsHtml = generateAlertsPage(metadata);
    const alertsPath = path.join(alertsDir, "index.html");
    fs.writeFileSync(alertsPath, alertsHtml);
    console.log(`Alerts page written to ${alertsPath}`);

    console.log("✅ Rule metadata extraction completed successfully!");
  } catch (error) {
    console.error("❌ Failed to extract rule metadata:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { extractRuleMetadata, generateAlertsPage, main };
