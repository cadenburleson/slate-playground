/**
 * Slate CMS Snippet
 * Paste into your site's <head>:
 *   <script src="https://cdn.slate.app/s.js" data-site-id="YOUR_TOKEN" defer></script>
 */
(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  // Resolve site id with override priority:
  //   1. ?slate_site_id=<token> in the URL (persists to localStorage)
  //   2. localStorage("slate_site_id")
  //   3. data-site-id on the script tag
  // The override pattern lets you test against a live Slate site without
  // committing your snippet_token to the repo.
  var SITE_ID = (function () {
    try {
      var qs = new URLSearchParams(window.location.search).get("slate_site_id");
      if (qs) {
        localStorage.setItem("slate_site_id", qs);
        return qs;
      }
      var stored = localStorage.getItem("slate_site_id");
      if (stored) return stored;
    } catch (e) {}
    return script.getAttribute("data-site-id");
  })();

  var API = "https://dmmwptwopitvjeyweqrv.supabase.co/functions/v1";
  var MANIFEST_KEY = "slate_manifest_" + SITE_ID;
  var HEADER_KEY = "slate_header_" + SITE_ID;
  var FOOTER_KEY = "slate_footer_" + SITE_ID;

  if (!SITE_ID || SITE_ID === "YOUR_SITE_ID") return;

  // ── DOM Helpers ─────────────────────────────────────────────────────────────

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function text(str) {
    return document.createTextNode(str || "");
  }

  function append(parent) {
    for (var i = 1; i < arguments.length; i++) {
      parent.appendChild(arguments[i]);
    }
    return parent;
  }

  // ── Block Renderers (DOM-based, no innerHTML) ────────────────────────────────

  function renderBlock(block) {
    switch (block.type) {
      case "heading": {
        var h = el("h" + block.level, "slate-heading slate-h" + block.level);
        h.textContent = block.text || "";
        return h;
      }
      case "paragraph": {
        var p = el("p", "slate-p");
        p.textContent = block.text || "";
        return p;
      }
      case "quote": {
        var bq = el("blockquote", "slate-quote");
        bq.textContent = block.text || "";
        return bq;
      }
      case "list": {
        var listEl = el(block.ordered ? "ol" : "ul", "slate-list");
        (block.items || []).forEach(function (item) {
          var li = el("li");
          li.textContent = item;
          listEl.appendChild(li);
        });
        return listEl;
      }
      case "image": {
        var fig = el("figure", "slate-figure");
        var img = el("img", "slate-img");
        img.src = block.src || "";
        img.alt = block.alt || "";
        fig.appendChild(img);
        if (block.caption) {
          var cap = el("figcaption", "slate-caption");
          cap.textContent = block.caption;
          fig.appendChild(cap);
        }
        return fig;
      }
      case "divider": {
        return el("hr", "slate-hr");
      }
      case "service": {
        var card = el("div", "slate-service");
        var body = el("div", "slate-service-body");
        var h3 = el("h3", "slate-service-title");
        h3.textContent = block.title || "";
        var desc = el("p", "slate-service-desc");
        desc.textContent = block.description || "";
        body.appendChild(h3);
        body.appendChild(desc);
        card.appendChild(body);
        if (block.stripe_link) {
          var btn = el("a", "slate-service-btn");
          btn.textContent = block.label || "Buy now";
          btn.href = block.stripe_link;
          btn.target = "_blank";
          btn.rel = "noopener noreferrer";
          card.appendChild(btn);
        }
        return card;
      }
      default:
        return null;
    }
  }

  function renderBlocks(blocks, container) {
    (blocks || []).forEach(function (block) {
      var node = renderBlock(block);
      if (node) container.appendChild(node);
    });
  }

  // ── Content Area Detection ──────────────────────────────────────────────────

  var SELECTOR_PRIORITY = [
    "main",
    "article",
    "[role='main']",
    ".post-content",
    ".entry-content",
    ".page-content",
    ".wp-content",
    ".article-content",
    ".content-area",
    ".w-richtext",
    "#content",
    "#main",
  ];

  function findContentArea() {
    for (var i = 0; i < SELECTOR_PRIORITY.length; i++) {
      var found = document.querySelector(SELECTOR_PRIORITY[i]);
      if (found) return found;
    }
    return highestDensityDiv();
  }

  function highestDensityDiv() {
    var divs = document.querySelectorAll("div");
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < divs.length; i++) {
      var div = divs[i];
      var words = (div.innerText || "").trim().split(/\s+/).length;
      var height = div.offsetHeight || 1;
      var score = words / height;
      if (score > bestScore && words > 50) {
        bestScore = score;
        best = div;
      }
    }
    return best || document.body;
  }

  // ── Meta Injection ──────────────────────────────────────────────────────────

  function setMeta(selector, attr, value) {
    var metaEl = document.querySelector(selector);
    if (!metaEl) {
      metaEl = document.createElement("meta");
      document.head.appendChild(metaEl);
    }
    metaEl.setAttribute(attr, value);
  }

  function injectMeta(content) {
    if (content.title) {
      document.title = content.title;
      setMeta("meta[property='og:title']", "property", "og:title");
      document.querySelector("meta[property='og:title']").setAttribute("content", content.title);
    }
    if (content.meta_description) {
      setMeta("meta[name='description']", "name", "description");
      document.querySelector("meta[name='description']").setAttribute("content", content.meta_description);
    }
    if (content.og_image) {
      setMeta("meta[property='og:image']", "property", "og:image");
      document.querySelector("meta[property='og:image']").setAttribute("content", content.og_image);
    }
  }

  // ── Shell Capture (header/footer for new routes) ─────────────────────────────

  function captureShell() {
    try {
      var headerEl = document.querySelector("header") || document.querySelector("[role='banner']");
      var footerEl = document.querySelector("footer") || document.querySelector("[role='contentinfo']");
      if (headerEl) localStorage.setItem(HEADER_KEY, headerEl.outerHTML);
      if (footerEl) localStorage.setItem(FOOTER_KEY, footerEl.outerHTML);
    } catch (e) {}
  }

  // ── Main Injection ──────────────────────────────────────────────────────────

  function injectContent(content, isNewRoute) {
    var wrapper = el("div", "slate-content");
    renderBlocks(content.content_json, wrapper);

    if (isNewRoute) {
      // For brand-new routes: rebuild page from cached shell + CMS content
      var main = el("main", "slate-main");
      main.appendChild(wrapper);
      var newBody = document.createElement("body");
      try {
        var hHtml = localStorage.getItem(HEADER_KEY);
        var fHtml = localStorage.getItem(FOOTER_KEY);
        // Use DOMParser to safely parse stored shell HTML
        var parser = new DOMParser();
        if (hHtml) {
          var hDoc = parser.parseFromString(hHtml, "text/html");
          var hNode = hDoc.body.firstChild;
          if (hNode) newBody.appendChild(document.adoptNode(hNode));
        }
        newBody.appendChild(main);
        if (fHtml) {
          var fDoc = parser.parseFromString(fHtml, "text/html");
          var fNode = fDoc.body.firstChild;
          if (fNode) newBody.appendChild(document.adoptNode(fNode));
        }
      } catch (e) {
        newBody.appendChild(main);
      }
      document.body.parentNode.replaceChild(newBody, document.body);
    } else {
      var area = findContentArea();
      while (area.firstChild) area.removeChild(area.firstChild);
      area.appendChild(wrapper);
    }

    injectMeta(content);
    captureShell();
  }

  // ── API Calls ───────────────────────────────────────────────────────────────

  function fetchManifest(cb) {
    var cached = sessionStorage.getItem(MANIFEST_KEY);
    if (cached) {
      try { return cb(JSON.parse(cached)); } catch (e) {}
    }
    fetch(API + "/manifest?site=" + encodeURIComponent(SITE_ID))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        sessionStorage.setItem(MANIFEST_KEY, JSON.stringify(data));
        cb(data);
      })
      .catch(function () {});
  }

  function fetchContent(slug, cb) {
    fetch(API + "/content?site=" + encodeURIComponent(SITE_ID) + "&slug=" + encodeURIComponent(slug))
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function () {});
  }

  // ── Main ────────────────────────────────────────────────────────────────────

  function init() {
    var path = window.location.pathname;
    captureShell();

    fetchManifest(function (manifest) {
      if (!manifest || !manifest.slugs) return;
      var entry = null;

      for (var i = 0; i < manifest.slugs.length; i++) {
        if (manifest.slugs[i].slug === path) {
          entry = manifest.slugs[i];
          break;
        }
      }

      if (!entry) return;

      fetchContent(path, function (content) {
        if (!content || !content.content_json) return;
        injectContent(content, !entry.existsOnSite);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
