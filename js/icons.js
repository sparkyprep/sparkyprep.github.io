// Sparky Prep icon set. Drawn for this site on a 24px grid: 1.75 stroke, round caps and joins,
// no fills except small accents, so every icon has the same weight next to text.
// Use: icon("bolt") returns an <svg> string. Pass a size as the second argument.

(function () {
  const P = {
    bolt: '<path d="M13.2 2.8 5.6 13.1h5.6l-1 8.1 7.7-10.4h-5.7z"/>',
    flame: '<path d="M12 21c-3.6 0-6.2-2.5-6.2-5.9 0-2.9 1.9-4.6 3.3-6.4.4 1.5 1.2 2.4 2.2 2.8-.3-3.3 1.1-6 3.4-7.9.3 2.6 1.4 4.3 2.6 5.8 1.1 1.4 1.9 3 1.9 5.2 0 3.6-3.1 6.4-7.2 6.4z"/><path d="M12 21c-1.6 0-2.8-1.2-2.8-2.8 0-1.6 1.1-2.4 1.9-3.4.3.9.8 1.4 1.4 1.6.2-1.2.7-2 1.4-2.6.6 1 1.1 2 1.1 3.3 0 2.2-1.3 3.9-3 3.9z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
    review: '<path d="M19.5 12a7.5 7.5 0 0 1-13.1 5"/><path d="M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M17.9 3.6v3.8h-3.8"/><path d="M6.1 20.4v-3.8h3.8"/>',
    calc: '<rect x="5" y="2.8" width="14" height="18.4" rx="2.4"/><path d="M8.2 6.6h7.6"/><path d="M8.4 11h.01M12 11h.01M15.6 11h.01M8.4 14.4h.01M12 14.4h.01M8.4 17.8h.01M12 17.8h.01"/><path d="M15.6 14.4v3.4"/>',
    clock: '<circle cx="12" cy="13" r="7.8"/><path d="M12 9v4.2l2.7 1.7"/><path d="M9.6 2.8h4.8"/><path d="m18.6 6.2 1.3-1.3"/>',
    alert: '<path d="M10.4 4.2 2.9 17.6A1.9 1.9 0 0 0 4.6 20.4h14.8a1.9 1.9 0 0 0 1.7-2.8L13.6 4.2a1.9 1.9 0 0 0-3.2 0z"/><path d="M12 9.4v4.3"/><path d="M12 16.9h.01"/>',
    book: '<path d="M4.4 5.4c0-1.1.9-2 2-2h11.2v14.2H6.4a2 2 0 0 0-2 2z"/><path d="M4.4 19.6a2 2 0 0 0 2 2h11.2v-4"/><path d="M8.2 7.6h5.6"/>',
    trophy: '<path d="M7.6 3.6h8.8v5.2a4.4 4.4 0 0 1-8.8 0z"/><path d="M7.6 5.6H4.4v1.2a3.4 3.4 0 0 0 3.4 3.4"/><path d="M16.4 5.6h3.2v1.2a3.4 3.4 0 0 1-3.4 3.4"/><path d="M12 13.2v3.6"/><path d="M8.4 20.4h7.2l-.8-3.6H9.2z"/>',
    star: '<path d="m12 3.4 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.8l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    check: '<path d="m4.8 12.6 4.6 4.6 9.8-10"/>',
    x: '<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>',
    chevron: '<path d="m9.4 5.6 6.4 6.4-6.4 6.4"/>',
    back: '<path d="M14.6 5.6 8.2 12l6.4 6.4"/>',
    arrow: '<path d="M4.8 12h14.4"/><path d="m13.6 6.4 5.6 5.6-5.6 5.6"/>',
    user: '<circle cx="12" cy="8.2" r="4"/><path d="M4.4 20.4c.9-3.6 3.9-5.8 7.6-5.8s6.7 2.2 7.6 5.8"/>',
    logout: '<path d="M14.4 4.4H18a1.6 1.6 0 0 1 1.6 1.6v12a1.6 1.6 0 0 1-1.6 1.6h-3.6"/><path d="M9.6 16.6 4.8 12l4.8-4.6"/><path d="M4.8 12h10.4"/>',
    eye: '<path d="M2.6 12S6 5.6 12 5.6 21.4 12 21.4 12 18 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeoff: '<path d="M4.2 4.2 19.8 19.8"/><path d="M9.9 6c.7-.2 1.4-.3 2.1-.3 6 0 9.4 6.4 9.4 6.4a16.4 16.4 0 0 1-2.6 3.4"/><path d="M6.6 7.7A16.6 16.6 0 0 0 2.6 12s3.4 6.4 9.4 6.4c1.5 0 2.9-.4 4.1-1"/><path d="M10 10.2a2.8 2.8 0 0 0 3.8 3.8"/>',
    lightbulb: '<path d="M9 17.6h6"/><path d="M9.8 20.8h4.4"/><path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.3c.5.4.8 1 .8 1.6v1.9h5.6v-1.9c0-.6.3-1.2.8-1.6A6.2 6.2 0 0 0 12 2.8z"/>',
    layers: '<path d="m12 3.2 8.8 4.6L12 12.4 3.2 7.8z"/><path d="m3.2 12 8.8 4.6 8.8-4.6"/><path d="m3.2 16.2 8.8 4.6 8.8-4.6"/>',
    shuffle: '<path d="M3.6 6.8h3.2c4.6 0 5.8 10.4 10.4 10.4h3.2"/><path d="M3.6 17.2h3.2c1.6 0 2.7-1.3 3.6-3"/><path d="M13.8 9.8c.9-1.7 2-3 3.4-3h3.2"/><path d="m18.2 4.6 2.2 2.2-2.2 2.2"/><path d="m18.2 15 2.2 2.2-2.2 2.2"/>',
    chart: '<path d="M3.6 20.4h16.8"/><rect x="5.4" y="12" width="3.2" height="8.4" rx=".8"/><rect x="10.4" y="7.2" width="3.2" height="13.2" rx=".8"/><rect x="15.4" y="3.6" width="3.2" height="16.8" rx=".8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M5.4 18.6l1.5-1.5M17.1 6.9l1.5-1.5"/>',
    moon: '<path d="M19.8 14.6A8 8 0 0 1 9.4 4.2a8 8 0 1 0 10.4 10.4z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    lock: '<rect x="4.8" y="10.4" width="14.4" height="10.4" rx="2"/><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8"/>',
    users: '<circle cx="9" cy="8.4" r="3.4"/><path d="M2.8 19.6c.7-3 3.1-4.8 6.2-4.8s5.5 1.8 6.2 4.8"/><path d="M15.6 5.2a3.4 3.4 0 0 1 0 6.4"/><path d="M17.4 14.9c2 .6 3.3 2.2 3.8 4.7"/>',
    // unit icons
    shield: '<path d="M12 2.8 4.8 5.6v5.6c0 4.6 3 8.4 7.2 9.8 4.2-1.4 7.2-5.2 7.2-9.8V5.6z"/><path d="m8.8 12 2.3 2.3 4.1-4.3"/>',
    wrench: '<path d="M14.6 3.4a5 5 0 0 0-5.8 6.6l-5.6 5.6a2.1 2.1 0 0 0 3 3l5.6-5.6a5 5 0 0 0 6.6-5.8l-3 3-2.8-.8-.8-2.8z"/>',
    resistor: '<path d="M2.4 12h3.4l1.4-4 2.4 8 2.4-8 2.4 8 2.4-8 1.4 4h3.4"/>',
    sine: '<path d="M2.6 12c1.6-5.6 3.6-7.6 5.2-7.6s2.6 1.6 4.2 7.6 2.6 7.6 4.2 7.6 3.6-2 5.2-7.6"/><path d="M2.6 12h18.8" opacity=".35"/>',
    scales: '<path d="M12 3.6v16.8"/><path d="M7.2 20.4h9.6"/><path d="M4.4 7.2h15.2"/><path d="M12 5.2v2"/><path d="m6.4 7.2-3 6.6a3 3 0 0 0 6 0z"/><path d="m17.6 7.2-3 6.6a3 3 0 0 0 6 0z"/>',
    cable: '<path d="M4.4 4.4v4.4a3.6 3.6 0 0 0 3.6 3.6h8a3.6 3.6 0 0 1 3.6 3.6v4.4"/><rect x="2.4" y="2.4" width="4" height="3.2" rx=".8"/><path d="M3.4 2.4V1.2M5.4 2.4V1.2"/><rect x="17.6" y="18.4" width="4" height="3.2" rx=".8"/>',
    breaker: '<rect x="6.4" y="2.8" width="11.2" height="18.4" rx="2"/><rect x="9.6" y="8" width="4.8" height="8" rx="1.2"/><path d="M12 8v3.2"/><path d="M9.2 5.4h5.6"/>',
    plug: '<path d="M8.4 2.8v4.4M15.6 2.8v4.4"/><path d="M6 7.2h12v3.2a6 6 0 0 1-12 0z"/><path d="M12 16.4v4.8"/>',
    hat: '<path d="M3.2 16.4h17.6"/><path d="M5 16.4a7 7 0 0 1 14 0"/><path d="M10.4 9.6V6.4a1.6 1.6 0 0 1 3.2 0v3.2"/><path d="M4 16.4v1.6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.6"/>',
  };

  window.icon = function (name, size = 20, cls = "") {
    const body = P[name] || P.bolt;
    return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  };

  // The logo mark: a rounded tile with a bolt that doubles as a rising step (progress).
  window.logoMark = function (size = 30) {
    return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
      <rect class="lm-bg" width="32" height="32" rx="8"/>
      <path d="M17.6 5.6 9.4 17.2h6.2l-1.4 9.2 8.4-11.8h-6.3z" class="lm-bolt"/>
    </svg>`;
  };
})();
