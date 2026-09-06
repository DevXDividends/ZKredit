import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Immersive 3D visualization of the ZKredit peer network: nodes arranged on a
 * sphere, connected to their nearest neighbors, with light "pulses" traveling
 * along edges to represent proofs/gossip propagating in real time. Drag to
 * orbit, scroll to zoom — an explorable, VR-adjacent view of the network.
 */
export default function NetworkGraph3D({ className = "", nodeCount = 46, height = "h-[420px] sm:h-[560px]" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let heightPx = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.045);

    const camera = new THREE.PerspectiveCamera(52, width / heightPx, 0.1, 200);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, heightPx);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 26;

    const group = new THREE.Group();
    scene.add(group);

    // --- Nodes: fibonacci sphere distribution ---------------------------------
    const RADIUS = 6.2;
    const positions = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < nodeCount; i++) {
      const y = 1 - (i / (nodeCount - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      positions.push(new THREE.Vector3(x, y, z).multiplyScalar(RADIUS));
    }

    const validatorIdx = new Set();
    while (validatorIdx.size < Math.max(4, Math.floor(nodeCount * 0.12))) {
      validatorIdx.add(Math.floor(Math.random() * nodeCount));
    }

    const nodeGeoSmall = new THREE.SphereGeometry(0.055, 10, 10);
    const nodeGeoBig = new THREE.SphereGeometry(0.11, 14, 14);
    const matNode = new THREE.MeshBasicMaterial({ color: 0xe8e8e6 });
    const matValidator = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const nodeMeshes = [];
    positions.forEach((p, i) => {
      const isValidator = validatorIdx.has(i);
      const mesh = new THREE.Mesh(isValidator ? nodeGeoBig : nodeGeoSmall, isValidator ? matValidator : matNode);
      mesh.position.copy(p);
      group.add(mesh);
      nodeMeshes.push(mesh);

      if (isValidator) {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
        );
        glow.position.copy(p);
        group.add(glow);
      }
    });

    // --- Edges: connect each node to its k nearest neighbors -------------------
    const K = 3;
    const edgeSet = new Set();
    const edges = [];
    positions.forEach((p, i) => {
      const dists = positions
        .map((q, j) => ({ j, d: i === j ? Infinity : p.distanceTo(q) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, K);
      dists.forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([i, j]);
        }
      });
    });

    const edgeGeometry = new THREE.BufferGeometry();
    const edgePositions = new Float32Array(edges.length * 2 * 3);
    edges.forEach(([a, b], idx) => {
      edgePositions.set([positions[a].x, positions[a].y, positions[a].z], idx * 6);
      edgePositions.set([positions[b].x, positions[b].y, positions[b].z], idx * 6 + 3);
    });
    edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.55 });
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    group.add(edgeLines);

    // --- Ambient starfield -------------------------------------------------
    const starGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x555555, size: 0.05, transparent: true, opacity: 0.6 })
    );
    scene.add(stars);

    // --- Pulses: small bright dots that travel along a random edge ----------
    const MAX_PULSES = 10;
    const pulseGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const pulses = [];

    function spawnPulse() {
      if (pulses.length >= MAX_PULSES || edges.length === 0) return;
      const [a, b] = edges[Math.floor(Math.random() * edges.length)];
      const good = Math.random() > 0.12;
      const mat = new THREE.MeshBasicMaterial({ color: good ? 0xffffff : 0xff5c5c });
      const mesh = new THREE.Mesh(pulseGeo, mat);
      group.add(mesh);
      pulses.push({ mesh, from: positions[a], to: positions[b], t: 0, speed: 0.5 + Math.random() * 0.6 });
    }
    const spawnTimer = setInterval(spawnPulse, 260);

    // --- Resize handling ------------------------------------------------------
    const onResize = () => {
      width = container.clientWidth;
      heightPx = container.clientHeight;
      camera.aspect = width / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(width, heightPx);
    };
    window.addEventListener("resize", onResize);

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      group.rotation.y += 0.0006;

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += dt * p.speed;
        if (p.t >= 1) {
          group.remove(p.mesh);
          p.mesh.geometry.dispose?.();
          p.mesh.material.dispose();
          pulses.splice(i, 1);
          continue;
        }
        p.mesh.position.lerpVectors(p.from, p.to, p.t);
      }

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(spawnTimer);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      pulses.forEach((p) => {
        p.mesh.geometry.dispose?.();
        p.mesh.material.dispose();
      });
      nodeMeshes.forEach((m) => m.geometry.dispose?.());
      matNode.dispose();
      matValidator.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      starGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [nodeCount]);

  return (
    <div className={`relative ${height} ${className}`}>
      <div ref={containerRef} className="absolute inset-0 rounded-3xl overflow-hidden" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-ink-border" />
      <div className="pointer-events-none absolute top-4 left-4 font-mono text-[10px] text-paper-dim tracking-widest uppercase">
        drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
