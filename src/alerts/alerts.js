/**
 * Guidance Page JavaScript
 *
 * Handles search/filter functionality, navigation, and accessibility features
 * for the guidance page.
 */

(function () {
  "use strict";

  // DOM elements
  let searchInput;
  let searchResultsCount;
  let ruleCards;
  let categoryToggles;
  let allRules;

  // Search state
  let searchTerm = "";
  let visibleRulesCount = 0;

  /**
   * Initialize the guidance page functionality
   */
  function initialize() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupGuidancePage);
    } else {
      setupGuidancePage();
    }
  }

  /**
   * Setup the guidance page after DOM is ready
   */
  function setupGuidancePage() {
    // Get DOM elements
    searchInput = document.getElementById("rule-search");
    searchResultsCount = document.getElementById("search-results-count");
    ruleCards = Array.from(document.querySelectorAll(".rule-card"));
    allRules = Array.from(document.querySelectorAll(".rule-detail"));

    // Enhance rules with proper metadata
    enhanceRulesWithMetadata();

    // Group rules by impact level
    groupRulesByImpact();

    // Update rule cards array after DOM changes
    ruleCards = Array.from(document.querySelectorAll(".rule-card"));

    // Setup search functionality
    if (searchInput) {
      searchInput.addEventListener("input", handleSearch);
      searchInput.addEventListener("keydown", handleSearchKeydown);
    }

    // Setup navigation
    setupNavigation();

    // Setup hash navigation for direct links
    setupHashNavigation();

    // Initial count update
    updateSearchResults();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    console.log("Guidance page initialized");
  }

  /**
   * Handle search input
   */
  function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    filterRules();
    updateSearchResults();
  }

  /**
   * Handle search keyboard shortcuts
   */
  function handleSearchKeydown(event) {
    if (event.key === "Escape") {
      searchInput.value = "";
      searchTerm = "";
      filterRules();
      updateSearchResults();
    }
  }

  /**
   * Filter rules based on search term
   */
  function filterRules() {
    const categories = new Set();
    visibleRulesCount = 0;

    // Filter rule cards
    ruleCards.forEach((card) => {
      const ruleId = card.dataset.ruleId;
      const text = card.textContent.toLowerCase();
      const isVisible = !searchTerm || text.includes(searchTerm);

      if (isVisible) {
        card.classList.remove("hidden");
        visibleRulesCount++;

        // Track which categories have visible rules
        const categorySection = card.closest(".category-section");
        if (categorySection) {
          categories.add(categorySection);
        }
      } else {
        card.classList.add("hidden");
      }
    });

    // Show/hide categories based on whether they have visible rules
    document.querySelectorAll(".category-section").forEach((section) => {
      if (!searchTerm || categories.has(section)) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    });

    // Filter rule details for direct access
    allRules.forEach((rule) => {
      const ruleId = rule.dataset.ruleId;
      const text = rule.textContent.toLowerCase();
      const isVisible = !searchTerm || text.includes(searchTerm);

      if (isVisible) {
        rule.classList.remove("hidden");
      } else {
        rule.classList.add("hidden");
      }
    });
  }

  /**
   * Update search results count and announce to screen readers
   */
  function updateSearchResults() {
    if (!searchResultsCount) return;

    const totalRules = ruleCards.length;

    if (searchTerm) {
      const message = `${visibleRulesCount} of ${totalRules} rules found`;
      searchResultsCount.textContent = message;
      searchResultsCount.style.display = "block";

      // Announce to screen readers
      announceToScreenReader(message);
    } else {
      searchResultsCount.textContent = `${totalRules} rules`;
      searchResultsCount.style.display = "block";
    }
  }

  /**
   * Announce message to screen readers
   */
  function announceToScreenReader(message) {
    // Create a temporary element for screen reader announcement
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Setup navigation functionality
   */
  function setupNavigation() {
    // Smooth scrolling for anchor links
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      event.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        // Hide all rule details first
        allRules.forEach((rule) => {
          if (rule.id !== targetId) {
            rule.style.display = "none";
          }
        });

        // Show the target rule detail if it's a rule
        if (targetId.startsWith("rule-")) {
          targetElement.style.display = "block";
        }

        // Scroll to target
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Focus management for accessibility
        if (targetElement.tabIndex === -1) {
          targetElement.tabIndex = -1;
        }
        targetElement.focus();
      }
    });
  }

  /**
   * Setup hash navigation for direct links
   */
  function setupHashNavigation() {
    // Handle initial hash
    handleHashChange();

    // Handle hash changes
    window.addEventListener("hashchange", handleHashChange);
  }

  /**
   * Handle hash changes for navigation
   */
  function handleHashChange() {
    const hash = window.location.hash.substring(1);

    if (hash.startsWith("rule-")) {
      // Show specific rule detail
      allRules.forEach((rule) => {
        if (rule.id === hash) {
          rule.style.display = "block";

          // Scroll to rule after a brief delay to ensure it's visible
          setTimeout(() => {
            rule.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
        } else {
          rule.style.display = "none";
        }
      });
    } else {
      // Hide all rule details, show overview
      allRules.forEach((rule) => {
        rule.style.display = "none";
      });
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      // Focus search with Ctrl/Cmd + F
      if ((event.ctrlKey || event.metaKey) && event.key === "f") {
        event.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // ESC to close rule details and return to overview
      if (event.key === "Escape") {
        // Only if search is not focused
        if (document.activeElement !== searchInput) {
          window.location.hash = "#all-rules";
        }
      }
    });
  }

  /**
   * Utility function to get rule by ID
   */
  function getRuleById(ruleId) {
    return allRules.find((rule) => rule.dataset.ruleId === ruleId);
  }

  /**
   * Utility function to highlight search terms in text
   */
  function highlightSearchTerms(text, term) {
    if (!term) return text;

    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, "<mark>$1</mark>");
  }

  /**
   * Update rules with enhanced metadata from axe-core
   */
  function enhanceRulesWithMetadata() {
    console.log("[Alerts] Enhancing rules with axe-core metadata...");

    // No need for manual rule mapping - axe-core provides proper impact levels
    // The rules-metadata.json file now contains accurate impact classifications:
    // - Critical: 22 rules (complete blockers)
    // - Serious: 51 rules (significant barriers)
    // - Moderate: 17 rules (important impediments)
    // - Minor: 14 rules (best practices)

    // Update each rule card with proper impact icon from metadata
    ruleCards.forEach((card) => {
      const ruleId = card.dataset.ruleId;
      const impactSpan = card.querySelector(".rule-impact");

      if (impactSpan && window.ImpactIcons) {
        // Get impact level from card's existing data (loaded from metadata)
        const impactClass = Array.from(card.classList).find((cls) =>
          cls.startsWith("impact-")
        );
        const currentImpact = impactClass
          ? impactClass.replace("impact-", "")
          : "unknown";

        if (currentImpact !== "unknown") {
          // Replace text with icon + text
          const icon = window.ImpactIcons.getIcon(currentImpact, { size: 16 });
          impactSpan.innerHTML = `${icon} <span class="impact-text">${currentImpact}</span>`;
        }
      }
    });

    console.log(
      "[Alerts] Rule enhancement complete - using axe-core impact levels"
    );
  }

  /**
   * Group rules by impact level for better organization
   */
  function groupRulesByImpact() {
    const rulesContainer = document.querySelector(".rules-grid");
    if (!rulesContainer) return;

    const rulesByImpact = {
      critical: [],
      serious: [],
      moderate: [],
      minor: [],
      unknown: [],
    };

    // Group rules by their impact level
    ruleCards.forEach((card) => {
      const impactClass = Array.from(card.classList).find((cls) =>
        cls.startsWith("impact-")
      );
      const impact = impactClass
        ? impactClass.replace("impact-", "")
        : "unknown";
      rulesByImpact[impact].push(card);
    });

    // Create impact sections
    rulesContainer.innerHTML = "";

    ["critical", "serious", "moderate", "minor", "unknown"].forEach(
      (impact) => {
        const rules = rulesByImpact[impact];
        if (rules.length === 0) return;

        const sectionElement = document.createElement("div");
        sectionElement.className = `impact-section impact-${impact}`;
        sectionElement.id = `impact-${impact}`;

        const headerElement = document.createElement("h3");
        headerElement.className = "impact-header";

        if (window.ImpactIcons && impact !== "unknown") {
          const iconWithLabel = window.ImpactIcons.getIconWithLabel(impact, {
            size: 20,
          });
          headerElement.innerHTML = `${iconWithLabel} <span class="rule-count">(${rules.length} rules)</span>`;
        } else {
          headerElement.innerHTML = `${
            impact.charAt(0).toUpperCase() + impact.slice(1)
          } <span class="rule-count">(${rules.length} rules)</span>`;
        }

        const gridElement = document.createElement("div");
        gridElement.className = "rules-grid-section";

        rules.forEach((rule) => {
          gridElement.appendChild(rule);
        });

        sectionElement.appendChild(headerElement);
        sectionElement.appendChild(gridElement);
        rulesContainer.appendChild(sectionElement);
      }
    );

    // Update navigation counts
    updateNavigationCounts(rulesByImpact);
  }

  /**
   * Update navigation links with actual rule counts
   */
  function updateNavigationCounts(rulesByImpact) {
    const totalRules = Object.values(rulesByImpact).reduce(
      (sum, rules) => sum + rules.length,
      0
    );

    // Update navigation links
    const navLinks = document.querySelectorAll(".guidance-nav a");
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      let count = 0;

      if (href === "#all-rules") {
        count = totalRules;
        link.textContent = `All Rules (${count})`;
      } else if (href.startsWith("#impact-")) {
        const impact = href.replace("#impact-", "");
        count = rulesByImpact[impact] ? rulesByImpact[impact].length : 0;

        if (count > 0) {
          if (window.ImpactIcons) {
            const icon = window.ImpactIcons.getIcon(impact, { size: 14 });
            const impactData = window.ImpactIcons.getImpactData(impact);
            link.innerHTML = `${icon} ${impactData.displayName} Issues (${count})`;
          } else {
            link.textContent = `${
              impact.charAt(0).toUpperCase() + impact.slice(1)
            } Issues (${count})`;
          }
        } else {
          link.style.display = "none";
        }
      }
    });
  }

  /**
   * Public API for external access
   */
  window.GuidancePage = {
    search: function (term) {
      if (searchInput) {
        searchInput.value = term;
        searchTerm = term.toLowerCase().trim();
        filterRules();
        updateSearchResults();
      }
    },

    showRule: function (ruleId) {
      window.location.hash = `#rule-${ruleId}`;
    },

    clearSearch: function () {
      if (searchInput) {
        searchInput.value = "";
        searchTerm = "";
        filterRules();
        updateSearchResults();
      }
    },

    getVisibleRulesCount: function () {
      return visibleRulesCount;
    },
  };

  // Initialize when script loads
  initialize();
})();
