import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Person {
  id: string;
  name: string;
}

export default function Tree3D({ treeData }: { treeData: any }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.z = 50;

    // Build tree (simple flat layout for now)
    (treeData.people || []).forEach((person: Person, i: number) => {
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x5850ec });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(i * 5 - (treeData.people.length - 1) * 2.5, 0, 0);
      scene.add(sphere);

      // Label
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = '20px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(person.name, 0, 20);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
      sprite.position.set(i * 5 - (treeData.people.length - 1) * 2.5, 2, 0);
      scene.add(sprite);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [treeData]);

  return <div ref={mountRef} className="w-full h-[600px]" />;
}
