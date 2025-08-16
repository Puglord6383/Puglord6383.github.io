// app.js
import { Circuit } from './circuit-core.js';
import { buildPrimeDemo } from './circuit-modules.js';

// Tabs / a11y navigation (unchanged)
(function(){
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  if (tabs.length) {
    function activateTab(tab, setHash = true) {
      const targetId = tab.getAttribute('aria-controls');
      tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
      panels.forEach(p => p.hidden = (p.id !== targetId));
      if (setHash) history.replaceState(null, '', '#' + targetId);
      tab.focus();
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activateTab(tab, true));
      tab.addEventListener('keydown', (e) => {
        const { key } = e; let idx = i;
        if (key === 'ArrowRight' || key === 'ArrowDown') { idx = (i + 1) % tabs.length; e.preventDefault(); tabs[idx].focus(); }
        if (key === 'ArrowLeft'  || key === 'ArrowUp')   { idx = (i - 1 + tabs.length) % tabs.length; e.preventDefault(); tabs[idx].focus(); }
        if (key === 'Home') { e.preventDefault(); tabs[0].focus(); }
        if (key === 'End')  { e.preventDefault(); tabs[tabs.length - 1].focus(); }
        if (key === 'Enter' || key === ' ') { e.preventDefault(); activateTab(document.activeElement, true); }
      });
    });
    function initFromHash(){
      const id = location.hash.slice(1);
      const match = id && document.getElementById(id);
      if (match && match.getAttribute('role') === 'tabpanel') {
        const tab = document.querySelector('[aria-controls="' + id + '"]');
        if (tab) activateTab(tab, false);
      } else {
        const initial = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
        if (initial) activateTab(initial, false);
      }
    }
    window.addEventListener('hashchange', initFromHash, { passive: true });
    initFromHash();
  }
})();

const svg = document.querySelector('.circuit');
const circuit = new Circuit(svg);

const mod1 = circuit.createGroup('demo1', {
  x: 0, y: 0, scale: 1.2, showFrame: false
});

buildPrimeDemo(mod1);

// --- Center the module inside the SVG viewBox ---
function centerGroupInSVG(svgEl, group) {
  // Ensure everything is in the DOM before measuring
  circuit.render();

  const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
  const vbWidth  = vb ? vb.width  : svgEl.clientWidth;
  const vbHeight = vb ? vb.height : svgEl.clientHeight;
  const bbox = group._groupEl.getBBox();

  const s = group.scale;
  const tx = (vbWidth  - s * bbox.width)  / 2 - s * bbox.x;
  const ty = (vbHeight - s * bbox.height) / 2 - s * bbox.y;

  group.setTransform(tx, ty, s);
}

// Initial center, then keep it centered on resize
requestAnimationFrame(() => centerGroupInSVG(svg, mod1));// Block selection and dblclick selection globally (except in editable fields)
const allowSelection = (el) =>
  el.closest('input, textarea, [contenteditable="true"], .allow-select');

const kill = (e) => {
  if (!allowSelection(e.target)) e.preventDefault();
};

// Capture so we win over default page behavior
document.addEventListener('selectstart', kill, true);
document.addEventListener('dblclick', kill, true);
window.addEventListener('resize', () => centerGroupInSVG(svg, mod1), { passive: true });
