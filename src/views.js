import { node } from './main.js';

export function mountSchematic(container, sheets, asset, status) {
  const select = node('select', {'aria-label': 'Schematic sheet'},
    ...sheets.map(({title}, i) => node('option', {value: i}, title)));
  const image = node('img', {alt: ''});
  const window = node('div', {class: 'sheet-window'});
  window.append(image);
  const makeButton = (label, name, callback) => {
    const button = node('button', {type: 'button', 'aria-label': name}, label);
    button.onclick = callback;
    return button;
  };
  container.append(node('div', {class: 'sheet'},
    node('div', {class: 'sheet-tools'}, select,
      makeButton('−', 'Zoom out', () => zoom(.8)),
      makeButton('+', 'Zoom in', () => zoom(1.25)),
      makeButton('Fit', 'Fit schematic', fit)), window));

  let scale = 1;
  let fitScale = 1;
  let x = 0;
  let y = 0;
  let drag;
  let frame = 0;
  let zoomTimer;
  let paintedScale = 1;
  let reported;

  function render() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      image.style.transform = `translate(${x}px, ${y}px) scale(${scale / paintedScale})`;
      const percent = Math.round(scale / fitScale * 100) + '%';
      if (percent !== reported) {
        reported = percent;
        status(percent);
      }
    });
  }

  function paintAtScale() {
    clearTimeout(zoomTimer);
    paintedScale = scale;
    image.style.width = image.naturalWidth * scale + 'px';
    image.style.willChange = drag ? 'transform' : '';
    render();
  }
  function fit() {
    if (!image.naturalWidth) return;
    scale = fitScale = .96 * Math.min(window.clientWidth / image.naturalWidth, window.clientHeight / image.naturalHeight);
    x = (window.clientWidth - image.naturalWidth * scale) / 2;
    y = (window.clientHeight - image.naturalHeight * scale) / 2;
    paintAtScale();
  }
  function zoom(factor, px = window.clientWidth / 2, py = window.clientHeight / 2) {
    if (!image.naturalWidth) return;
    const next = Math.max(fitScale / 2, Math.min(fitScale * 15, scale * factor));
    x = px - (px - x) * next / scale;
    y = py - (py - y) * next / scale;
    scale = next;
    image.style.willChange = 'transform';
    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(paintAtScale, 160);
    render();
  }
  function loadSheet() {
    const sheet = sheets[Number(select.value)];
    clearTimeout(zoomTimer);
    image.alt = 'Schematic · ' + sheet.title;
    image.src = asset(sheet.file) + '?batched=1';
  }
  select.onchange = loadSheet;
  image.onload = fit;
  image.onerror = () => { status('Unavailable'); };
  window.addEventListener('wheel', event => {
    event.preventDefault();
    const bounds = window.getBoundingClientRect();
    zoom(Math.exp(Math.max(-80, Math.min(80, -event.deltaY)) * .006), event.clientX - bounds.left, event.clientY - bounds.top);
  }, {passive: false});
  window.onpointerdown = event => {
    if (event.button !== 0 || !event.isPrimary) return;
    window.setPointerCapture(event.pointerId);
    image.style.willChange = 'transform';
    drag = {x: event.clientX, y: event.clientY, fromX: x, fromY: y};
  };
  window.onpointermove = event => {
    if (!drag) return;
    x = drag.fromX + event.clientX - drag.x;
    y = drag.fromY + event.clientY - drag.y;
    render();
  };
  window.onlostpointercapture = () => {
    drag = null;
    if (scale === paintedScale) image.style.willChange = '';
  };
  const observer = new ResizeObserver(fit);
  observer.observe(window);
  loadSheet();
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(zoomTimer);
    image.onload = null;
    image.onerror = null;
  };
}

export function mountBOM(container, parts, partButton) {
  const filter = node('input', {type: 'search', placeholder: 'Filter parts', 'aria-label': 'Filter bill of materials'});
  const body = node('tbody');
  const count = node('span', {'aria-live': 'polite'});
  const table = node('table', {'aria-label': 'Bill of materials'},
    node('thead', {}, node('tr', {}, ...['Refs', 'Value / Part', 'Qty', 'Footprint'].map(label => node('th', {scope: 'col'}, label)))), body);
  container.append(node('section', {class: 'bom'}, node('div', {class: 'bom-tools'}, filter, count), table));
  const groups = Map.groupBy(parts.filter(part => part.bom),
    p => JSON.stringify([p.value, p.package, p.dnp, Object.entries(p.fields).sort()]));
  function render() {
    const query = filter.value.toLowerCase().trim();
    const visible = [...groups.values()].filter(group => group.some(part =>
      [part.ref, part.value, part.package, ...Object.values(part.fields)].some(value => value.toLowerCase().includes(query))));
    count.textContent = visible.length + ' groups';
    body.replaceChildren(...visible.map(group => {
      const part = group[0];
      const identifiers = Object.values(part.fields).filter(value => value !== part.value);
      return node('tr', {}, node('td', {}, ...group.map(p => partButton(p, p.ref))),
        node('td', {}, part.value + (part.dnp ? ' · DNP' : ''), identifiers.length ? node('small', {}, identifiers.join(' · ')) : ''),
        node('td', {}, String(group.length)), node('td', {}, part.package));
    }));
    if (!visible.length) body.append(node('tr', {}, node('td', {colspan: 4}, 'No matching components.')));
  }
  filter.oninput = render;
  render();
}
