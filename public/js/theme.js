// Applies the saved theme before the page paints, so there's no flash. Light is the default.
(function () {
  var t = "light";
  try { t = localStorage.getItem("sparky-prep:theme") === "dark" ? "dark" : "light"; } catch (e) {}
  document.documentElement.setAttribute("data-theme", t);
})();
