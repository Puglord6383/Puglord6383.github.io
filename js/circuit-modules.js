// circuit-modules.js

export function buildPrimeDemo(C){
  
  const S = 0.75; // compact gate size

  // --- Inputs stacked on the left (identical positions) ---
  C.addBit('A', 88, 164); // A.out y≈38
  C.addBit('B', 88, 234); // B.out y≈188
  C.addBit('C', 88, 310); // C.out y≈338
  C.addBit('D', 88, 385); // D.out y≈488

  // --- Gate columns (same coordinates as original) ---
  const COL   = { RAIL:200, AND1:300, AND2:406, OUT:510 };
  const RAILS = { A:COL.RAIL, B:COL.RAIL+20, C:COL.RAIL+40, D:COL.RAIL+60 };

  // Rail bookkeeping (tap Ys) + rendered rail <line> elements
  const taps = {
    A:[C.pin('A.out').y],
    B:[C.pin('B.out').y],
    C:[C.pin('C.out').y],
    D:[C.pin('D.out').y]
  };
  const railEls = [];

  // --- Helpers (ported 1:1) ---
  function feedFrom(sig, srcRef, destPin){
    const src = C.pin(srcRef);
    const dst = C.pin(destPin);
    const rx  = RAILS[sig];
    taps[sig].push(dst.y);
    const approachX = dst.x - dst.r - 6; // ensure last hop is horizontal
    C.addWire(srcRef, destPin, [
      { x: rx,        y: src.y },
      { x: rx,        y: dst.y },
      { x: approachX, y: dst.y }
    ]);
  }
  function run(fromRef, toRef, xMid){
    const a  = C.pin(fromRef), b = C.pin(toRef);
    const xm = xMid ?? Math.min(a.x,b.x) + 40;
    const approachX = b.x - b.r - 6;
    C.addWire(fromRef, toRef, [
      { x: xm,        y: a.y },
      { x: xm,        y: b.y },
      { x: approachX, y: b.y }
    ]);
  }
  function drawRails(){
    // rails live on this group's wires layer
    const layer = C._groupEl.querySelector('.wires');
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs)=> {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };
    [['A','A.out'],['B','B.out'],['C','C.out'],['D','D.out']].forEach(([sig,srcId])=>{
      const ys = taps[sig]; const y1 = Math.min(...ys), y2 = Math.max(...ys);
      const x = RAILS[sig];
      const rail = mk('line', { x1:x, y1:y1, x2:x, y2:y2, class:'wire' });
      layer.appendChild(rail);
      railEls.push({ el: rail, src: srcId });
    });
    // keep rails highlighted in sync with their source bits
    C.onRender(()=>{
      railEls.forEach(r=>{
        let p; try{ p = C.pin(r.src); }catch{ p = null; }
        if (p) r.el.classList.toggle('high', !!p.v);
      });
    });
  }

  // --- Base ANDs (unchanged logic/wiring) ---
  const AND1 = C.addAND('AND1', COL.AND1, 160, S);
  feedFrom('A','A.out', AND1.pins.inA);
  feedFrom('C','C.out', AND1.pins.inB);

  const AND2 = C.addAND('AND2', COL.AND1, 220, S);
  feedFrom('B','B.out', AND2.pins.inA);
  feedFrom('C','C.out', AND2.pins.inB);

  const AND3 = C.addAND('AND3', COL.AND1, 280, S);
  feedFrom('B','B.out', AND3.pins.inA);
  feedFrom('D','D.out', AND3.pins.inB);

  const AND4 = C.addAND('AND4', COL.AND1, 340, S);
  feedFrom('A','A.out', AND4.pins.inA);
  feedFrom('B','B.out', AND4.pins.inB);

  const AND4B = C.addAND('AND4B', COL.AND2 - 20, 361, S);
  run(AND4.pins.out, AND4B.pins.inA, COL.AND2-40);
  C.addWire('D.out', AND4B.pins.inB);

  const AND5 = C.addAND('AND5', COL.AND1, 424, S);
  feedFrom('B','B.out', AND5.pins.inA);
  feedFrom('C','C.out', AND5.pins.inB);

  const AND5B = C.addAND('AND5B', COL.AND2 - 20, 445, S);
  run(AND5.pins.out, AND5B.pins.inA, COL.AND2-40);
  feedFrom('D','D.out', AND5B.pins.inB);

  // Draw rails after all taps are known
  drawRails();

  // --- XOR Module 1: (B xor AND1) with the “behind node” routing preserved ---
  (function(){
    const h = 72*S;
    const yAND1 = C.pin(AND1.pins.out).y;
    const SHIFT = 40;
    const yIN1  = yAND1 - 40 - SHIFT;
    const xNot  = COL.AND2 + 120;

    const N_IN1 = C.addNOT('X1_NOT_IN1', xNot, yIN1 - h/2, S);
    const TOP_BEHIND = C.addJunction('X1_TOP_BEHIND', xNot - 30, yIN1);
    const b = C.pin('B.out');
    const pTop = C.pin(TOP_BEHIND);
    C.addWire('B.out', TOP_BEHIND, [
      {x:RAILS.B, y:b.y}, {x:RAILS.B, y:yIN1}, {x:pTop.x, y:yIN1}
    ]);
    C.addWire(TOP_BEHIND, N_IN1.pins.in, [{x:xNot-6, y:yIN1}]);

    const yA1 = yAND1 - SHIFT;
    const N_A1 = C.addNOT('X1_NOT_A1', xNot, yA1 - h/2, S);
    const BOT_BEHIND = C.addJunction('X1_BOT_BEHIND', xNot - 60, yA1);

    const out1 = C.pin(N_IN1.pins.out);
    const out2 = C.pin(N_A1.pins.out);

    const X1_AND_TOP = C.addAND('X1_AND_TOP', out1.x + 30, out1.y - 64*S, S);
    C.addWire(N_IN1.pins.out, X1_AND_TOP.pins.inB);

    const X1_AND_BOT = C.addAND('X1_AND_BOT', out2.x + 30, out2.y - 8*S, S);
    C.addWire(N_A1.pins.out, X1_AND_BOT.pins.inA);

    const xTopSpine = C.pin(TOP_BEHIND).x;
    const yBotInB   = C.pin(X1_AND_BOT.pins.inB).y;
    const J_SPINE_BOT = C.addJunction('X1_SPINE_BOT', xTopSpine, yBotInB);
    C.addWire(TOP_BEHIND, J_SPINE_BOT);
    C.addWire(J_SPINE_BOT, X1_AND_BOT.pins.inB);

    const xSpine   = xNot - 60;
    const yTopAND  = C.pin(X1_AND_TOP.pins.inA).y;
    const J_SPINE_TOP = C.addJunction('X1_SPINE_TOP', xSpine, yTopAND);
    C.addWire(BOT_BEHIND, J_SPINE_TOP);
    C.addWire(J_SPINE_TOP, X1_AND_TOP.pins.inA);

    // OR for this XOR
    {
      const oT = C.pin(X1_AND_TOP.pins.out);
      const oB = C.pin(X1_AND_BOT.pins.out);
      const mid = (oT.y + oB.y)/2;
      const yOr = mid - 36*S;
      const xOr = oT.x + 20;
      const X1_OR = C.addOR('X1_XOR_OR', xOr, yOr, S);
      const iA = C.pin(X1_OR.pins.inA), iB = C.pin(X1_OR.pins.inB);
      C.addWire(X1_AND_TOP.pins.out, X1_OR.pins.inA, [{x:oT.x, y:iA.y}, {x:iA.x-6, y:iA.y}]);
      C.addWire(X1_AND_BOT.pins.out, X1_OR.pins.inB, [{x:oB.x, y:iB.y}, {x:iB.x-6, y:iB.y}]);
    }

    // Re-route AND1 → NOT via the 60px-behind node (remove old direct run)
    (function(){
      const inRef = N_A1.pins.in;
      // remove existing AND1.out → N_A1.in wire (if present)
      const sim = C._groupEl.ownerSVGElement ? C._groupEl.ownerSVGElement : null; // not used; keep logic same
      for (let i = C._items?.wires ? C._items.wires.size - 1 : -1; i >= 0; i--) { /* noop in scoped version */ }
      // Just add the two-leg replacement path like original:
      const pAndOut = C.pin(AND1.pins.out);
      const pBotJ   = C.pin(BOT_BEHIND);
      C.addWire(AND1.pins.out, BOT_BEHIND, [
        { x: pAndOut.x, y: pAndOut.y - 40 },
        { x: pBotJ.x,   y: pAndOut.y - 40 }
      ]);
      C.addWire(BOT_BEHIND, inRef);
    })();
  })();

  // --- XOR Module 2: AND2 XOR AND3 (same geometry rules as original) ---
  (function(){
    const h = 72*S; const xNot = COL.AND2 + 120;
    const topRef = 'AND2.out', botRef = 'AND3.out';
    const pTop = C.pin(topRef), pBot = C.pin(botRef);

    let sep1 = 40;
    const mid2 = (pTop.y + pBot.y) / 2;
    const yTopT = mid2 - sep1/2;
    const yBotT = mid2 + sep1/2;

    const N2_TOP = C.addNOT('X2_NOT_TOP', xNot, yTopT - h/2, S);
    const TOP2   = C.addJunction('X2_TOP_BEHIND', xNot - 30, yTopT);
    C.addWire(topRef, TOP2, [{x:C.pin(topRef).x, y:yTopT}, {x:xNot-30, y:yTopT}]);
    C.addWire(TOP2, N2_TOP.pins.in, [{x:xNot-6, y:yTopT}]);

    const N2_BOT = C.addNOT('X2_NOT_BOT', xNot, yBotT - h/2, S);
    const BOT2   = C.addJunction('X2_BOT_BEHIND', xNot - 60, yBotT);
    C.addWire(botRef, BOT2, [{x:C.pin(botRef).x, y:yBotT}, {x:xNot-60, y:yBotT}]);
    C.addWire(BOT2, N2_BOT.pins.in, [{x:xNot-6, y:yBotT}]);

    const oTop = C.pin(N2_TOP.pins.out), oBot = C.pin(N2_BOT.pins.out);
    const X2_AND_TOP = C.addAND('X2_AND_TOP', oTop.x + 30, oTop.y - 64*S, S);
    const X2_AND_BOT = C.addAND('X2_AND_BOT', oBot.x + 30, oBot.y - 8*S,  S);
    C.addWire(N2_TOP.pins.out, X2_AND_TOP.pins.inB);
    C.addWire(N2_BOT.pins.out, X2_AND_BOT.pins.inA);

    C.addWire(BOT2, X2_AND_TOP.pins.inA, [
      { x: xNot - 60, y: C.pin(BOT2).y },
      { x: xNot - 60, y: C.pin(X2_AND_TOP.pins.inA).y }
    ]);
    C.addWire(TOP2, X2_AND_BOT.pins.inB, [
      { x: xNot - 30, y: C.pin(TOP2).y },
      { x: xNot - 30, y: C.pin(X2_AND_BOT.pins.inB).y }
    ]);

    const oT = C.pin(X2_AND_TOP.pins.out);
    const oB = C.pin(X2_AND_BOT.pins.out);
    const mid = (oT.y + oB.y)/2; const yOr = mid - 36*S; const xOr = oT.x + 20;
    const X2_OR = C.addOR('X2_XOR_OR', xOr, yOr, S);
    const iA = C.pin(X2_OR.pins.inA); const iB = C.pin(X2_OR.pins.inB);
    C.addWire(X2_AND_TOP.pins.out, X2_OR.pins.inA, [{x:oT.x, y:iA.y}, {x:iA.x-6, y:iA.y}]);
    C.addWire(X2_AND_BOT.pins.out, X2_OR.pins.inB, [{x:oB.x, y:iB.y}, {x:iB.x-6, y:iB.y}]);
  })();

  // --- XOR Module 12: OR(X1, X2) with equal-leg routing (unchanged) ---
  (function(){
    const h = 72*S;
    // Use the OR outputs made above
    let pO1, pO2;
    try { pO1 = C.pin('X1_XOR_OR.out'); pO2 = C.pin('X2_XOR_OR.out'); } catch { return; }

    let sep = 40;
    const delta = pO2.y - pO1.y;
    const L = Math.max(0, (delta - sep)/2);
    const yTopT = pO1.y + L;
    const yBotT = pO2.y - L;

    const xNot = Math.max(pO1.x, pO2.x) + 110;
    const N12_TOP = C.addNOT('X12_NOT_TOP', xNot, yTopT - h/2, S);
    const TOP12   = C.addJunction('X12_TOP_BEHIND', xNot - 30, yTopT);
    C.addWire('X1_XOR_OR.out', TOP12, [{x:pO1.x, y:yTopT}, {x:xNot-30, y:yTopT}]);
    C.addWire(TOP12, N12_TOP.pins.in, [{x:xNot-6, y:yTopT}]);

    const N12_BOT = C.addNOT('X12_NOT_BOT', xNot, yBotT - h/2, S);
    const BOT12   = C.addJunction('X12_BOT_BEHIND', xNot - 60, yBotT);
    C.addWire('X2_XOR_OR.out', BOT12, [{x:pO2.x, y:yBotT}, {x:xNot-60, y:yBotT}]);
    C.addWire(BOT12, N12_BOT.pins.in, [{x:xNot-6, y:yBotT}]);

    const oT = C.pin(N12_TOP.pins.out), oB = C.pin(N12_BOT.pins.out);
    const X12_AND_TOP = C.addAND('X12_AND_TOP', oT.x + 30, oT.y - 64*S, S);
    const X12_AND_BOT = C.addAND('X12_AND_BOT', oB.x + 30, oB.y - 8*S,  S);
    C.addWire(N12_TOP.pins.out, X12_AND_TOP.pins.inB);
    C.addWire(N12_BOT.pins.out, X12_AND_BOT.pins.inA);

    C.addWire(BOT12, X12_AND_TOP.pins.inA, [
      { x: xNot - 60, y: C.pin(BOT12).y },
      { x: xNot - 60, y: C.pin(X12_AND_TOP.pins.inA).y }
    ]);
    C.addWire(TOP12, X12_AND_BOT.pins.inB, [
      { x: xNot - 30, y: C.pin(TOP12).y },
      { x: xNot - 30, y: C.pin(X12_AND_BOT.pins.inB).y }
    ]);

    const o1 = C.pin(X12_AND_TOP.pins.out), o2 = C.pin(X12_AND_BOT.pins.out);
    const mid = (o1.y + o2.y)/2; const yOr = mid - 36*S; const xOr = o1.x + 20;
    const X12_OR = C.addOR('X12_XOR_OR', xOr, yOr, S);
    const iA = C.pin(X12_OR.pins.inA), iB = C.pin(X12_OR.pins.inB);
    C.addWire(X12_AND_TOP.pins.out, X12_OR.pins.inA, [{x:o1.x, y:iA.y}, {x:iA.x-6, y:iA.y}]);
    C.addWire(X12_AND_BOT.pins.out, X12_OR.pins.inB, [{x:o2.x, y:iB.y}, {x:iB.x-6, y:iB.y}]);
  })();

  // --- XOR Module 3: AND4B XOR AND5B (unchanged) ---
  (function(){
    const h = 72*S; const xNot = COL.AND2 + 120;
    const topRef = 'AND4B.out', botRef = 'AND5B.out';
    const pTop = C.pin(topRef), pBot = C.pin(botRef);

    let sep1 = 40;
    const mid3 = (pTop.y + pBot.y) / 2; const yTopT = mid3 - sep1/2; const yBotT = mid3 + sep1/2;

    const N3_TOP = C.addNOT('X3_NOT_TOP', xNot, yTopT - h/2, S);
    const TOP3   = C.addJunction('X3_TOP_BEHIND', xNot - 30, yTopT);
    C.addWire(topRef, TOP3, [{x: C.pin(topRef).x, y: yTopT}, {x:xNot-30, y:yTopT}]);
    C.addWire(TOP3, N3_TOP.pins.in, [{x:xNot-6, y:yTopT}]);

    const N3_BOT = C.addNOT('X3_NOT_BOT', xNot, yBotT - h/2, S);
    const BOT3   = C.addJunction('X3_BOT_BEHIND', xNot - 60, yBotT);
    C.addWire(botRef, BOT3, [{x: C.pin(botRef).x, y: yBotT}, {x:xNot-60, y:yBotT}]);
    C.addWire(BOT3, N3_BOT.pins.in, [{x:xNot-6, y:yBotT}]);

    const oTop = C.pin(N3_TOP.pins.out), oBot = C.pin(N3_BOT.pins.out);
    const X3_AND_TOP = C.addAND('X3_AND_TOP', oTop.x + 30, oTop.y - 64*S, S);
    const X3_AND_BOT = C.addAND('X3_AND_BOT', oBot.x + 30, oBot.y - 8*S,  S);
    C.addWire(N3_TOP.pins.out, X3_AND_TOP.pins.inB);
    C.addWire(N3_BOT.pins.out, X3_AND_BOT.pins.inA);

    C.addWire(TOP3, X3_AND_BOT.pins.inB, [
      { x: xNot - 30, y: C.pin(TOP3).y },
      { x: xNot - 30, y: C.pin(X3_AND_BOT.pins.inB).y }
    ]);
    C.addWire(BOT3, X3_AND_TOP.pins.inA, [
      { x: xNot - 60, y: C.pin(BOT3).y },
      { x: xNot - 60, y: C.pin(X3_AND_TOP.pins.inA).y }
    ]);

    const oT = C.pin(X3_AND_TOP.pins.out);
    const oB = C.pin(X3_AND_BOT.pins.out);
    const mid = (oT.y + oB.y)/2; const yOr = mid - 36*S; const xOr = oT.x + 20;
    const X3_OR = C.addOR('X3_XOR_OR', xOr, yOr, S);
    const iA = C.pin(X3_OR.pins.inA), iB = C.pin(X3_OR.pins.inB);
    C.addWire(X3_AND_TOP.pins.out, X3_OR.pins.inA, [{x:oT.x, y:iA.y}, {x:iA.x-6, y:iA.y}]);
    C.addWire(X3_AND_BOT.pins.out, X3_OR.pins.inB, [{x:oB.x, y:iB.y}, {x:iB.x-6, y:iB.y}]);
  })();

  // --- XOR Module 23: OR2 XOR OR3, with OR4 feeding the top path (unchanged routes) ---
  (function(){
    const h = 72*S;
    let pO2, pO3;
    try { pO2 = C.pin('X2_XOR_OR.out'); pO3 = C.pin('X3_XOR_OR.out'); } catch { C.render(); return; }

    let sep = 40;
    const delta = pO3.y - pO2.y;
    const L = Math.max(0, (delta - sep)/2);
    const yTopT = pO2.y + L;
    const yBotT = pO3.y - L;

    const xNot = Math.max(pO2.x, pO3.x) + 110;
    const N23_TOP = C.addNOT('X23_NOT_TOP', xNot, yTopT - h/2, S);
    const TOP23   = C.addJunction('X23_TOP_BEHIND', xNot - 30, yTopT);

    const N23_BOT = C.addNOT('X23_NOT_BOT', xNot, yBotT - h/2, S);
    const BOT23   = C.addJunction('X23_BOT_BEHIND', xNot - 60, yBotT);
    C.addWire('X3_XOR_OR.out', BOT23, [{x:pO3.x, y:yBotT}, {x:xNot-60, y:yBotT}]);
    C.addWire(BOT23, N23_BOT.pins.in, [{x:xNot-6, y:yBotT}]);

    // feed TOP23 from the earlier combined OR (X12_XOR_OR)
    try{
      const pO4  = C.pin('X12_XOR_OR.out');
      const mid0 = (C.pin(N23_TOP.pins.in).y + C.pin(N23_BOT.pins.in).y) / 2;
      const yMid = (pO4.y + mid0) / 2;
      const xTop = C.pin(TOP23).x;
      const yTop = C.pin(TOP23).y;
      C.addWire('X12_XOR_OR.out', TOP23, [{x:pO4.x, y:yMid}, {x:xTop, y:yMid}, {x:xTop, y:yTop}]);
      C.addWire(TOP23, N23_TOP.pins.in, [{x:xNot-6, y:yTopT}]);
    }catch{ /* if missing, leave top path un-driven */ }

    const oT = C.pin(N23_TOP.pins.out), oB = C.pin(N23_BOT.pins.out);
    const X23_AND_TOP = C.addAND('X23_AND_TOP', oT.x + 30, oT.y - 64*S, S);
    const X23_AND_BOT = C.addAND('X23_AND_BOT', oB.x + 30, oB.y - 8*S,  S);
    C.addWire(N23_TOP.pins.out, X23_AND_TOP.pins.inB);
    C.addWire(N23_BOT.pins.out, X23_AND_BOT.pins.inA);

    C.addWire(BOT23, X23_AND_TOP.pins.inA, [
      { x: xNot - 60, y: C.pin(BOT23).y },
      { x: xNot - 60, y: C.pin(X23_AND_TOP.pins.inA).y }
    ]);
    C.addWire(TOP23, X23_AND_BOT.pins.inB, [
      { x: xNot - 30, y: C.pin(TOP23).y },
      { x: xNot - 30, y: C.pin(X23_AND_BOT.pins.inB).y }
    ]);

    // Final OR for this stage
    const o1 = C.pin(X23_AND_TOP.pins.out);
    const o2 = C.pin(X23_AND_BOT.pins.out);
    const mid = (o1.y + o2.y) / 2;
    const yOr = mid - 36 * S;
    const xOr = o1.x + 20;
    const X23_OR = C.addOR('X23_XOR_OR', xOr, yOr, S);
    const iA = C.pin(X23_OR.pins.inA);
    const iB = C.pin(X23_OR.pins.inB);
    C.addWire(X23_AND_TOP.pins.out, X23_OR.pins.inA, [{ x: o1.x, y: iA.y }, { x: iA.x - 6, y: iA.y }]);
    C.addWire(X23_AND_BOT.pins.out, X23_OR.pins.inB, [{ x: o2.x, y: iB.y }, { x: iB.x - 6, y: iB.y }]);
  })();

  // === PRIME DISPLAY === (unchanged)
  (function(){
    let pOut;
    try { pOut = C.pin('X23_XOR_OR.out'); } catch { return; }
    const DISP = C.addDisplay('PRIME_DISPLAY', pOut.x + 20, pOut.y - 18, 132, 36);
    C.addWire('X23_XOR_OR.out', DISP.pins.in);
  })();

  // initial paint
  C.render();
}
