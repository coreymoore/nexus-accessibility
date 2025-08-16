(function () {
  const stroke = 1.8;
  const cls = "icon-svg brand-icon";
  const base = {
    // Simplified plus icon (no box/gradient) for cleaner appearance and better alignment
    plus: `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="${
      stroke + 0.4
    }" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    clipboard: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><rect x='5' y='5' width='14' height='16' rx='3' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='M9 5c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2H9V5Z' stroke='currentColor' stroke-width='${stroke}' fill='none'/></svg>`,
    view: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M2.5 12s3.8-7 9.5-7 9.5 7 9.5 7-3.8 7-9.5 7-9.5-7-9.5-7Z' stroke='currentColor' stroke-width='${stroke}' fill='none' stroke-linejoin='round'/><circle cx='12' cy='12' r='3.5' stroke='currentColor' stroke-width='${stroke}' fill='none'/></svg>`,
    export: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M12 16V4' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/><path d='m7.5 8.5 4.5-4.5 4.5 4.5' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round' stroke-linejoin='round'/><path d='M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/></svg>`,
    trash: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M5 7h14' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/><path d='M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='M8 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='M11 11v6M13 11v6' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/></svg>`,
    append: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M6 4h7a2 2 0 0 1 2 2v3h3v9a2 2 0 0 1-2 2H9' stroke='currentColor' stroke-width='${stroke}' fill='none' stroke-linejoin='round'/><path d='M9 20H6a2 2 0 0 1-2-2v-9h11' stroke='currentColor' stroke-width='${stroke}' fill='none' stroke-linejoin='round'/><path d='M12 10v6M9 13h6' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/></svg>`,
    unsupported: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><circle cx='12' cy='12' r='9' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='m8.5 8.5 7 7' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/></svg>`,
    // New icons
    violations: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M12 3 3 7v4c0 5 3.5 9.5 9 11 5.5-1.5 9-6 9-11V7l-9-4Z' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='M12 8v5' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/><circle cx='12' cy='16' r='1' fill='currentColor'/></svg>`,
    passes: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><circle cx='12' cy='12' r='9' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='m8 12 3 3 5-6' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
    pages: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><rect x='5' y='3' width='10' height='14' rx='2' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='M9 7h4M9 11h4' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/><path d='M9 21h8a2 2 0 0 0 2-2V8' stroke='currentColor' stroke-width='${stroke}' fill='none'/></svg>`,
    close: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><circle cx='12' cy='12' r='10' stroke='currentColor' stroke-width='${stroke}' fill='none'/><path d='m9 9 6 6M15 9l-6 6' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round'/></svg>`,
    language: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M3 5h18M4 12h16M9 5c0 7 3 9 6 14M15 5c0 7-3 9-6 14' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
    refresh: `<svg viewBox='0 0 24 24' class='${cls}' aria-hidden='true'><path d='M4 4v6h6' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round' stroke-linejoin='round'/><path d='M20 20v-6h-6' stroke='currentColor' stroke-width='${stroke}' stroke-linecap='round' stroke-linejoin='round'/><path d='M5 15a8 8 0 0 0 13.5 2.5M19 9A8 8 0 0 0 5.5 6.5' stroke='currentColor' stroke-width='${stroke}' fill='none'/></svg>`,
  };
  window.PopupIcons = { get: (n) => base[n] || "", all: () => ({ ...base }) };
})();
