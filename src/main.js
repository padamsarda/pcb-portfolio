import './style.css';
import MarkdownIt from 'markdown-it';
import { mountPCB } from './pcb.js';
import { mountSchematic, mountBOM } from './views.js';

const project = document.querySelector('#project');
const index = document.querySelector('#index');
const search = document.querySelector('#board-search');
const markdown = new MarkdownIt({html: false});
const renderMarkdownImage = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, i, options, env, renderer) => {
  const token = tokens[i];
  const src = token.attrGet('src');
  if (!/^https?:\/\//i.test(src)) {
    if (!env.repo?.startsWith('https://github.com/')) return markdown.utils.escapeHtml(token.content);
    const raw = env.repo.replace('https://github.com/', 'https://raw.githubusercontent.com/') + '/HEAD/';
    token.attrSet('src', new URL(src, raw).href);
  }
  token.attrSet('loading', 'lazy');
  return renderMarkdownImage(tokens, i, options, env, renderer);
};
markdown.renderer.rules.link_open = (tokens, i, options, env, renderer) => {
  const token = tokens[i];
  const href = token.attrGet('href');
  if (href && !/^(https?:\/\/|#)/i.test(href)) {
    if (env.repo) token.attrSet('href', new URL(href, env.repo + '/tree/HEAD/').href);
    else token.attrs = token.attrs.filter(([name]) => name !== 'href');
  }
  return renderer.renderToken(tokens, i, options);
};
const root = import.meta.env.BASE_URL + 'boards/';
const views = [['pcb', 'PCB'], ['schematic', 'Schematic'], ['model', '3D'], ['bom', 'BOM']];
let archive = [];
let current;
let board;
let view;
let dispose;
let activePart;
let boardRequest = 0;
let viewRequest = 0;
const compact = matchMedia('(max-width: 790px)');
const scrollBehavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

export function node(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) element.setAttribute(key, value);
  element.append(...children);
  return element;
}

const asset = name => root + current.id + '/' + name;
const partFor = query => board.parts.find(p => p.ref === query) ||
  board.parts.find(p => [p.value, ...Object.values(p.fields)].some(value =>
    value.toLowerCase().includes(query.toLowerCase())));

function partButton(part, label, css = 'part-link') {
  const button = node('button', {type: 'button', class: css, 'data-ref': part.ref,
    'aria-pressed': false, title: 'Locate ' + part.ref + ' on the PCB'}, label);
  button.onclick = () => locate(part, true);
  return button;
}

function locate(part, fromNotes = false) {
  activePart = part;
  if (!view || fromNotes && view.name !== 'pcb') {
    openView('pcb');
  }
  view?.focus?.(part);
  if (part && fromNotes && compact.matches) {
    document.querySelector('.viewer').scrollIntoView({block: 'start', behavior: scrollBehavior()});
  }
  document.querySelectorAll('[data-ref]').forEach(el =>
    el.setAttribute('aria-pressed', String(el.dataset.ref === part?.ref)));
}

function renderNav() {
  const nav = document.querySelector('#project-nav');
  nav.replaceChildren(...archive.filter(b => b.group === 'Main projects' && !b.pending).map((item, i) => {
    const {id} = item;
    return node('a', {href: '#' + id, class: 'project-link', 'aria-current': current.id === id ? 'page' : 'false'},
      node('i', {}, String(i + 1).padStart(2, '0')), item.title);
  }));
  renderIndex();
  renderBoardList(document.querySelector('#catalogue-list'), archive, () => {
    project.scrollIntoView({block: 'start', behavior: scrollBehavior()});
  });
}

function renderIndex() {
  const terms = search.value.toLowerCase().trim().split(/\s+/);
  const matches = archive.filter(b => {
    const haystack = [b.id, b.title, b.group, b.rev, ...(b.aliases || [])].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
  renderBoardList(document.querySelector('#index-list'), matches, () => index.close());
}

function renderBoardList(list, boards, onOpen) {
  const groups = Map.groupBy(boards, b => b.group);
  list.replaceChildren(...Array.from(groups, ([group, items]) => node('section', {class: 'index-group'},
    node('h3', {}, group), ...items.map(item => {
      const link = node('a', {href: '#' + item.id, 'aria-current': current?.id === item.id ? 'page' : 'false'},
        item.title, node('small', {}, item.pending ? 'Pending' : item.size.length ? item.size.map(n => n.toFixed(1)).join(' × ') + ' mm' : item.rev));
      link.onclick = onOpen;
      return link;
    }))));
  if (!groups.size) list.append(node('p', {class: 'empty-notes'}, 'No matching boards.'));
}

function renderNotes() {
  const overview = node('div', {class: 'board-overview'},
    node('p', {class: 'section-kicker'}, 'Purpose'),
    node('p', {}, current.purpose),
    node('p', {class: 'section-kicker'}, 'Estimated build window'),
    node('p', {}, current.buildTime),
    node('small', {}, current.buildEvidence));
  if (current.pending) overview.append(node('p', {class: 'pending-note'}, 'Pending · ' + current.pending));
  const section = node('aside', {class: 'notes', 'aria-labelledby': 'notes-title'},
    overview,
    node('div', {class: 'notes-head'}, node('p', {class: 'section-kicker'}, current.notes.length ? 'From the project notes' : 'From the KiCad design'),
      node('h2', {id: 'notes-title'}, 'Design notes')));
  const mentioned = new Set();
  if (current.notes.length) {
    const entries = current.notes.map(line => {
      const copy = node('span');
      let offset = 0;
      for (const match of line.matchAll(/\[\[([^|]+)\|([^\]]+)\]\]/g)) {
        copy.append(line.slice(offset, match.index));
        const part = partFor(match[1]);
        copy.append(part ? partButton(part, match[2]) : match[2]);
        if (part) mentioned.add(part.ref);
        offset = match.index + match[0].length;
      }
      copy.append(line.slice(offset));
      return node('li', {}, copy);
    });
    section.append(node('ol', {}, ...entries));
  } else {
    section.append(node('p', {class: 'empty-notes'}, 'This board has no README excerpt in the archive.'));
  }
  const priority = p => ['U', 'A', 'J', 'SW', 'Q', 'Y', 'X', 'L'].findIndex(prefix => p.ref.startsWith(prefix));
  const parts = board.parts.filter(p => !mentioned.has(p.ref) && priority(p) >= 0 && !p.dnp)
    .sort((a, b) => priority(a) - priority(b)).slice(0, 9);
  if (parts.length) section.append(node('div', {class: 'parts-panel'},
    node('p', {class: 'section-kicker'}, 'Locate on PCB'),
    node('div', {class: 'part-pills'}, ...parts.map(p => partButton(p, p.ref + ' · ' + p.value, 'pill')))));
  const readmeUrl = asset(current.readme);
  const repo = current.link;
  const content = node('div', {class: 'readme-content'});
  const readme = node('details', {class: 'board-readme'},
    node('summary', {}, current.documentationLabel || 'Read full README'), content);
  readme.ontoggle = async () => {
    if (!readme.open || content.childNodes.length) return;
    content.textContent = 'Loading documentation…';
    try {
      const response = await fetch(readmeUrl);
      if (!response.ok) throw new Error('Documentation unavailable');
      content.innerHTML = markdown.render(await response.text(), {repo});
    } catch {
      content.replaceChildren(node('p', {}, 'Could not load the documentation.'),
        node('a', {href: readmeUrl}, 'Open the source text'));
    }
  };
  section.append(readme);
  if (repo) section.append(node('a', {href: repo, class: 'project-source'}, 'GitHub project ↗'));
  return section;
}

function renderProject() {
  const specs = [
    ['Scale', 'Fit', 'scale'],
    ['Board size', current.size.length ? current.size.map(n => n.toFixed(2)).join(' × ') + ' mm' : 'No board outline'],
    ['Stackup', current.copper ? current.copper + 'L' + (current.thickness ? ' · ' + current.thickness + ' mm' : '') : '—'],
  ];
  const hero = node('section', {class: 'hero'},
    node('div', {}, node('p', {class: 'eyebrow'}, current.group + ' / ' + String(archive.indexOf(current) + 1).padStart(2, '0')),
      node('h1', {}, current.title), node('p', {class: 'revision'}, current.rev)),
    node('dl', {class: 'specs'}, ...specs.map(([label, value, id]) =>
      node('div', {}, node('dt', {}, label), node('dd', id ? {id} : {}, value)))));
  const tabs = node('div', {class: 'tabs', role: 'tablist', 'aria-label': 'Board views'});
  views.forEach(([name, title], i) => {
    const tab = node('button', {type: 'button', class: 'tab', role: 'tab', id: 'tab-' + name,
      'aria-controls': 'view', 'data-view': name, tabindex: -1}, title);
    tab.onclick = () => openView(name);
    tab.onkeydown = event => {
      const next = {ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: views.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const target = views[(next + views.length) % views.length][0];
      openView(target);
      document.querySelector('#tab-' + target).focus();
    };
    tabs.append(tab);
  });
  const notes = renderNotes();
  const jumpToNotes = node('button', {class: 'jump-notes', type: 'button'}, 'Notes ↓');
  jumpToNotes.onclick = () => notes.scrollIntoView({block: 'start', behavior: scrollBehavior()});
  const viewer = node('section', {class: 'viewer', 'aria-label': 'Interactive board viewer'},
    node('div', {class: 'viewer-top'}, tabs, node('span', {class: 'viewer-tag'},
      node('i', {class: 'status-dot'}), 'KICAD / ' + current.id.toUpperCase()), jumpToNotes),
    node('div', {id: 'view', class: 'view', role: 'tabpanel', tabindex: 0}),
    node('div', {class: 'view-status'}, node('span', {id: 'view-hint'}), node('strong', {id: 'selection', 'aria-live': 'polite'})));
  project.replaceChildren(hero, node('div', {class: 'workbench'}, viewer, notes));
}

async function openView(name) {
  const request = ++viewRequest;
  dispose?.();
  dispose = null;
  view = {name};
  const container = document.querySelector('#view');
  const hint = document.querySelector('#view-hint');
  const selection = document.querySelector('#selection');
  const scale = document.querySelector('#scale');
  const parts = board.parts;
  container.replaceChildren();
  container.setAttribute('aria-labelledby', 'tab-' + name);
  document.querySelectorAll('.tab').forEach(tab => {
    const selected = tab.dataset.view === name;
    tab.setAttribute('aria-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
  });
  scale.textContent = '—';
  selection.textContent = '';
  const message = content => container.replaceChildren(node('p', {class: 'notice'}, content));
  if (name === 'pcb') {
    hint.textContent = 'Scroll or + / − to zoom · Drag or use arrow keys to pan';
    if (!Object.keys(board.plots).length) return message('No PCB layout was exported.');
    const pcb = mountPCB(container, board, asset, {
      onSelect: part => locate(part),
      onStatus: (zoom, part) => {
        scale.textContent = zoom;
        selection.textContent = part ? part.ref + ' · ' + part.value : '';
      }
    });
    dispose = pcb.dispose;
    view.focus = pcb.focus;
    if (activePart) pcb.focus(activePart);
  } else if (name === 'schematic') {
    hint.textContent = 'Scroll to zoom · Drag to pan';
    if (!board.sheets.length) return message('No schematic sheet was available for this design.');
    dispose = mountSchematic(container, board.sheets, asset, text => { scale.textContent = text; });
  } else if (name === 'bom') {
    hint.textContent = 'Select a reference to locate it on the PCB';
    if (!parts.some(p => p.bom)) return message('No BOM parts were exported for this design.');
    mountBOM(container, parts, partButton);
  } else {
    hint.textContent = 'Drag to orbit · Scroll to zoom';
    if (!board.model) return message('No 3D model was exported for this design.');
    const url = asset(board.model);
    const missing = board.missingModels.length;
    message('Loading KiCad 3D model…');
    try {
      const { mountModel } = await import('./model.js');
      if (request !== viewRequest) return;
      dispose = mountModel(container, url, missing);
    } catch {
      if (request === viewRequest) message('The 3D viewer could not start on this device.');
    }
  }
}

async function showBoard() {
  const request = ++boardRequest;
  const target = archive.find(b => '#' + b.id === location.hash) || archive[0];
  if (target === current && board) return;
  ++viewRequest;
  dispose?.();
  dispose = null;
  activePart = null;
  current = target;
  board = null;
  renderNav();
  project.replaceChildren(node('p', {class: 'notice'}, 'Loading ' + current.title + '…'));
  try {
    const response = await fetch(asset('data.json'));
    if (!response.ok) throw new Error('Board data unavailable');
    const data = await response.json();
    if (request !== boardRequest) return;
    board = data;
    renderProject();
    openView('pcb');
  } catch {
    if (request === boardRequest) project.replaceChildren(node('p', {class: 'notice'}, 'Could not load this board.'));
  }
}

document.querySelector('#open-index').onclick = () => {
  search.value = '';
  renderIndex();
  index.showModal();
  search.focus();
};
search.oninput = renderIndex;
try {
  const response = await fetch(root + 'index.json');
  if (!response.ok) throw new Error('Archive unavailable');
  archive = await response.json();
  document.querySelector('#board-catalogue').hidden = false;
  addEventListener('hashchange', showBoard);
  showBoard();
} catch {
  project.replaceChildren(node('p', {class: 'notice'}, 'Could not load the board archive.'));
}
