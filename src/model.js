import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { node } from './main.js';

function prepareBoardLayers(doc) {
  const roots = doc.scenes.flatMap(scene => scene.nodes);
  const layerIds = new Set(roots.flatMap(id => doc.nodes[id].children ?? []));
  const opaqueMaterials = new Map();
  for (const id of layerIds) {
    const layer = doc.nodes[id];
    if (layer.mesh === undefined) continue;
    const primitives = doc.meshes[layer.mesh].primitives;
    const first = primitives[0];
    const ink = doc.materials[first.material]?.pbrMetallicRoughness?.baseColorFactor;
    // KiCad exports each face's white silkscreen as a separate planar mesh.
    if (ink && Math.abs(ink[3] - .9) < .001 && ink.slice(0, 3).every(channel => channel === 1)) {
      const axis = 1; // KiCad GLB exports use Y as the board normal.
      const height = doc.accessors[first.attributes.POSITION].min[axis];
      if (primitives.every(primitive => {
        const position = doc.accessors[primitive.attributes.POSITION];
        return position.min[axis] === height && position.max[axis] === height;
      })) layer.extras = {...layer.extras, silkscreenHeight: height};
    }
    // Match Stackview: make all PCB layer materials opaque, without
    // changing materials shared with nested component assemblies.
    for (const primitive of primitives) {
      const index = primitive.material;
      const material = doc.materials[index];
      const color = material?.pbrMetallicRoughness?.baseColorFactor;
      if (!material || (material.alphaMode !== 'BLEND' && !(color?.[3] < 1))) continue;
      if (!opaqueMaterials.has(index)) {
        opaqueMaterials.set(index, doc.materials.length);
        doc.materials.push({...material, alphaMode: 'OPAQUE', pbrMetallicRoughness: {
          ...material.pbrMetallicRoughness, baseColorFactor: [...(color ?? [1, 1, 1]).slice(0, 3), 1],
        }});
      }
      primitive.material = opaqueMaterials.get(index);
    }
  }
}

function release(scene) {
  const disposed = new Set();
  const free = resource => {
    if (!resource || disposed.has(resource)) return;
    disposed.add(resource);
    resource.dispose();
  };
  scene.traverse(object => {
    free(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      Object.values(material).filter(value => value?.isTexture).forEach(free);
      free(material);
    }
  });
}

export function mountModel(container, url, missing, renderOnChange = false) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const stage = node('div', {class: 'model'});
  const message = node('p', {class: 'notice', role: 'status'}, 'Loading KiCad 3D model…');
  const fitButton = node('button', {type: 'button', 'aria-label': 'Reset 3D camera'}, 'Fit');
  const topButton = node('button', {type: 'button', 'aria-label': 'View 3D model from the top'}, 'Top');
  const buttons = node('div', {class: 'canvas-buttons'}, topButton, fitButton);
  stage.append(renderer.domElement, buttons, message);
  container.replaceChildren(stage);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20282c);
  const camera = new THREE.PerspectiveCamera(36, 1, .001, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.enableDamping = !reduced;
  controls.dampingFactor = .12;
  scene.add(new THREE.HemisphereLight(0xf6fffd, 0x8995a0, 2.4));
  for (const [x, y, z, intensity] of [[3, 5, 2, 3], [-3, 2, -4, 2]]) {
    const light = new THREE.DirectionalLight(0xfff7e7, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  let disposed = false;
  let frame = 0;
  let radius = 1;
  let ready = false;
  let assembly;
  const silkscreens = [];
  const localEye = new THREE.Vector3();

  function requestRender() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }

  function reset(top = false) {
    if (!ready) return;
    const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
    const angle = Math.min(halfAngle, Math.atan(Math.tan(halfAngle) * camera.aspect));
    const distance = radius / Math.sin(angle) * 1.12;
    camera.position.copy(new THREE.Vector3(...(top ? [0, 1, .001] : [.28, .88, .55])).normalize().multiplyScalar(distance));
    controls.target.set(0, 0, 0);
    controls.update();
    requestRender();
  }
  fitButton.onclick = () => reset();
  topButton.onclick = () => reset(true);

  function resize() {
    if (!stage.clientWidth || !stage.clientHeight) return;
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    requestRender();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  function draw() {
    frame = 0;
    const moved = controls.update();
    if (silkscreens.length) {
      assembly.worldToLocal(localEye.copy(camera.position));
      for (const layer of silkscreens) {
        const height = layer.userData.silkscreenHeight;
        layer.visible = height > 0 ? localEye.y > height : localEye.y < height;
      }
    }
    renderer.render(scene, camera);
    if (!renderOnChange || moved) requestRender();
  }
  if (renderOnChange) controls.addEventListener('change', requestRender);
  requestRender();

  const loader = new GLTFLoader();
  loader.register(parser => ({
    name: 'KiCadBoardLayers',
    beforeRoot: () => prepareBoardLayers(parser.json),
  }));
  loader.load(url, ({scene: model}) => {
    if (disposed) return release(model);
    assembly = model;
    model.traverse(object => {
      if (Number.isFinite(object.userData.silkscreenHeight)) silkscreens.push(object);
    });
    for (const layer of silkscreens) {
      layer.traverse(mesh => {
        if (!mesh.isMesh) return;
        for (const material of [mesh.material].flat()) {
          // Keep the soft white ink readable on either face. Bias its depth
          // toward the camera so it does not compete with the solder mask.
          material.color.set(0x000000);
          material.emissive.set(0xd5d5d5);
          material.emissiveIntensity = 1;
          material.toneMapped = false;
          material.polygonOffset = true;
          material.polygonOffsetFactor = -1;
          material.polygonOffsetUnits = -4;
        }
      });
    }
    const wrapper = new THREE.Group();
    wrapper.add(model);
    const nativeSize = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
    if (nativeSize.z < nativeSize.y * .5 && nativeSize.z < nativeSize.x * .5) wrapper.rotation.x = -Math.PI / 2;
    const bounds = new THREE.Box3().setFromObject(wrapper);
    const center = bounds.getCenter(new THREE.Vector3());
    radius = Math.max(.0001, bounds.getBoundingSphere(new THREE.Sphere()).radius);
    wrapper.position.sub(center);
    scene.add(wrapper);
    camera.near = radius / 100;
    camera.far = radius * 80;
    camera.updateProjectionMatrix();
    controls.minDistance = radius * .15;
    controls.maxDistance = radius * 15;
    ready = true;
    reset();
    if (missing) {
      message.className = 'overlay-info';
      message.textContent = missing + ' footprint' + (missing === 1 ? '' : 's') + ' with unavailable 3D models';
    } else message.remove();
  }, undefined, () => {
    if (!disposed) message.textContent = 'This 3D file could not be loaded.';
  });

  return () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    controls.dispose();
    release(scene);
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
