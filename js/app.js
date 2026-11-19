import { Circuit } from "./circuit-core.js";
import { buildPrimeDemo } from "./circuit-modules.js";
const projectBlurbs = {
  "fpga-am-radio": {
    title: "FPGA AM Radio Receiver",
    html: `<p class="project-stack">SystemVerilog, C, Python, Quartus, QuestaSim &middot; November 2026</p>
           <ul>
             <li>Designed a 16-channel AM radio receiver on an Intel MAX 10 FPGA that samples at 64 MHz</li>
             <li>Isolated each station with I/Q mixing and CIC/FIR decimation filters, cutting 64M samples/s to 16k</li>
             <li>Reused one I and one Q multiplier for all 128 FIR taps of all 16 channels, achieving 81.3 MHz Fmax (64 MHz clk) with 37,624 LEs</li>
             <li>Linked the FPGA to an ESP32 over SPI and wrote C firmware to stream audio and tune over Wi-Fi</li>
           </ul>
           <p><a href="/projects/fpga-am-radio/">Open project page →</a></p>`,
  },
  "elementary-cpu": {
    title: "Elementary CPU",
    html: `<p class="project-stack">VHDL, Quartus &middot; April 2026</p>
           <ul>
             <li>Designed a 4-bit CPU with ROM-based instruction fetch and a registered ALU, achieving 250 MHz Fmax in 57 logic elements and 17 registers on an Intel MAX 10 FPGA</li>
             <li>Implemented the control unit in VHDL as a state machine decoding 6 opcodes into datapath control words, including multi-state instructions for data loads and jumps</li>
             <li>Verified all instructions in simulation and on hardware using hand-assembled test programs</li>
           </ul>
           <p><a href="/projects/elementary-cpu/">Open project page →</a></p>`,
  },
  "remote-led-switch": {
    title: "Battery-Powered Remote LED Switch",
    html: `<p class="project-stack">ESP32, C, Soldering</p>
           <ul>
             <li>Used 100mAh lithium polymer battery to enable charging and discharging via USB-C</li>
             <li>Optimized hibernation and duty cycles; achieved 12-hour battery life with &lt;1s response time</li>
             <li>Implemented ESP Rainmaker to enable global access to GPIO and manage Wi-Fi connectivity</li>
           </ul>
           <p><a href="/projects/remote-led-switch/">Open project page →</a></p>`,
  },
  "remote-lcd": {
    title: "Remote LCD",
    html: `<p>Raspberry Pi Zero 2W + 1602 I2C LCD for a remote serial display. Arduino IDE scripts for ASCII/custom glyphs, long-distance SSH via Tailscale, and a 3D-printed PLA housing.</p>
           <p><a href="/projects/remote-lcd/">Open project page →</a></p>`,
  },
  graphuf: {
    title: "GraphUF",
    html: `<p class="project-stack">Flask, Git, Nginx, Python, Bash &middot; July 2025 - August 2025</p>
           <ul>
             <li>Supplemented UF course catalog with Flask web app to explore transitive course unlocks</li>
             <li>Collaborated with two teammates, handling Git merge conflicts, pull requests, and code reviews</li>
             <li>Processed 8M+ unique data points by scraping and cleaning UF Courses API</li>
             <li>Created transitive closure map of 80k-node DAG to achieve O(1) retrieval of reachable nodes</li>
           </ul>
           <p><a href="/projects/graphuf/">Open project page →</a></p>`,
  },
  tmodloader: {
    title: "tModLoader",
    html: `<p class="project-stack">C#, GitHub &middot; October 2025</p>
           <ul>
             <li>Authored and merged a PR to the official tModLoader repository (10M+ downloads)</li>
             <li>Independently fixed a C# rendering bug that caused some objects to appear misaligned</li>
           </ul>
           <p><a href="/projects/tmodloader/">Open project page →</a></p>`,
  },
  foodcast: {
    title: "Foodcast",
    html: `<p class="project-stack">Java, Spring Boot, React</p>
           <ul>
             <li>Served as Project Manager, guiding design choices for an independent software engineering team</li>
             <li>Leveraged the Walmart Partner API to power user-friendly item searching</li>
             <li>Implemented threading to speed up search query response time by 13x on average</li>
           </ul>
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
