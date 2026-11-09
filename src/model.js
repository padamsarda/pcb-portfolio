import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { node } from './main.js';

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

export function mountModel(container, url, missing) {
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

  function reset(top = false) {
    if (!ready) return;
    const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
    const angle = Math.min(halfAngle, Math.atan(Math.tan(halfAngle) * camera.aspect));
    const distance = radius / Math.sin(angle) * 1.12;
    camera.position.copy(new THREE.Vector3(...(top ? [0, 1, .001] : [.28, .88, .55])).normalize().multiplyScalar(distance));
    controls.target.set(0, 0, 0);
    controls.update();
  }
  fitButton.onclick = () => reset();
  topButton.onclick = () => reset(true);

  function resize() {
    if (!stage.clientWidth || !stage.clientHeight) return;
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  const draw = () => {
    controls.update();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);

  const loader = new GLTFLoader();
  loader.register(parser => ({
    name: 'OpaqueKiCadSubstrate',
    beforeRoot() {
      // KiCad exports the laminate with 98% opacity. Make it write depth
      // before the transparent solder mask and silkscreen are drawn.
      const laminate = [.42, .45, .29, .98];
      for (const material of parser.json.materials ?? []) {
        const color = material.pbrMetallicRoughness?.baseColorFactor;
        if (material.alphaMode === 'BLEND' && color?.length === laminate.length &&
            color.every((channel, i) => Math.abs(channel - laminate[i]) < .001)) {
          material.alphaMode = 'OPAQUE';
          color[3] = 1;
        }
      }
    },
  }));
  loader.load(url, ({scene: model}) => {
    if (disposed) return release(model);
    const wrapper = new THREE.Group();
    wrapper.add(model);
    const nativeSize = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
    if (nativeSize.z < nativeSize.y * .5 && nativeSize.z < nativeSize.x * .5) wrapper.rotation.x = -Math.PI / 2;
    const bounds = new THREE.Box3().setFromObject(wrapper);
    const center = bounds.getCenter(new THREE.Vector3());
    radius = Math.max(.0001, bounds.getBoundingSphere(new THREE.Sphere()).radius);
    wrapper.position.sub(center);
    scene.add(wrapper);
    camera.near = radius / 1000;
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
