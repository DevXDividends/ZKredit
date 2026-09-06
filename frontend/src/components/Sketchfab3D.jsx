import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

/**
 * Renders ethereum_3d_logo.glb with Three.js.
 * - No background, no border box
 * - Full model visible, auto-centred and auto-scaled
 * - Slow Y-axis rotation, no user controls
 * - Fully responsive
 *
 * File must live at:  /public/3dmodel/ethereum_3d_logo.glb
 * (i.e. frontend/public/3dmodel/ethereum_3d_logo.glb)
 */
export default function Sketchfab3D({ className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth  || 460;
    const h = container.clientHeight || 460;

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ───────────────────────────────────────────────────────────────
    // We'll reposition it after the model loads, so start far back
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(0, 0, 10);

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(5, 8, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8899ff, 1.2);
    fill.position.set(-5, -3, -4);
    scene.add(fill);

    const top = new THREE.DirectionalLight(0xffffff, 1.0);
    top.position.set(0, 10, 0);
    scene.add(top);

    // ── Load GLB ─────────────────────────────────────────────────────────────
    let model = null;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Suppress the KHR_materials_pbrSpecularGlossiness warning — it's cosmetic,
    // Three.js still renders the material with its fallback.
    const origWarn = console.warn.bind(console);
    console.warn = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("KHR_materials_pbrSpecularGlossiness")) return;
      origWarn(...args);
    };

    loader.load(
      "/3dmodel/ethereum_3d_logo.glb",
      (gltf) => {
        console.warn = origWarn; // restore

        model = gltf.scene;

        // ── Centre + fit ──────────────────────────────────────────────────
        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());

        // Move model so its centre is at world origin
        model.position.sub(center);
        scene.add(model);

        // Pull the camera back so the whole model fits in view with padding
        const maxDim  = Math.max(size.x, size.y, size.z);
        const fovRad  = THREE.MathUtils.degToRad(camera.fov);
        // Distance so model fills ~75 % of viewport height
        const dist    = (maxDim / 2) / Math.tan(fovRad / 2) * 1.35;
        camera.position.set(0, 0, dist);
        camera.near   = dist * 0.01;
        camera.far    = dist * 10;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);

        console.log("[GLB] loaded — size:", size, "camera dist:", dist.toFixed(2));
      },
      (xhr) => {
        if (xhr.total) console.log(`[GLB] ${((xhr.loaded / xhr.total) * 100).toFixed(0)}%`);
      },
      (err) => {
        console.warn = origWarn;
        console.error("[GLB] load error:", err);
      }
    );

    // ── Block ALL user interaction ────────────────────────────────────────────
    const absorb = (e) => e.stopPropagation();
    const block  = (e) => { e.preventDefault(); e.stopPropagation(); };
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", absorb, true);
    canvas.addEventListener("pointermove", absorb, true);
    canvas.addEventListener("pointerup",   absorb, true);
    canvas.addEventListener("wheel",       block, { passive: false, capture: true });
    canvas.addEventListener("touchstart",  block, { passive: false, capture: true });
    canvas.addEventListener("touchmove",   block, { passive: false, capture: true });
    canvas.style.cursor      = "default";
    canvas.style.touchAction = "none";

    // ── Animation loop ────────────────────────────────────────────────────────
    let animId;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (model) model.rotation.y += delta * 0.65; // ~9.7 s / full revolution
      renderer.render(scene, camera);
    };
    animate();

    // ── Responsive resize ────────────────────────────────────────────────────
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      console.warn = origWarn;
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", absorb, true);
      canvas.removeEventListener("pointermove", absorb, true);
      canvas.removeEventListener("pointerup",   absorb, true);
      canvas.removeEventListener("wheel",       block, true);
      canvas.removeEventListener("touchstart",  block, true);
      canvas.removeEventListener("touchmove",   block, true);
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  return (
    <div
      className={`relative w-full mx-auto ${className}`}
      style={{ maxWidth: "480px", aspectRatio: "1 / 1" }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}