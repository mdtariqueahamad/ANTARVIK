import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { X, Activity, Droplets, Zap, Shield, Radio } from 'lucide-react';

// Create a custom hook to generate the entire Bharati Station procedurally
const useBharatiStation = () => {
  return useMemo(() => {
    const group = new THREE.Group();
    const equipment = [];
    const labels = [];

    const mats = {
      ground: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 1 }), // Darker ground to fit UI
      snow: new THREE.MeshStandardMaterial({ color: 0xdce9ee, roughness: 0.9, transparent: true, opacity: 0.2 }),
      main: new THREE.MeshStandardMaterial({ color: 0x8caebe, roughness: 0.7 }),
      roof: new THREE.MeshStandardMaterial({ color: 0xd9e5e8, roughness: 0.8 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.2 }), // Premium blue
      red: new THREE.MeshStandardMaterial({ color: 0xb95039, roughness: 0.8 }),
      container: new THREE.MeshStandardMaterial({ color: 0xd87935, roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xaed8e9, transmission: 0.9, transparent: true, roughness: 0.1 }),
      panel: new THREE.MeshStandardMaterial({ color: 0x172b3c, roughness: 0.45, metalness: 0.35 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf0f4f4, roughness: 0.8 }),
      pipe: new THREE.MeshStandardMaterial({ color: 0x33444b, roughness: 0.75 }),
      green: new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9 }),
      brown: new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xd4c73b, roughness: 0.9 }),
      warmLight: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, emissive: 0x38bdf8, emissiveIntensity: 2 }), // Cyan glowing windows
      cyan: new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.8 }),
    };

    function statusMeta(status, type, metrics) {
      return { status, type, metrics };
    }

    function box(name, x, y, z, sx, sy, sz, mat, meta = null) {
      const g = new THREE.Group(); g.name = name;
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.castShadow = true; m.receiveShadow = true; g.add(m);
      g.position.set(x, y, z);
      if (meta) { g.userData = { ...meta, name }; equipment.push(g); }
      group.add(g); return g;
    }

    // Main Station Build Logic Ported
    const terrain = new THREE.Mesh(new THREE.CylinderGeometry(245, 245, 4, 96), mats.ground);
    terrain.position.y = -2; terrain.receiveShadow = true; group.add(terrain);

    // Snow patches
    for(const [sx,sz,sr] of [[20,10,32],[-15,30,28],[50,20,22],[0,48,20],[38,55,16]]) {
      const s = new THREE.Mesh(new THREE.CircleGeometry(sr, 32), mats.snow);
      s.rotation.x = -Math.PI / 2; s.scale.y = 0.55; s.position.set(sx, 0.05, sz); group.add(s);
    }

    // MAIN U-SHAPED STATION
    const main = new THREE.Group(); main.name = "Main Research Station";
    function wing(x, z, sx, sz) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(sx, 15, sz), mats.blue);
      body.position.set(x, 12, z); body.castShadow = true; body.receiveShadow = true; main.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(sx + 1.2, 1.5, sz + 1.2), mats.roof);
      roof.position.set(x, 20, z); roof.castShadow = true; main.add(roof);
      // Windows
      for (let i = -Math.floor(sx / 2) + 5; i < Math.floor(sx / 2) - 2; i += 8) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3, 0.3), mats.warmLight);
        w.position.set(x + i, 13.2, z + sz / 2 + 0.18); main.add(w);
        const w2 = w.clone(); w2.position.z = z - sz / 2 - 0.18; main.add(w2);
      }
      // Stilts
      for (let i = -sx / 2 + 5; i < sx / 2; i += 10) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 10), mats.dark);
        s.position.set(x + i, 3, z - sz / 2 + 1); s.castShadow = true; main.add(s);
        const s2 = s.clone(); s2.position.z = z + sz / 2 - 1; main.add(s2);
      }
    }
    wing(-5, -35, 70, 14);
    wing(-5, -15, 70, 14);
    
    // Bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 15, 34), mats.blue);
    bridge.position.set(27, 12, -25); bridge.castShadow = true; main.add(bridge);
    const brRoof = new THREE.Mesh(new THREE.BoxGeometry(15.2, 1.5, 35.2), mats.roof);
    brRoof.position.set(27, 20, -25); main.add(brRoof);
    group.add(main);

    // COMMUNICATION DOME
    const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.white);
    dome.position.set(35, 9, -5); dome.castShadow = true; group.add(dome);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 8, 8), mats.dark);
      leg.position.set(35 + Math.cos(a) * 4, 4, -5 + Math.sin(a) * 4); group.add(leg);
    }
    dome.userData = { ...statusMeta("OPERATIONAL", "COMMUNICATION", { Link: "Stable", Uplink: "1.2 Mbps", Latency: "640 ms" }), name: "Satellite Communication Dome" };
    equipment.push(dome);

    // GENERATORS & CONTAINERS
    box("Supply Container 01", -80, 5, -15, 14, 10, 10, mats.red, statusMeta("OPERATIONAL", "LOGISTICS", { Inventory: "78%", Category: "Emergency", Status: "Sealed" }));
    box("Generator 01", -65, 5, 8, 14, 10, 10, mats.dark, statusMeta("OPERATIONAL", "ENERGY", { Output: "420 kW", Temperature: "-18°C", Fuel: "68%", Health: "Normal" }));
    box("Generator 02", -50, 5, -5, 14, 10, 10, mats.dark, statusMeta("WARNING", "ENERGY", { Output: "390 kW", Vibration: "High", Fuel: "61%", Health: "Inspect" }));

    // SOLAR PANELS
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const p = box("Solar Array Section", 35 + col * 7, 3, 85 + row * 7, 5.5, 0.35, 5, mats.panel, statusMeta("OPERATIONAL", "ENERGY", { Generation: "86 kW", Irradiance: "Normal", Efficiency: "91%" }));
        p.rotation.x = -0.18;
      }
    }

    // WATER SYSTEM
    box("Water Treatment Plant", 60, 7, 65, 18, 14, 14, mats.blue, statusMeta("OPERATIONAL", "WATER", { Level: "74%", Flow: "18 L/min", Temperature: "2°C" }));

    // ANTENNAS
    const antPole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 50, 12), mats.dark);
    antPole.position.set(15, 25, -50); antPole.castShadow = true; group.add(antPole);
    const antTop = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), mats.white);
    antTop.position.set(15, 51, -50); group.add(antTop);
    antTop.userData = { ...statusMeta("CRITICAL", "COMMUNICATION", { Signal: "Lost", Ice_Load: "Severe", Integrity: "Compromised" }), name: "Main Comm Mast" };
    equipment.push(antTop);

    // HELPER: Highlight interactable items
    equipment.forEach(obj => {
      // Add an invisible slightly larger box for easier clicking
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(size.x + 2, size.y + 2, size.z + 2),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.copy(center).sub(obj.position); // Relative to obj
      obj.add(hitBox);
    });

    return group;
  }, []);
};

// UI Overlay Component for selected asset
const AssetDetailsPanel = ({ asset, onClose }) => {
  if (!asset) return null;

  const { name, type, status, metrics } = asset.userData;
  
  const statusColors = {
    OPERATIONAL: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    WARNING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20'
  };

  const TypeIcon = () => {
    switch(type) {
      case 'ENERGY': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'WATER': return <Droplets className="w-5 h-5 text-cyan-400" />;
      case 'COMMUNICATION': return <Radio className="w-5 h-5 text-indigo-400" />;
      case 'LOGISTICS': return <Shield className="w-5 h-5 text-amber-400" />;
      default: return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="absolute top-4 right-4 w-72 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in slide-in-from-right-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          <TypeIcon />
        </div>
        <div>
          <h3 className="text-white font-bold leading-tight">{name}</h3>
          <p className="text-[10px] uppercase tracking-widest text-white/50">{type}</p>
        </div>
      </div>

      <div className={`px-3 py-1.5 rounded-md border text-xs font-bold tracking-widest uppercase text-center mb-4 ${statusColors[status]}`}>
        {status}
      </div>

      <div className="space-y-2">
        {Object.entries(metrics || {}).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/60 text-xs">{key}</span>
            <span className="text-white font-mono text-xs">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StationModel: React.FC = () => {
  const stationGroup = useBharatiStation();
  const [selectedAsset, setSelectedAsset] = useState<THREE.Object3D | null>(null);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    
    // Find the closest parent that has userData status (meaning it's an equipment group)
    let obj = e.object;
    while (obj && !obj.userData?.status && obj.parent) {
      obj = obj.parent;
    }
    
    if (obj?.userData?.status) {
      setSelectedAsset(obj);
    } else {
      setSelectedAsset(null);
    }
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-transparent rounded-[2rem] overflow-hidden relative">
      <Canvas camera={{ position: [120, 80, 120], fov: 45 }} className="cursor-grab active:cursor-grabbing">
        <ambientLight intensity={0.6} />
        <directionalLight position={[-80, 170, 100]} intensity={1.5} castShadow />
        <hemisphereLight args={[0xaed6ff, 0x263238, 0.8]} />

        {/* The entire procedurally ported Bharati Station */}
        <primitive 
          object={stationGroup} 
          onPointerDown={handlePointerDown} 
          onPointerMissed={() => setSelectedAsset(null)}
        />
        
        <OrbitControls 
          makeDefault 
          target={[0, 7, 0]}
          minDistance={40}
          maxDistance={300}
          maxPolarAngle={Math.PI * 0.48}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Floating UI Legends */}
      <div className="absolute top-4 left-6 pointer-events-none">
        <h2 className="text-white font-bold text-xl drop-shadow-md">Bharati Station</h2>
        <p className="text-cyan-300 text-[10px] uppercase tracking-widest font-bold">Interactive Spatial Twin</p>
      </div>

      {/* Interactive Asset Details Panel */}
      <AssetDetailsPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
};

export default StationModel;
