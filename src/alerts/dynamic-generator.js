/**
 * Dynamic Alerts Page Generator
 * Generates the alerts page content directly from axe-core at runtime
 */

class DynamicAlertsGenerator {
  constructor() {
    this.rules = null;
    this.version = null;
  }

  async initialize() {
    // Load axe-core if not already loaded
    if (typeof axe === "undefined") {
      await this.loadAxeCore();
    }

    // Get only WCAG A/AA rules and filter the audit rules accordingly
    const wcagRules = axe.getRules(["wcag2a", "wcag2aa"]);
    const wcagRuleIds = new Set(wcagRules.map((rule) => rule.ruleId));

    this.rules = Object.values(axe._audit.rules)
      .filter((rule) => wcagRuleIds.has(rule.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    this.version = axe.version;
  }

  async loadAxeCore() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("libs/axe-core.js");
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  generatePage() {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nexus Accessibility Alerts</title>
                <link rel="stylesheet" href="${chrome.runtime.getURL(
                  "alerts/alerts.css"
                )}">
            </head>
            <body>
                <div class="alerts-container">
                    <header class="alerts-header">
                        <h1>
                            <img src="${chrome.runtime.getURL(
                              "assets/nexus-logo.svg"
                            )}" alt="Nexus" class="logo">
                            Accessibility Alerts
                        </h1>
                        <p>Complete reference of accessibility rules from axe-core ${
                          this.version
                        }</p>
                    </header>

                    <main class="alerts-content">
                        <h2>All Accessibility Rules (${this.rules.length})</h2>
                        
                        ${this.generateRulesHtml()}
                    </main>

                    <footer class="alerts-footer">
                        <p>
                            Accessibility testing and alerts powered by 
                            <a href="https://github.com/dequelabs/axe-core" target="_blank" rel="noopener">axe-core</a> 
                            v${this.version}
                        </p>
                        <p>Generated on ${new Date().toLocaleDateString()}</p>
                    </footer>
                </div>
            </body>
            </html>
        `;
  }

  generateRulesHtml() {
    return this.rules
      .map((rule) => {
        const ruleData = rule.metadata || rule;
        const impact = ruleData.impact || "minor";
        const tags = ruleData.tags || [];

        return `
                <section id="rule-${
                  rule.id
                }" class="rule-section impact-${impact}">
                    <h3>
                        <a href="#rule-${rule.id}" class="rule-anchor">${
          rule.id
        }</a>
                        <span class="impact-badge impact-${impact}">${impact}</span>
                    </h3>
                    <div class="rule-content">
                        <p class="rule-description">${this.escapeHtml(
                          ruleData.description
                        )}</p>
                        <p class="rule-help">${this.escapeHtml(
                          ruleData.help
                        )}</p>
                        ${
                          ruleData.helpUrl
                            ? `<p class="rule-link"><a href="${ruleData.helpUrl}" target="_blank" rel="noopener">Learn more</a></p>`
                            : ""
                        }
                        
                        ${
                          tags.length > 0
                            ? `
                        <div class="rule-tags">
                            <strong>Tags:</strong> ${tags
                              .map(
                                (tag) =>
                                  `<span class="tag">${this.escapeHtml(
                                    tag
                                  )}</span>`
                              )
                              .join(" ")}
                        </div>`
                            : ""
                        }
                    </div>
                </section>
            `;
      })
      .join("");
  }

  escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Export for use in other modules
if (typeof module !== "undefined") {
  module.exports = DynamicAlertsGenerator;
}
