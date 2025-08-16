// Composable circuit engine + group API for scalable/movable via code
// Minimal deps: plain SVG

/**
 * @typedef {{x:number,y:number}} Point
 */

export class Circuit {
  /**
   * @param {SVGSVGElement} svg
   */
  constructor(svg){
    this.svg = svg;
    this.NS  = 'http://www.w3.org/2000/svg';

    // Root layer
    this.gRoot = this._make('g', { id:'root' });
    this.svg.appendChild(this.gRoot);

    // Simulation state
    this.R = { node:4, bubble:5 };
    this.comps = new Map();
    this.pins  = new Map();
    this.wires = []; // {from, to, via, el}

    this._rendering = false;
    this._renderCallbacks = [];
  }

  // ---------- DOM helpers ----------
  _make(tag, attrs){
    const n = document.createElementNS(this.NS, tag);
    if (attrs){ for (const k in attrs) n.setAttribute(k, attrs[k]); }
    return n;
  }
  _append(parent, child){ parent.appendChild(child); return child; }

  // ---------- Group API ----------
  /**
   * Create a new module group (own layers) that can be scaled and positioned via API.
   *
   * @param {string} id
   * @param {{x?:number,y?:number,scale?:number,showFrame?:boolean}} [opts]
   */
  createGroup(id, opts={}){
    const g = this._make('g', { id:`mod-${id}` });
    const { x=0, y=0, scale=1, showFrame=false } = opts;

    // Content wrapper so the frame bbox ignores the frame itself
    const gContent = this._append(g, this._make('g', { class:'content' }));

    // Sub-layers (order: wires below nodes visually; gates under wires)
    const gWires = this._append(gContent, this._make('g', { class:'wires' }));
    const gGates = this._append(gContent, this._make('g', { class:'gates' }));
    const gNodes = this._append(gContent, this._make('g', { class:'nodes' }));

    let frame = null;
    if (showFrame){
      frame = this._make('rect', {
        class:'module-frame',
        x:-8, y:-8, width:10, height:10, rx:10, ry:10,
        stroke:'var(--border)', fill:'none',
        'pointer-events': 'none'      // ← add this
      });
      // Put frame **after** content so it renders above wires/gates/nodes
      g.appendChild(frame);
    }

    // Initial transform
    const state = { x, y, scale };
    const applyTransform = ()=> g.setAttribute('transform', `translate(${state.x},${state.y}) scale(${state.scale})`);
    applyTransform();

    // Track items created in this group (optional bookkeeping)
    const items = { comps: new Set(), pins: new Set(), wires: new Set() };

    // Scoped id utility to avoid collisions across modules
    const scopeId  = (localId)=> `${id}:${localId}`;
    const scopeRef = (ref)=> (typeof ref === 'string' && !ref.includes(':')) ? `${id}:${ref}` : ref;

    const layers = { gWires, gGates, gNodes };
    const owner = this; // bind helpers to Circuit instance

    const groupAPI = {
      id,
      get x(){ return state.x; }, get y(){ return state.y; }, get scale(){ return state.scale; },
      setTransform(nx, ny, s){ state.x = nx; state.y = ny; if (typeof s === 'number') state.scale = s; applyTransform(); },
      setPosition(nx, ny){ state.x = nx; state.y = ny; applyTransform(); },
      setScale(s){ state.scale = s; applyTransform(); },

      // Drawing helpers (scoped to module; bound to Circuit)
      addBit(localId, x, y){ return _addBit.call(owner, scopeId(localId), x, y, layers, items); },
      addAND(localId, x, y, s=1){ return _addAND.call(owner, scopeId(localId), x, y, s, layers, items); },
      addOR(localId, x, y, s=1){ return _addOR.call(owner, scopeId(localId), x, y, s, layers, items); },
      addNOT(localId, x, y, s=1){ return _addNOT.call(owner, scopeId(localId), x, y, s, layers, items); },
      addDisplay(localId, x, y, w=132, h=36){ return _addDisplay.call(owner, scopeId(localId), x, y, w, h, layers, items); },
      addDangling(localId, name, x, y, r){ return _addPin.call(owner, scopeId(localId), name, x, y, r, layers, items); },
      addJunction(localId, x, y, r){ return _addPin.call(owner, scopeId(localId), 'j', x, y, r, layers, items); },
      addWire(fromRef, toRef, via){ return _addWire.call(owner, scopeRef(fromRef), scopeRef(toRef), via, layers, items); },
      pin(ref){ return _getPin.call(owner, scopeRef(ref)); },

      onRender: (cb)=> owner.onRender(cb),
      render: ()=> owner.render(),
      _items: items,
      _groupEl: g,
      _contentEl: gContent,
      _frame: frame,
    };

    // Keep the frame sized to the content's bbox after each render
    if (frame){
      owner.onRender(()=>{
        try{
          const bbox = gContent.getBBox();
          frame.setAttribute('x', bbox.x - 8);
          frame.setAttribute('y', bbox.y - 8);
          frame.setAttribute('width', bbox.width + 16);
          frame.setAttribute('height', bbox.height + 16);
        }catch{ /* getBBox can fail if not in DOM or display:none */ }
      });
    }

    this.gRoot.appendChild(g);
    return groupAPI;
  }

  // ---------- Public render & hooks ----------
  onRender(cb){ if (typeof cb === 'function') this._renderCallbacks.push(cb); }

  render(){
    if (this._rendering) return;
    this._rendering = true;

    // clear
    this.pins.forEach(p=>{ p.v=0; p.dr=false; });

    // seed bit outputs
    for(const comp of this.comps.values()){
      if(comp.kind==='BIT'){
        const o=this.pins.get(comp.pins.out);
        o.v = comp.state.val?1:0; o.dr = true;
      }
    }

    // settle combinational network
    for(let i=0;i<16;i++){
      // wires propagate
      for(const w of this.wires){
        const a=this.pins.get(w.from); const b=this.pins.get(w.to);
        if (a && b){ b.v = a.v ? 1 : 0; b.dr = !!a.dr; }
      }
      // gates compute
      for(const comp of this.comps.values()){
        switch(comp.kind){
          case 'AND': {
            const aP=this.pins.get(comp.pins.inA), bP=this.pins.get(comp.pins.inB);
            const o=this.pins.get(comp.pins.out);
            o.v = (aP.v && bP.v) ? 1 : 0; o.dr = !!(aP.dr || bP.dr); break;
          }
          case 'OR': {
            const aP=this.pins.get(comp.pins.inA), bP=this.pins.get(comp.pins.inB);
            const o=this.pins.get(comp.pins.out);
            o.v = (aP.v || bP.v) ? 1 : 0; o.dr = !!(aP.dr || bP.dr); break;
          }
          case 'NOT': {
            const i=this.pins.get(comp.pins.in), o=this.pins.get(comp.pins.out);
            o.v = i.v ? 0 : 1; o.dr = !!i.dr; break;
          }
          case 'DISP': break;
        }
      }
    }

    // visuals
    this.pins.forEach(p=> p.el.classList.toggle('high', !!(p.v && p.dr)));
    for (const w of this.wires) {
      const a = this.pins.get(w.from);
      w.el.classList.toggle('high', !!(a && a.v && a.dr));
    }

    for (const comp of this.comps.values()) {
      if (comp.kind === 'BIT') {
        const pout = this.pins.get(comp.pins.out);
        const on = !!(pout && pout.v && pout.dr);
        if (comp.els && comp.els.g && comp.els.g.classList) {
          comp.els.g.classList.toggle('active', on);
        }
      } else if (comp.kind === 'DISP') {
        const pinObj = this.pins.get(comp.pins.in);
        const on = !!(pinObj && pinObj.v);
        if (comp.els && comp.els.tx) {
          comp.els.tx.textContent = on ? '1: Prime' : '0: Composite';
        }
        if (comp.els && comp.els.g && comp.els.g.classList) {
          comp.els.g.classList.toggle('active', on);
        }
      }
    }


    // Gate outlines: green when their OUTPUT is high
    for (const comp of this.comps.values()){
      if (comp.kind==='AND' || comp.kind==='OR' || comp.kind==='NOT'){
        const outPinRef = comp.pins.out;
        const out = this.pins.get(outPinRef);
        const on = !!(out && out.v && out.dr);
        const outline = (comp.els && (comp.els.path || comp.els.poly));
        if (outline) outline.classList.toggle('high', on);
        if (comp.kind==='BIT'){
         comp.els.rect.classList.toggle('high', !!comp.state.val);
        }
      }
    }
    

    // callbacks
    try { for(const cb of this._renderCallbacks) cb(); } catch{}

    this._rendering = false;
  }
}

/* ===== private helpers (bound via .call in group methods) ===== */

function _getPin(ref){
  if (!ref) throw new Error('Missing pin ref');
  const key = typeof ref === 'string' ? ref : (ref.id || ref);
  const p = this.pins.get(key);
  if (!p) throw new Error('Pin not found: ' + key);
  return p;
}

function _pinKey(id, name){ return `${id}.${name}`; }

function _addPin(id, name, x, y, r=this.R.node, layers, items){
  const key = _pinKey(id, name);
  const circle = this._make('circle', { id:`pin-${id}-${name}`, class:'node', cx:x, cy:y, r });
  layers.gNodes.appendChild(circle);
  const p = { id:key, x, y, r, v:0, dr:false, el:circle };
  this.pins.set(key, p);
  if (items) items.pins.add(key);
  return key;
}

function _wirePoints(fromRef, toRef, via){
  const a = _getPin.call(this, fromRef);
  const b = _getPin.call(this, toRef);

  // VIA ROUTE: keep your vias, but guarantee the final approach is horizontal
  if (via && via.length){
    const pts = [];

    // exit tangent from source depending on first leg orientation
    const f = via[0];
    if (Math.abs(f.x - a.x) < 1e-6){
      const dirY = (f.y >= a.y) ? 1 : -1;
      pts.push([a.x, a.y + dirY * a.r]);         // vertical exit
    } else {
      const dirX = (f.x >= a.x) ? 1 : -1;
      pts.push([a.x + dirX * a.r, a.y]);         // horizontal exit
    }

    via.forEach(p => pts.push([p.x, p.y]));

    // force LAST leg to be horizontal into b
    const dirX = (b.x >= via[via.length - 1].x) ? 1 : -1;
    pts.push([b.x - dirX * b.r, b.y]);
    return pts;
  }

  // NO VIA: choose an orthogonal "L" path with horizontal final approach
  // same x → vertical segment
  if (Math.abs(a.x - b.x) < 1e-6){
    const dirY = (b.y >= a.y) ? 1 : -1;
    return [
      [a.x, a.y + dirY * a.r],
      [b.x, b.y - dirY * b.r]
    ];
  }
  // same y → horizontal segment
  if (Math.abs(a.y - b.y) < 1e-6){
    const dirX = (b.x >= a.x) ? 1 : -1;
    return [
      [a.x + dirX * a.r, a.y],
      [b.x - dirX * b.r, b.y]
    ];
  }

  // general case: vertical then horizontal so the last leg is horizontal
  const dirY = (b.y >= a.y) ? 1 : -1;
  const dirX = (b.x >= a.x) ? 1 : -1;
  return [
    [a.x, a.y + dirY * a.r],        // vertical exit from source
    [a.x, b.y],                      // turn at source x
    [b.x - dirX * b.r, b.y]          // horizontal into destination
  ];
}


function _addWire(fromRef, toRef, via, layers, items){
  const pts = _wirePoints.call(this, fromRef, toRef, via);
  let el;
  if (pts.length === 2){
    el = this._make('line', { class:'wire', x1:pts[0][0], y1:pts[0][1], x2:pts[1][0], y2:pts[1][1] });
  } else {
    el = this._make('polyline', { class:'wire', points: pts.map(p=>p.join(',')).join(' ') });
  }
  layers.gWires.appendChild(el);
  const w = { from: typeof fromRef==='string'?fromRef:fromRef.id, to: typeof toRef==='string'?toRef:toRef.id, via, el };
  this.wires.push(w);
  if (items) items.wires.add(w);
  return w;
}

function _addBit(id, x, y, layers, items){
  const g = this._make('g', { id, tabindex:0, class:'bit', 'aria-label':`Bit ${id}` });
  const rect = this._make('rect', { class:'bit-rect', x, y, rx:8, ry:8, width:64, height:48 });
  const tx = this._make('text', { class:'bit-label', x:x+32, y:y+24 }); tx.textContent='0';
  const out = _addPin.call(this, id, 'out', x+64+this.R.node, y+24, this.R.node, layers, items);
  g.append(rect, tx);
  layers.gGates.appendChild(g);
  const comp = { id, kind:'BIT', pins:{ out }, els:{ g, rect, tx }, state:{ val:0 } };
  this.comps.set(id, comp);
  g.addEventListener('click', ()=>{ comp.state.val^=1; tx.textContent=String(comp.state.val); this.render(); });
  g.addEventListener('keydown', (e)=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); comp.state.val^=1; tx.textContent=String(comp.state.val); this.render(); }});
  if (items) items.comps.add(id);
  return comp;
}

function _addAND(id, x, y, s=1, layers, items){
  const w=72*s, h=72*s, r=36*s;
  const path = this._make('path', { class:'gate-shape', d:`M${x} ${y} H${x+36*s} A${r} ${r} 0 0 1 ${x+36*s} ${y+h} H${x} Z` });
  layers.gGates.appendChild(path);
  const inA = _addPin.call(this,id,'inA', x, y+8*s, this.R.node, layers, items);
  const inB = _addPin.call(this,id,'inB', x, y+64*s, this.R.node, layers, items);
  const out = _addPin.call(this,id,'out', x+w, y+h/2, this.R.node, layers, items);
  const comp = { id, kind:'AND', pins:{ inA, inB, out }, els:{ path }, s };
  this.comps.set(id, comp); if (items) items.comps.add(id);
  return comp;
}

function _addOR(id, x, y, s=1, layers, items){
  const w=72*s, h=72*s;
  const path = this._make('path', { class:'gate-shape',
    d:`M${x} ${y} C ${x+24*s} ${y}, ${x+60*s} ${y+12*s}, ${x+w} ${y+h/2} C ${x+60*s} ${y+h-12*s}, ${x+24*s} ${y+h}, ${x} ${y+h} C ${x+12*s} ${y+h-16*s}, ${x+12*s} ${y+16*s}, ${x} ${y}` });
  layers.gGates.appendChild(path);
  const inA = _addPin.call(this,id,'inA', x+4*s, y+8*s, this.R.node, layers, items);
  const inB = _addPin.call(this,id,'inB', x+4*s, y+64*s, this.R.node, layers, items);
  const out = _addPin.call(this,id,'out', x+w, y+h/2, this.R.node, layers, items);
  const comp = { id, kind:'OR', pins:{ inA, inB, out }, els:{ path }, s };
  this.comps.set(id, comp); if (items) items.comps.add(id);
  return comp;
}

function _addNOT(id, x, y, s=1, layers, items){
  const triW=44*s, h=72*s;
  const poly = this._make('polygon', {class:'gate-shape', points: `${x},${y+12*s} ${x},${y+h-12*s} ${x+triW},${y+h/2}`, fill:'none'});
  layers.gGates.appendChild(poly);
  const inn = _addPin.call(this,id,'in', x, y+h/2, this.R.node, layers, items);
  const out = _addPin.call(this,id,'out', x+triW+this.R.bubble, y+h/2, this.R.bubble, layers, items);
  const comp = { id, kind:'NOT', pins:{ in:inn, out }, els:{ poly }, s };
  this.comps.set(id, comp); if (items) items.comps.add(id);
  return comp;
}

function _addDisplay(id, x, y, w=132, h=36, layers, items){
  const g = this._make('g', { id, class:'display' });
  const rect = this._make('rect', { class:'bit-rect', x, y, rx:8, ry:8, width:w, height:h });
  const tx = this._make('text', { class:'bit-label', x: x + w/2, y: y + h/2 });
  tx.textContent = '0: Composite';
  const input = _addPin.call(this, id, 'in', x, y + h/2, this.R.node, layers, items);
  g.appendChild(rect); g.appendChild(tx);
  layers.gGates.appendChild(g);
  const comp = { id, kind:'DISP', pins:{ in: input }, els:{ g, rect, tx }, box:{ x, y, w, h } };
  this.comps.set(id, comp); if (items) items.comps.add(id);
  return comp;
}
