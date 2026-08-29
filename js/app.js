import { Circuit } from "./circuit-core.js";
import { buildPrimeDemo } from "./circuit-modules.js";
const projectBlurbs = {
  "elementary-cpu": {
    title: "Elementary CPU",
    html: `<p>A 4-bit CPU in VHDL with ROM-based instruction fetch and a registered ALU, achieving 250 MHz Fmax in 57 logic elements and 17 registers on an Intel MAX 10 FPGA. The control unit is a state machine that decodes 6 opcodes into datapath control words, including multi-state instructions for data loads and jumps. Every instruction was verified in simulation and on hardware using hand-assembled test programs.</p>
           <p><a href="/projects/elementary-cpu/">Open project page →</a></p>`,
  },
  "remote-led-switch": {
    title: "Battery-Powered Remote LED Switch",
    html: `<p>ESP32 switch on a 100mAh lithium polymer battery with USB-C charge and discharge. Tuned hibernation and duty cycles to reach 12 hours of battery life with under a second of response time, and used ESP Rainmaker for global GPIO control and Wi-Fi management.</p>
           <p><a href="/projects/remote-led-switch/">Open project page →</a></p>`,
  },
  "remote-lcd": {
    title: "Remote LCD",
    html: `<p>Raspberry Pi Zero 2 W driving a 1602 I2C LCD as a remote serial display. Scripts for ASCII and custom glyphs, long-distance SSH over Tailscale, and a 3D-printed PLA housing.</p>
           <p><a href="/projects/remote-lcd/">Open project page →</a></p>`,
  },
  graphuf: {
    title: "GraphUF",
    html: `<p>Flask web app that supplements the UF course catalog by showing which courses a given course eventually unlocks. Scraped and cleaned the UF Courses API to process 8M+ unique data points, then built a transitive closure over an 80k-node DAG for O(1) reachability lookups. Built with two teammates over Git, pull requests, and code review.</p>
           <p><a href="/projects/graphuf/">Open project page →</a></p>`,
  },
  tmodloader: {
    title: "tModLoader",
    html: `<p>Open source contribution to the official tModLoader repository (10M+ downloads). Independently tracked down and fixed a C# rendering bug that caused some objects to appear misaligned, then authored and merged the pull request.</p>
           <p><a href="/projects/tmodloader/">Open project page →</a></p>`,
  },
  foodcast: {
    title: "Foodcast",
    html: `<p>Progressive web app built to remove barriers to food budgeting. Served as project manager for an independent software engineering team, guiding design choices; wired up the Walmart Partner API for item search and added threading that cut search response time by 13x on average.</p>
           <p><a href="/projects/foodcast/">Open project page →</a></p>`,
  },
};

(function () {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  const panelTitle = document.getElementById("project-panel-title");
  const panelContent = document.getElementById("project-panel-content");

  function renderProject(tab) {
    if (!panelTitle || !panelContent) return;
    const data = projectBlurbs[tab.dataset.key];
    if (!data) return;
    panelTitle.textContent = data.title;
    panelContent.innerHTML = data.html;
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (panel) panel.setAttribute("aria-labelledby", tab.id);
  }

  if (tabs.length) {
    function activateTab(tab, setHash = true) {
      const targetId = tab.getAttribute("aria-controls");
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      panels.forEach((p) => (p.hidden = p.id !== targetId));
      renderProject(tab);
      if (setHash) {
        history.replaceState(null, "", "#" + targetId);
        tab.focus();
      }
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => activateTab(tab, true));
      tab.addEventListener("keydown", (e) => {
        const { key } = e;
        let idx = i;
        if (key === "ArrowRight" || key === "ArrowDown") {
          idx = (i + 1) % tabs.length;
          e.preventDefault();
          tabs[idx].focus();
        }
        if (key === "ArrowLeft" || key === "ArrowUp") {
          idx = (i - 1 + tabs.length) % tabs.length;
          e.preventDefault();
          tabs[idx].focus();
        }
        if (key === "Home") {
          e.preventDefault();
          tabs[0].focus();
        }
        if (key === "End") {
          e.preventDefault();
          tabs[tabs.length - 1].focus();
        }
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          activateTab(document.activeElement, true);
        }
      });
    });
    function initFromHash() {
      const id = location.hash.slice(1);
      const match = id && document.getElementById(id);
      if (match && match.getAttribute("role") === "tabpanel") {
        const tab = document.querySelector('[aria-controls="' + id + '"]');
        if (tab) activateTab(tab, false);
      } else {
        const initial =
          tabs.find((t) => t.getAttribute("aria-selected") === "true") ||
          tabs[0];
        if (initial) activateTab(initial, false);
      }
    }
    window.addEventListener("hashchange", initFromHash, { passive: true });
    initFromHash();

    // The tab strip scrolls horizontally on narrow screens. Flag which edges
    // still have content so the stylesheet can fade them.
    const strip = document.querySelector(".projects-tabs");
    if (strip) {
      const updateScrollHints = () => {
        const max = strip.scrollWidth - strip.clientWidth;
        strip.classList.toggle("can-scroll-left", strip.scrollLeft > 1);
        strip.classList.toggle("can-scroll-right", strip.scrollLeft < max - 1);
      };
      strip.addEventListener("scroll", updateScrollHints, { passive: true });
      window.addEventListener("resize", updateScrollHints, { passive: true });
      updateScrollHints();
    }
  }
})();

const svg = document.querySelector(".circuit");
const circuit = new Circuit(svg);

const mod1 = circuit.createGroup("demo1", {
  x: 0,
  y: 0,
  scale: 1.2,
  showFrame: false,
});

buildPrimeDemo(mod1);

// --- Center the module inside the SVG viewBox ---
function centerGroupInSVG(svgEl, group) {
  // Ensure everything is in the DOM before measuring
  circuit.render();

  const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
  const vbWidth = vb ? vb.width : svgEl.clientWidth;
  const vbHeight = vb ? vb.height : svgEl.clientHeight;
  const bbox = group._groupEl.getBBox();

  const s = group.scale;
  const tx = (vbWidth - s * bbox.width) / 2 - s * bbox.x;
  const ty = (vbHeight - s * bbox.height) / 2 - s * bbox.y;

  group.setTransform(tx, ty, s);
}

// Initial center, then keep it centered on resize
requestAnimationFrame(() => centerGroupInSVG(svg, mod1)); // Block selection and dblclick selection globally (except in editable fields)
const allowSelection = (el) =>
  el.closest('input, textarea, [contenteditable="true"], .allow-select');

const kill = (e) => {
  if (!allowSelection(e.target)) e.preventDefault();
};

// Capture so we win over default page behavior
document.addEventListener("selectstart", kill, true);
document.addEventListener("dblclick", kill, true);
window.addEventListener("resize", () => centerGroupInSVG(svg, mod1), {
  passive: true,
});
