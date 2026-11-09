import { node } from './main.js';

const namespace = 'http://www.w3.org/2000/svg';
const svgNode = (tag, props = {}) => {
  const el = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(props)) el.setAttribute(key, value);
  return el;
};
const layerColor = name => ({
  'F.Cu': '#d55953', 'B.Cu': '#5b9fe9', 'In1.Cu': '#cfa15d', 'In2.Cu': '#a36bc5',
  'F.Silkscreen': '#eae1cf', 'B.Silkscreen': '#95c3c9', 'Edge.Cuts': '#d9bd61',
  'F.Fab': '#aca6a4', 'B.Fab': '#91a7ae', 'F.Courtyard': '#bd82bc', 'B.Courtyard': '#8f82bd',
})[name] || '#87ac76';

export function mountPCB(container, board, asset, {onSelect, onStatus}) {
  const [width, height] = board.size.map(value => Math.max(1, value));
  const stage = node('div', {class: 'pcb-stage'});
  const canvas = svgNode('svg', {role: 'img', tabindex: '0', 'aria-label': 'PCB layers and highlighted footprint'});
  const group = svgNode('g');
  if (board.outline) group.append(svgNode('path', {d: board.outline, fill: '#293630', 'fill-rule': 'evenodd',
    transform: 'translate(' + (board.outlineOffset || [0, 0]).join(' ') + ')'}));
  const overlay = svgNode('g');
  const heading = node('div', {class: 'overlay-info'});
  const compact = matchMedia('(max-width: 790px)');
  const drawer = node('details', {class: 'layers'});
  const layers = node('div', {class: 'layer-panel', 'aria-label': 'PCB layers'});
  drawer.append(node('summary', {class: 'layer-title'}, 'PCB layers'), layers);
  const syncDrawer = () => { drawer.open = !compact.matches; };
  compact.addEventListener('change', syncDrawer);
  syncDrawer();
  const actions = node('div', {class: 'layer-actions'});
  const front = node('button', {type: 'button', 'aria-pressed': true}, 'Front');
  const back = node('button', {type: 'button', 'aria-pressed': false}, 'Back');
  actions.append(front, back);
  layers.append(actions);
  const plots = Object.keys(board.plots);
  const isSilk = name => name.endsWith('Silkscreen');
  const drawOrder = [...plots].sort((a, b) => Number(a.startsWith('F.')) - Number(b.startsWith('F.')))
    .sort((a, b) => Number(isSilk(a)) - Number(isSilk(b)) || Number(a === 'Edge.Cuts') - Number(b === 'Edge.Cuts'));
  const images = new Map(drawOrder.map(name => {
    const layer = svgNode('image', {href: asset(board.plots[name]), width, height, opacity: name.endsWith('.Cu') ? .85 : 1});
    group.append(layer);
    return [name, layer];
  }));
  group.append(overlay);
  canvas.append(group);
  let flipped = false;
  let part = null;
  let frame = 0;
  let camera = {x: width / 2, y: height / 2, w: width * 1.18};
  let fitWidth = camera.w;
  let aspect = 1;
  let drag;
  const button = (label, title, fn) => {
    const control = node('button', {type: 'button', title, 'aria-label': title}, label);
    control.onclick = fn;
    return control;
  };
  const scaleLabel = node('div', {class: 'scale-bar', 'aria-hidden': true});
  stage.append(canvas, heading, scaleLabel, node('div', {class: 'canvas-buttons'},
    button('−', 'Zoom out', () => zoom(1.25)),
    button('+', 'Zoom in', () => zoom(.8)),
    button('Fit', 'Fit board', () => move({x: width / 2, y: height / 2, w: fitWidth}))));
  container.append(stage, drawer);

  const checks = new Map(plots.map(name => {
    const input = node('input', {type: 'checkbox'});
    input.checked = !name.endsWith('.Fab');
    const swatch = node('span', {class: 'swatch', 'aria-hidden': 'true', style: '--swatch:' + layerColor(name)});
    layers.append(node('label', {class: 'layer-row', title: name}, input, swatch,
      node('span', {class: 'layer-name'}, name.replace('Silkscreen', 'Silk'))));
    input.onchange = () => {
      const facesViewer = name.startsWith(flipped ? 'B.' : 'F.');
      images.get(name).style.display = input.checked && (!isSilk(name) || facesViewer) ? '' : 'none';
    };
    return [name, input];
  }));

  function setSide(next) {
    flipped = next;
    front.setAttribute('aria-pressed', String(!flipped));
    back.setAttribute('aria-pressed', String(flipped));
    group.setAttribute('transform', flipped ? 'translate(' + width + ' 0) scale(-1 1)' : '');
    heading.textContent = flipped ? 'BACK / MIRRORED' : 'FRONT / TOP';
    checks.forEach(input => input.onchange());
    const nearCopper = images.get(flipped ? 'B.Cu' : 'F.Cu');
    const nearSilk = images.get(flipped ? 'B.Silkscreen' : 'F.Silkscreen');
    for (const layer of [nearCopper, nearSilk, images.get('Edge.Cuts')]) {
      if (layer) group.insertBefore(layer, overlay);
    }
  }

  function render(report = true) {
    const cameraHeight = camera.w / aspect;
    canvas.setAttribute('viewBox', [camera.x - camera.w / 2, camera.y - cameraHeight / 2, camera.w, cameraHeight].join(' '));
    const pixelsPerMM = stage.clientWidth / camera.w;
    const units = 72 / pixelsPerMM;
    const magnitude = 10 ** Math.floor(Math.log10(units));
    const rounded = ([5, 2, 1].find(n => n * magnitude <= units) || 1) * magnitude;
    scaleLabel.style.width = rounded * pixelsPerMM + 'px';
    scaleLabel.textContent = Number(rounded.toPrecision(3)) + ' mm';
    if (report) onStatus(Math.round(fitWidth / camera.w * 100) + '%', part);
  }

  function move(target, duration = 880) {
    cancelAnimationFrame(frame);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera = target;
      render();
      return;
    }
    const start = {...camera};
    const started = performance.now();
    const step = now => {
      const t = Math.min(1, (now - started) / duration);
      const ease = t * t * (3 - 2 * t);
      camera = {
        x: start.x + (target.x - start.x) * ease,
        y: start.y + (target.y - start.y) * ease,
        w: start.w * (target.w / start.w) ** ease,
      };
      render(t === 1);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  function zoom(factor, event) {
    cancelAnimationFrame(frame);
    const w = Math.max(fitWidth / 32, Math.min(fitWidth * 5, camera.w * factor));
    if (event) {
      const bounds = stage.getBoundingClientRect();
      camera.x += ((event.clientX - bounds.left) / bounds.width - .5) * (camera.w - w);
      camera.y += ((event.clientY - bounds.top) / bounds.height - .5) * (camera.w - w) / aspect;
    }
    camera.w = w;
    render();
  }

  function focus(target) {
    part = target;
    overlay.replaceChildren();
    if (!part) return render();
    const next = part.side === 'back';
    if (next !== flipped) setSide(next);
    const [x, y, w, h] = part.box;
    const pad = Math.max(.35, Math.max(w, h) * .07);
    overlay.append(svgNode('rect', {x: x - pad, y: y - pad, width: Math.max(.25, w) + pad * 2,
      height: Math.max(.25, h) + pad * 2, rx: pad / 2, class: 'target'}));
    onStatus(Math.round(fitWidth / camera.w * 100) + '%', part);
    const center = x + w / 2;
    const zoomWidth = Math.max(w * 3.5, h * 3.5 * aspect, Math.min(width, height) * .22, 4);
    move({x: flipped ? width - center : center, y: y + h / 2, w: Math.min(fitWidth, zoomWidth)});
  }

  function flip(next) {
    if (flipped === next) return;
    setSide(next);
    camera.x = width - camera.x;
    onSelect(null);
    render();
  }

  front.onclick = () => flip(false);
  back.onclick = () => flip(true);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom(Math.exp(Math.max(-85, Math.min(85, event.deltaY)) * .006), event);
  }, {passive: false});
  canvas.onkeydown = event => {
    const distance = camera.w * .08;
    const pan = {ArrowLeft: [-distance, 0], ArrowRight: [distance, 0],
      ArrowUp: [0, -distance], ArrowDown: [0, distance]}[event.key];
    if (pan) {
      event.preventDefault();
      cancelAnimationFrame(frame);
      camera.x += pan[0];
      camera.y += pan[1];
      render();
    } else if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault();
      zoom(event.key === '-' ? 1.25 : .8);
    } else if (event.key === 'Escape') {
      onSelect(null);
    }
  };
  canvas.onpointerdown = event => {
    if (event.button !== 0 || !event.isPrimary) return;
    cancelAnimationFrame(frame);
    canvas.setPointerCapture(event.pointerId);
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, from: {...camera}};
  };
  canvas.onpointermove = event => {
    if (drag?.id !== event.pointerId) return;
    const unitsPerPixel = camera.w / stage.clientWidth;
    camera.x = drag.from.x - (event.clientX - drag.x) * unitsPerPixel;
    camera.y = drag.from.y - (event.clientY - drag.y) * unitsPerPixel;
    render();
  };
  canvas.onpointerup = event => {
    if (drag?.id !== event.pointerId) return;
    const click = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4;
    drag = null;
    if (!click) return;
    const bounds = stage.getBoundingClientRect();
    const mx = camera.x + ((event.clientX - bounds.left) / bounds.width - .5) * camera.w;
    const my = camera.y + ((event.clientY - bounds.top) / bounds.height - .5) * camera.w / aspect;
    const x = flipped ? width - mx : mx;
    const matches = board.parts.filter(p => {
      const [bx, by, bw, bh] = p.box;
      return (p.side === 'back') === flipped && x >= bx && x <= bx + bw && my >= by && my <= by + bh;
    }).sort((a, b) => a.box[2] * a.box[3] - b.box[2] * b.box[3]);
    if (matches.length) onSelect(matches[0]);
  };
  canvas.onlostpointercapture = () => { drag = null; };
  const resize = () => {
    if (!stage.clientHeight || !stage.clientWidth) return;
    const wasFit = Math.abs(camera.w - fitWidth) < .001;
    aspect = stage.clientWidth / stage.clientHeight;
    fitWidth = Math.max(width, height * aspect) * 1.18;
    if (wasFit) camera.w = fitWidth;
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  setSide(false);
  resize();
  return {focus, dispose() {
    compact.removeEventListener('change', syncDrawer);
    observer.disconnect();
    cancelAnimationFrame(frame);
  }};
}
