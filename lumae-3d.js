async function loadThree() {
  for (const source of [
    './node_modules/three/build/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js'
  ]) {
    try { return await import(source); } catch (error) { /* Continue to the next source. */ }
  }
  throw new Error('Three.js could not be loaded');
}

const THREE = await loadThree().catch(error => {
  console.warn('Lumae 3D scenes are unavailable:', error);
  return null;
});

if (THREE) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mat(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, metalness: .58, roughness: .28, ...options });
  }

  function roundedShape(width, height, radius) {
    const x = -width / 2, y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }

  function extrude(shape, depth, material, bevel = .04) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelSegments: 3, steps: 1,
      bevelSize: bevel, bevelThickness: bevel
    });
    geometry.center();
    return new THREE.Mesh(geometry, material);
  }

  function createStage(canvas, cameraZ) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
    camera.position.set(0, 0, cameraZ);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.HemisphereLight(0xd8e7ff, 0x08060e, 2.2));
    const pink = new THREE.PointLight(0xff45b7, 35, 15);
    pink.position.set(-2, 3, 3);
    scene.add(pink);
    const amber = new THREE.PointLight(0xffa64c, 24, 14);
    amber.position.set(2, 3.5, -1);
    scene.add(amber);
    const cyan = new THREE.PointLight(0x35d9ff, 18, 13);
    cyan.position.set(3, -2, 3);
    scene.add(cyan);

    let width = 1, height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(canvas);
    resize();

    let targetX = 0, targetY = 0, startX = 0, startY = 0, dragging = false;
    canvas.addEventListener('pointerdown', event => {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* Synthetic pointers need no capture. */ }
    });
    canvas.addEventListener('pointermove', event => {
      if (!dragging) return;
      targetY += (event.clientX - startX) * .008;
      targetX += (event.clientY - startY) * .006;
      startX = event.clientX;
      startY = event.clientY;
      canvas.dataset.userRotation = `${targetX.toFixed(2)},${targetY.toFixed(2)}`;
    });
    const stop = () => { dragging = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    const startTime = performance.now();
    const rig = new THREE.Group();
    scene.add(rig);
    const models = new Map();
    let pixelCheckDone = false;
    let inViewport = true;
    let currentUpdate = null;
    const visibility = new IntersectionObserver(entries => {
      inViewport = entries.some(entry => entry.isIntersecting);
    }, { rootMargin: '160px' });
    visibility.observe(canvas);
    function animate() {
      requestAnimationFrame(animate);
      if (!inViewport) return;
      const time = (performance.now() - startTime) / 1000;
      const autoY = reducedMotion ? 0 : Math.sin(time * .2) * .13;
      const autoX = reducedMotion ? 0 : Math.sin(time * .16) * .035;
      rig.rotation.y += (autoY + targetY - rig.rotation.y) * .045;
      rig.rotation.x += (autoX + targetX - rig.rotation.x) * .045;
      currentUpdate?.(time);
      renderer.render(scene, camera);
      if (!pixelCheckDone && renderer.info.render.triangles > 0) {
        pixelCheckDone = true;
        const gl = renderer.getContext();
        const sample = new Uint8Array(4);
        let pixel = '';
        for (let y = .25; y <= .75 && !pixel; y += .1) {
          for (let x = .2; x <= .8 && !pixel; x += .1) {
            gl.readPixels(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, sample);
            if (sample[3] > 8 && sample[0] + sample[1] + sample[2] > 18) pixel = Array.from(sample).join(',');
          }
        }
        canvas.dataset.sceneTriangles = String(renderer.info.render.triangles);
        canvas.dataset.scenePixel = pixel;
        canvas.dataset.sceneReady = String(renderer.info.render.triangles > 0 && Boolean(pixel));
      }
    }
    animate();
    function registerScene(name, group, updateFn) {
      group.visible = false;
      rig.add(group);
      models.set(name, { group, updateFn });
    }
    function selectScene(name) {
      const selected = models.get(name);
      if (!selected) return;
      models.forEach(model => { model.group.visible = model === selected; });
      currentUpdate = selected.updateFn;
      pixelCheckDone = false;
      canvas.dataset.sceneReady = 'false';
    }
    return { scene, camera, rig, renderer, registerScene, selectScene, getSize() { return { width, height }; } };
  }

  function makeLogo(stage) {
    const rig = new THREE.Group();
    rig.scale.setScalar(1.38);
    const badge = new THREE.Group();
    badge.rotation.set(-.08, -.12, -.035);
    rig.add(badge);

    const backplate = extrude(roundedShape(3.05, 3.05, .48), .42, new THREE.MeshPhysicalMaterial({
      color: 0x09090b, metalness: .42, roughness: .24, clearcoat: 1, clearcoatRoughness: .18,
      emissive: 0x100e15, emissiveIntensity: .12
    }), .09);
    badge.add(backplate);

    const face = extrude(roundedShape(2.88, 2.88, .48), .12, new THREE.MeshPhysicalMaterial({
      color: 0x18181b, metalness: .26, roughness: .34, clearcoat: .82, clearcoatRoughness: .26
    }), .075);
    face.position.z = .27;
    badge.add(face);

    const bubble = new THREE.Shape();
    bubble.moveTo(-.94, -.48);
    bubble.lineTo(.72, -.48);
    bubble.quadraticCurveTo(1.02, -.48, 1.02, -.18);
    bubble.lineTo(1.02, .65);
    bubble.quadraticCurveTo(1.02, .95, .72, .95);
    bubble.lineTo(-.69, .95);
    bubble.quadraticCurveTo(-.99, .95, -.99, .65);
    bubble.lineTo(-.99, -.16);
    bubble.quadraticCurveTo(-.99, -.48, -.69, -.48);
    bubble.lineTo(-.55, -.48);
    bubble.quadraticCurveTo(-.65, -.67, -.78, -.88);
    bubble.quadraticCurveTo(-.81, -.95, -.73, -.92);
    bubble.quadraticCurveTo(-.47, -.78, -.29, -.48);
    bubble.closePath();
    const bubbleMesh = extrude(bubble, .18, new THREE.MeshPhysicalMaterial({
      color: 0x414145, metalness: .18, roughness: .38, clearcoat: .72, clearcoatRoughness: .3
    }), .065);
    bubbleMesh.position.z = .39;
    badge.add(bubbleMesh);

    const glyph = new THREE.Shape();
    glyph.moveTo(-.31, -.42);
    glyph.lineTo(-.02, -.42);
    glyph.lineTo(-.02, .38);
    glyph.quadraticCurveTo(-.02, .49, -.13, .49);
    glyph.lineTo(-.31, .49);
    glyph.quadraticCurveTo(-.42, .49, -.42, .38);
    glyph.lineTo(-.42, -.54);
    glyph.quadraticCurveTo(-.42, -.65, -.31, -.65);
    glyph.lineTo(.45, -.65);
    glyph.quadraticCurveTo(.56, -.65, .56, -.54);
    glyph.lineTo(.56, -.36);
    glyph.quadraticCurveTo(.56, -.25, .45, -.25);
    glyph.lineTo(-.31, -.25);
    glyph.closePath();
    const glyphShadow = extrude(glyph, .035, new THREE.MeshStandardMaterial({ color: 0x222226, metalness: .12, roughness: .5 }), .035);
    glyphShadow.position.set(.02, -.07, .57);
    badge.add(glyphShadow);
    const glyphMesh = extrude(glyph, .055, new THREE.MeshPhysicalMaterial({ color: 0x101013, metalness: .18, roughness: .34, clearcoat: .5, clearcoatRoughness: .28 }), .025);
    glyphMesh.position.set(0, -.015, .6);
    badge.add(glyphMesh);

    const edgeLight = new THREE.PointLight(0x9374aa, 8, 8);
    edgeLight.position.set(-2.4, 1.8, 2.2);
    rig.add(edgeLight);
    const softBlue = new THREE.PointLight(0x6e929c, 5, 7);
    softBlue.position.set(2, -2.1, 1.8);
    rig.add(softBlue);

    stage.registerScene('logo', rig, time => {
      if (reducedMotion) return;
      badge.position.y = Math.sin(time * .55) * .035;
      badge.rotation.y = -.12 + Math.sin(time * .22) * .08;
    });
  }

  function makeServerNetwork(stage) {
    const rig = new THREE.Group();
    const nodes = [
      [0, 0, 0, true], [0, 2.15, -.12], [-2.1, 1.08, -.18], [2.1, 1.08, -.18],
      [-2.1, -1.08, -.18], [2.1, -1.08, -.18], [0, -2.15, -.12]
    ];
    const center = new THREE.Vector3(0, 0, 0);
    const links = new THREE.Group();
    rig.add(links);
    nodes.slice(1).forEach((point, index) => {
      const end = new THREE.Vector3(point[0], point[1], point[2]);
      const direction = new THREE.Vector3().subVectors(end, center);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, direction.length(), 8), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x6d64c9 : 0x38d7e8, transparent: true, opacity: .58 }));
      cable.position.copy(center).add(end).multiplyScalar(.5);
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      links.add(cable);
    });

    const nodeGroups = [];
    nodes.forEach((point, index) => {
      const node = new THREE.Group();
      node.position.set(point[0], point[1], point[2]);
      node.rotation.set(.12, -.18, .06);
      rig.add(node);
      const size = index === 0 ? 1.16 : .92;
      const violet = index === 0;
      const bodyMaterial = mat(violet ? 0x6249b5 : 0x30333d, { transparent: true, opacity: .84, metalness: .42, roughness: .26, emissive: violet ? 0x29135c : 0x080b12, emissiveIntensity: .45 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), bodyMaterial);
      node.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: violet ? 0xd3adff : 0xd3d7e3, transparent: true, opacity: .92 }));
      node.add(edges);
      const faceMat = new THREE.MeshBasicMaterial({ color: violet ? 0x8a68ea : 0x171a21, transparent: true, opacity: .78, side: THREE.DoubleSide });
      const front = new THREE.Mesh(new THREE.PlaneGeometry(size * .72, size * .7), faceMat);
      front.position.z = size * .504;
      node.add(front);
      for (let led = 0; led < 3; led++) {
        const light = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: led === 1 ? 0x57edcd : 0xf0ecff }));
        light.position.set(.18 + led * .1, -.13, size * .53);
        light.userData.phase = index * .6 + led;
        node.add(light);
      }
      for (let line = 0; line < 2; line++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(size * .32, .025, .014), new THREE.MeshBasicMaterial({ color: 0xf2efff, transparent: true, opacity: .88 }));
        vent.position.set(-.13, .13 - line * .13, size * .52);
        node.add(vent);
      }
      nodeGroups.push(node);
    });

    const platform = new THREE.Group();
    platform.position.set(0, -2.75, -.28);
    rig.add(platform);
    [0, 1, 2].forEach(layer => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.3 - layer * .12, .11, .7 - layer * .06), mat(layer === 1 ? 0x176b82 : 0x272a38, { metalness: .68, roughness: .24, emissive: layer === 1 ? 0x073a55 : 0x0a0b11, emissiveIntensity: .45 }));
      slab.position.y = layer * .18;
      platform.add(slab);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: layer === 1 ? 0x41d7f2 : 0xa687ff, transparent: true, opacity: .85 }));
      edge.position.copy(slab.position);
      platform.add(edge);
    });

    const orbiters = new THREE.Group();
    rig.add(orbiters);
    for (let i = 0; i < 24; i++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(.025 + Math.random() * .028, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xb392ff : 0x44e8f1, transparent: true, opacity: .82 }));
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.4 + Math.random() * .9;
      bead.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .7, -.2 + Math.random() * .7);
      bead.userData.phase = angle;
      orbiters.add(bead);
    }
    stage.registerScene('network', rig, time => {
      if (reducedMotion) return;
      nodeGroups.forEach((node, index) => {
        node.position.y = nodes[index][1] + Math.sin(time * .8 + index * .7) * .045;
        node.children.forEach(child => {
          if (child.geometry?.type === 'SphereGeometry') child.material.opacity = .6 + Math.sin(time * 2 + child.userData.phase) * .32;
        });
      });
      platform.rotation.y = Math.sin(time * .32) * .035;
      orbiters.rotation.z = time * .055;
    });
  }

  function makeOrbit(stage) {
    const rig = new THREE.Group();
    const orbit = new THREE.Group();
    orbit.rotation.set(.12, -.04, -.12);
    rig.add(orbit);

    const moduleCount = 22;
    for (let i = 0; i < moduleCount; i++) {
      const angle = (i / moduleCount) * Math.PI * 2;
      const block = new THREE.Group();
      block.position.set(Math.cos(angle) * 2.15, Math.sin(angle) * 2.15, Math.sin(angle * 2) * .12);
      block.rotation.z = angle + Math.PI / 4;
      block.rotation.x = Math.sin(angle) * .11;
      orbit.add(block);
      const size = .48 + (i % 4 === 0 ? .09 : 0);
      const stone = new THREE.Mesh(new THREE.BoxGeometry(size, size, .8), mat(i % 5 === 0 ? 0x353344 : 0x1b1d26, { metalness: .52, roughness: .34, emissive: i % 6 === 0 ? 0x171044 : 0x080910, emissiveIntensity: .6 }));
      block.add(stone);
      block.add(new THREE.LineSegments(new THREE.EdgesGeometry(stone.geometry), new THREE.LineBasicMaterial({ color: i % 4 === 0 ? 0xc4b1ff : 0x777987, transparent: true, opacity: .72 })));
      for (let dot = 0; dot < 9; dot++) {
        const mote = new THREE.Mesh(new THREE.SphereGeometry(.012 + Math.random() * .018, 6, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf1eaff : 0x9a7dff, transparent: true, opacity: .58 }));
        mote.position.set((Math.random() - .5) * size, (Math.random() - .5) * size, .42 + Math.random() * .08);
        block.add(mote);
      }
    }

    const innerOrbit = new THREE.Mesh(new THREE.TorusGeometry(1.56, .018, 6, 96), new THREE.MeshBasicMaterial({ color: 0x9b84ed, transparent: true, opacity: .5 }));
    innerOrbit.position.z = -.16;
    orbit.add(innerOrbit);
    const motes = new THREE.Group();
    rig.add(motes);
    for (let i = 0; i < 48; i++) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(.012 + Math.random() * .024, 6, 5), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xe9e4f6 : 0xc596ff, transparent: true, opacity: .72 }));
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.65 + Math.random() * .85;
      mote.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .72, (Math.random() - .5) * 1.1);
      mote.userData.phase = angle;
      mote.userData.radius = radius;
      motes.add(mote);
    }
    stage.registerScene('orbit', rig, time => {
      if (reducedMotion) return;
      orbit.rotation.z = -.12 + time * .11;
      motes.rotation.z = -time * .035;
      motes.children.forEach((mote, index) => {
        mote.material.opacity = .28 + (Math.sin(time * 1.8 + index) + 1) * .24;
      });
    });
  }

  function makeStack(stage) {
    const rig = new THREE.Group();
    const stack = new THREE.Group();
    stack.rotation.set(.28, -.28, -.08);
    rig.add(stack);

    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, .62, 1.8), mat(0x151a24, { metalness: .76, roughness: .25 }));
    base.position.y = -1.62;
    stack.add(base);
    stack.add(new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), new THREE.LineBasicMaterial({ color: 0x4ae0d2, transparent: true, opacity: .9 })));
    for (let i = 0; i < 5; i++) {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(.48, .4, .06), mat(0x242a37, { metalness: .48, roughness: .3, emissive: 0x0d1521, emissiveIntensity: .5 }));
      bay.position.set(-1.08 + i * .54, -1.62, .94);
      stack.add(bay);
      const led = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x49e4c7 : 0xa98aff }));
      led.position.set(-1.18 + i * .54, -1.52, 1.02);
      led.userData.phase = i * .8;
      stack.add(led);
      for (let vent = 0; vent < 2; vent++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(.27, .018, .014), new THREE.MeshBasicMaterial({ color: 0x858da2, transparent: true, opacity: .65 }));
        line.position.set(-1.03 + i * .54, -1.68 - vent * .07, 1.02);
        stack.add(line);
      }
    }

    const compute = new THREE.Group();
    compute.position.y = -.34;
    stack.add(compute);
    for (let layer = 0; layer < 3; layer++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.7 - layer * .2, .14, 1.44 - layer * .1), mat(layer === 1 ? 0x155366 : 0x222633, { metalness: .68, roughness: .24, emissive: layer === 1 ? 0x064457 : 0x0b0c16, emissiveIntensity: .7 }));
      slab.position.y = layer * .25;
      compute.add(slab);
      compute.add(new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: layer === 1 ? 0x50dff3 : 0x9d8bff, transparent: true, opacity: .88 })));
    }
    for (let i = 0; i < 4; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(.58, .58, .58), mat(0x30294b, { metalness: .5, roughness: .24, emissive: 0x1c1243, emissiveIntensity: .55 }));
      cube.position.set(i % 2 ? .38 : -.38, .96 + Math.floor(i / 2) * .1, i < 2 ? -.38 : .38);
      stack.add(cube);
      stack.add(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0xc39cff, transparent: true, opacity: .9 })));
    }

    const halos = new THREE.Group();
    stack.add(halos);
    for (let i = 0; i < 18; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.018 + Math.random() * .018, 6, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x45dfeb : 0xc59aff, transparent: true, opacity: .72 }));
      const angle = (i / 18) * Math.PI * 2;
      dot.position.set(Math.cos(angle) * 2, Math.sin(angle) * 1.55, .1);
      dot.userData.phase = angle;
      halos.add(dot);
    }
    stage.registerScene('stack', rig, time => {
      if (reducedMotion) return;
      stack.rotation.y = -.28 + Math.sin(time * .32) * .16;
      compute.position.y = -.34 + Math.sin(time * .9) * .055;
      halos.rotation.y = time * .08;
      stack.children.forEach(child => {
        if (child.geometry?.type === 'SphereGeometry') child.material.opacity = .38 + (Math.sin(time * 2 + child.userData.phase) + 1) * .2;
      });
    });
  }

  const canvas = document.getElementById('lumae-3d-canvas');
  if (canvas) {
    const stage = createStage(canvas, 9.8);
    makeServerNetwork(stage);
    makeLogo(stage);
    makeOrbit(stage);
    makeStack(stage);
    const descriptions = {
      network: ['СЕТЬ И ИНФРАСТРУКТУРА', 'Сеть Lumae', 'Связанные узлы, центральный сервер и световые импульсы.'],
      logo: ['ОБЪЁМНЫЙ ЗНАК', 'Логотип Lumae', 'Чёрная скульптурная плитка с рельефным знаком и мягкими отражениями.'],
      orbit: ['ДВИЖЕНИЕ ДАННЫХ', 'Орбитальный контур', 'Сегментированное кольцо с мерцающими частицами.'],
      stack: ['СЛОИ ИНФРАСТРУКТУРЫ', 'Слои серверной', 'Приложения, вычислительная платформа и серверные модули.']
    };
    const buttons = [...document.querySelectorAll('[data-3d-scene]')];
    const select = name => {
      stage.selectScene(name);
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset['3dScene'] === name)));
      const [kicker, title, description] = descriptions[name];
      document.getElementById('feature-3d-kicker').textContent = kicker;
      document.getElementById('feature-3d-title').textContent = title;
      document.getElementById('feature-3d-description').textContent = description;
    };
    buttons.forEach(button => button.addEventListener('click', () => select(button.dataset['3dScene'])));
    select('network');
  }
}
