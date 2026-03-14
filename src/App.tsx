/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FlaskConical,
  Thermometer,
  Zap,
  Droplets,
  Info,
  Settings,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Power,
  Beaker,
  Atom,
  BatteryCharging,
  ChevronRight,
  Timer,
  ArrowRightLeft,
  StopCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- SOUND UTILITIES ---
let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx && typeof window !== "undefined") {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBubble(ctx: AudioContext, volume = 0.05, pitchScale = 1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const freq = (150 + Math.random() * 200) * pitchScale;
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 2, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

function playCrack(ctx: AudioContext, volume = 0.02) {
  const bufferSize = ctx.sampleRate * 0.01;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize / 3));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

function playClick(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

function playDrop(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

// --- DỮ LIỆU HÓA HỌC (Constants) ---
const chemDB: Record<string, any> = {
  CuO: {
    type: "oxide",
    name: "CuO (Đồng Oxit)",
    ion: "Cu²⁺",
    metal: "Cu (Đồng)",
    color: "#111111",
    molten: "#b87333",
  },
  Fe2O3: {
    type: "oxide",
    name: "Fe₂O₃ (Sắt Oxit)",
    ion: "Fe³⁺",
    metal: "Fe (Sắt)",
    color: "#8b3a3a",
    molten: "#7f8c8d",
  },
  PbO: {
    type: "oxide",
    name: "PbO (Chì Oxit)",
    ion: "Pb²⁺",
    metal: "Pb (Chì)",
    color: "#dff9fb",
    molten: "#576574",
  },
  ZnO: {
    type: "oxide",
    name: "ZnO (Kẽm Oxit)",
    ion: "Zn²⁺",
    metal: "Zn (Kẽm)",
    color: "#eccc68",
    molten: "#f1f2f6",
  },
  C: {
    type: "reducer",
    name: "C (Than Cốc)",
    color: "#000000",
  },
  Al: {
    type: "reducer",
    name: "Al (Bột Nhôm)",
    color: "#b2bec3",
  },
  H2: {
    type: "reducer",
    name: "H₂ (Khí Hydro)",
    color: "rgba(255,255,255,0.8)",
    isGas: true,
  },
};

const eqDB: Record<string, string> = {
  CuO_C: "2CuO + C → 2Cu + CO₂↑",
  CuO_H2: "CuO + H₂ → Cu + H₂O",
  CuO_Al: "3CuO + 2Al → 3Cu + Al₂O₃",
  Fe2O3_C: "2Fe₂O₃ + 3C → 4Fe + 3CO₂↑",
  Fe2O3_H2: "Fe₂O₃ + 3H₂ → 2Fe + 3H₂O",
  Fe2O3_Al: "Fe₂O₃ + 2Al → 2Fe + Al₂O₃",
  PbO_C: "2PbO + C → 2Pb + CO₂↑",
  PbO_H2: "PbO + H₂ → Pb + H₂O",
  PbO_Al: "3PbO + 2Al → 3Pb + Al₂O₃",
  ZnO_C: "2ZnO + C → 2Zn + CO₂↑",
  ZnO_H2: "ZnO + H₂ → Zn + H₂O",
  ZnO_Al: "3ZnO + 2Al → 3Zn + Al₂O₃",
};

const hydroSolutions: Record<string, any> = {
  cuso4: { name: "Dung dịch CuSO₄", rank: 2, color: "rgba(59, 130, 246, 0.6)", resultName: "Đồng" },
  agno3: { name: "Dung dịch AgNO₃", rank: 1, color: "rgba(241, 245, 249, 0.3)", resultName: "Bạc" },
  feso4: { name: "Dung dịch FeSO₄", rank: 3, color: "rgba(163, 230, 53, 0.5)", resultName: "Sắt" },
  znso4: { name: "Dung dịch ZnSO₄", rank: 4, color: "rgba(241, 245, 249, 0.3)", resultName: "Kẽm" },
};

const hydroMetals: Record<string, any> = {
  zn: { name: "Thanh Kẽm", formula: "Zn", rank: 4, color: "#94a3b8" },
  fe: { name: "Thanh Sắt", formula: "Fe", rank: 3, color: "#475569" },
  cu: { name: "Thanh Đồng", formula: "Cu", rank: 2, color: "#b45309" },
  ag: { name: "Thanh Bạc", formula: "Ag", rank: 1, color: "#cbd5e1" },
};

const reactionResults: Record<string, any> = {
  "zn_cuso4": {
    newSolColor: "rgba(241, 245, 249, 0.3)",
    coatColor: "#b45309",
    precipitateColor: "rgba(180, 83, 9, 0.8)",
    eq: "Zn + CuSO₄ → ZnSO₄ + Cu↓",
    desc: "Kẽm đẩy đồng ra khỏi dung dịch. Màu xanh của CuSO₄ nhạt dần, dung dịch trở nên trong suốt. Có lớp đồng màu đỏ bám trên thanh kẽm."
  },
  "zn_agno3": {
    newSolColor: "rgba(241, 245, 249, 0.3)",
    coatColor: "#e2e8f0",
    precipitateColor: "rgba(226, 232, 240, 0.8)",
    eq: "Zn + 2AgNO₃ → Zn(NO₃)₂ + 2Ag↓",
    desc: "Kẽm đẩy bạc ra khỏi dung dịch. Có tinh thể bạc màu xám trắng bám trên thanh kẽm."
  },
  "zn_feso4": {
    newSolColor: "rgba(241, 245, 249, 0.3)",
    coatColor: "#475569",
    precipitateColor: "rgba(71, 85, 105, 0.8)",
    eq: "Zn + FeSO₄ → ZnSO₄ + Fe↓",
    desc: "Kẽm đẩy sắt ra khỏi dung dịch. Màu xanh lục nhạt của FeSO₄ mất dần, lớp sắt xám bám ngoài thanh kẽm."
  },
  "fe_cuso4": {
    newSolColor: "rgba(163, 230, 53, 0.5)",
    coatColor: "#b45309",
    precipitateColor: "rgba(180, 83, 9, 0.8)",
    eq: "Fe + CuSO₄ → FeSO₄ + Cu↓",
    desc: "Sắt đẩy đồng ra khỏi dung dịch. Màu xanh lam của dung dịch nhạt dần và chuyển sang màu xanh lục nhạt của FeSO₄. Có lớp đồng màu đỏ bám trên thanh sắt."
  },
  "fe_agno3": {
    newSolColor: "rgba(163, 230, 53, 0.5)",
    coatColor: "#e2e8f0",
    precipitateColor: "rgba(226, 232, 240, 0.8)",
    eq: "Fe + 2AgNO₃ → Fe(NO₃)₂ + 2Ag↓",
    desc: "Sắt đẩy bạc ra khỏi dung dịch. Dung dịch dần xuất hiện màu xanh nhạt, có tinh thể bạc sáng bám ngoài thanh sắt."
  },
  "cu_agno3": {
    newSolColor: "rgba(59, 130, 246, 0.6)",
    coatColor: "#e2e8f0",
    precipitateColor: "rgba(226, 232, 240, 0.8)",
    eq: "Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag↓",
    desc: "Đồng đẩy bạc ra khỏi dung dịch. Dung dịch từ không màu chuyển dần sang màu xanh lam. Có lớp tinh thể bạc sáng bám trên thanh đồng."
  }
};

// --- MAIN COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState("thermal");

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 font-sans text-slate-900">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes tl-burn { 0% { transform: translateY(0); } 100% { transform: translateY(-5px); } }
        @keyframes tl-shootElectron {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            50% { transform: translate(50px, -20px) scale(1.5); opacity: 1; }
            100% { transform: translate(100px, 0) scale(1); opacity: 0; }
        }
        .tl-fire-bg {
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23e74c3c" d="M50 0 C60 40 100 60 100 100 L0 100 C0 60 40 40 50 0 Z"/></svg>') repeat-x;
            background-size: 50px 60px;
        }
        .tl-furnace-body {
            background: linear-gradient(to right, #bdc3c7, #ecf0f1 20%, #ffffff 50%, #ecf0f1 80%, #bdc3c7);
            box-shadow: inset 0 0 20px rgba(0,0,0,0.1), 0 15px 30px rgba(0, 86, 179, 0.15);
        }
        .tl-hearth-heated {
            background: radial-gradient(circle, #fff200 10%, #ff9f43 50%, #e74c3c 90%);
            box-shadow: 0 0 40px rgba(255, 159, 67, 0.6), inset 0 0 20px #000;
        }
        .tl-hearth-cold {
            background-color: #2c3e50;
            box-shadow: inset 0 0 20px #000;
        }
      `,
        }}
      />

      {/* Header */}
      <div className="bg-slate-900 text-white py-12 px-4 shadow-md z-10">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <FlaskConical className="w-10 h-10 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold">Phòng Thí Nghiệm Ảo</h1>
              <p className="text-slate-400 mt-1">Mô phỏng 3 phương pháp điều chế kim loại</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                id: "thermal",
                label: "Nhiệt Luyện",
                icon: Thermometer,
                color: "hover:bg-orange-600",
                activeBg: "bg-orange-500 text-white",
              },
              {
                id: "hydro",
                label: "Thủy Luyện",
                icon: Droplets,
                color: "hover:bg-blue-600",
                activeBg: "bg-blue-500 text-white",
              },
              {
                id: "electro",
                label: "Điện Phân Al₂O₃",
                icon: Zap,
                color: "hover:bg-yellow-600",
                activeBg: "bg-yellow-500 text-slate-900",
              },
              {
                id: "nacl",
                label: "Điện Phân NaCl",
                icon: Atom,
                color: "hover:bg-cyan-600",
                activeBg: "bg-cyan-500 text-white",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  const ctx = getAudioCtx();
                  if (ctx) playClick(ctx);
                  setActiveTab(tab.id);
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-t-lg font-semibold transition-all duration-200 border-b-2",
                  activeTab === tab.id
                    ? `${tab.activeBg} border-transparent shadow-inner`
                    : `bg-slate-800 text-slate-300 border-slate-700 ${tab.color}`
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Lab Area */}
      <div className="flex-1 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto py-8 px-4 h-full relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === "thermal" && <ThermalLab key="thermal" />}
            {activeTab === "hydro" && <HydroLab key="hydro" />}
            {activeTab === "electro" && <ElectroLab key="electro" />}
            {activeTab === "nacl" && <NaClLab key="nacl" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- THERMAL LAB COMPONENT ---
function ThermalLab() {
  const [oxide, setOxide] = useState<string | null>(null);
  const [reducer, setReducer] = useState<string | null>(null);
  const [isHeated, setIsHeated] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [electronTick, setElectronTick] = useState(0);

  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const electronIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let soundInterval: NodeJS.Timeout;
    if (isHeated) {
      soundInterval = setInterval(() => {
        const ctx = getAudioCtx();
        if (ctx) {
          if (Math.random() > 0.7) playCrack(ctx, 0.03);
          if (Math.random() > 0.9) playBubble(ctx, 0.01, 0.5);
        }
      }, 100);
    }
    return () => clearInterval(soundInterval);
  }, [isHeated]);

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (electronIntervalRef.current) clearInterval(electronIntervalRef.current);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    e.dataTransfer.setData("text", id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isReacting || isFinished) return;

    const id = e.dataTransfer.getData("text");
    if (!chemDB[id]) return;

    const ctx = getAudioCtx();
    if (ctx) playDrop(ctx);

    const chem = chemDB[id];
    if (chem.type === "oxide" && !oxide) setOxide(id);
    else if (chem.type === "reducer" && !reducer) setReducer(id);
  };

  const toggleFurnace = () => {
    const ctx = getAudioCtx(); // Resume audio context
    if (ctx) playClick(ctx);
    if (isReacting) return;

    if (!isHeated) {
      setIsHeated(true);
      if (oxide && reducer && !isFinished) {
        startReaction();
      }
    } else {
      setIsHeated(false);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (electronIntervalRef.current) clearInterval(electronIntervalRef.current);
      if (isReacting) setIsReacting(false);
    }
  };

  const startReaction = () => {
    setIsReacting(true);
    electronIntervalRef.current = setInterval(() => {
      setElectronTick((prev) => prev + 1);
    }, 900);

    reactionTimerRef.current = setTimeout(() => {
      setIsReacting(false);
      setIsFinished(true);
      if (electronIntervalRef.current) clearInterval(electronIntervalRef.current);
    }, 4000);
  };

  const resetLab = () => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    if (isHeated) setIsHeated(false);
    setOxide(null);
    setReducer(null);
    setIsReacting(false);
    setIsFinished(false);
  };

  const renderChemItem = (id: string) => {
    const chem = chemDB[id];
    const isUsed = oxide === id || reducer === id;
    return (
      <div
        key={id}
        draggable={!isUsed}
        onDragStart={(e) => handleDragStart(e, id)}
        className={cn(
          "flex items-center gap-3 p-3 mb-2 rounded-lg border-l-4 border border-blue-100 bg-blue-50/50 transition-all font-semibold text-sm",
          isUsed
            ? "opacity-30 cursor-not-allowed"
            : "cursor-grab hover:bg-blue-100 hover:translate-x-1 border-l-blue-500"
        )}
      >
        <span
          className="w-4 h-4 rounded-full border border-slate-300 shadow-sm"
          style={{ background: chem.color }}
        ></span>
        <span className="text-slate-700">{chem.name}</span>
      </div>
    );
  };

  let statusText = "CHỜ NẠP LIỆU";
  let statusColor = "text-red-500";
  if (isReacting) {
    statusText = "ĐANG PHẢN ỨNG (XEM KÍNH HIỂN VI)";
    statusColor = "text-green-600";
  } else if (isFinished && isHeated) {
    statusText = "ĐANG NUNG CHẢY KIM LOẠI";
    statusColor = "text-orange-500";
  } else if (isFinished && !isHeated) {
    statusText = "KIM LOẠI ĐÃ ĐÔNG ĐẶC";
    statusColor = "text-blue-600";
  } else if (oxide && reducer && !isHeated) {
    statusText = "SẴN SÀNG NHIỆT LUYỆN";
    statusColor = "text-orange-500";
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 min-h-[500px]">
        <div className="w-full md:w-1/3 border-r border-slate-100 pr-4 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-500" /> KHO VẬT LIỆU
          </h3>
          <div className="text-xs font-bold text-slate-400 mb-2">QUẶNG OXIT (Kéo 1)</div>
          {["CuO", "Fe2O3", "PbO", "ZnO"].map(renderChemItem)}
          <div className="text-xs font-bold text-slate-400 mb-2 mt-4">CHẤT KHỬ (Kéo 1)</div>
          {["C", "Al", "H2"].map(renderChemItem)}
          <button
            onClick={resetLab}
            className="mt-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Làm Sạch Lò
          </button>
        </div>

        <div
          className={cn(
            "w-full md:w-2/3 flex flex-col items-center justify-center relative rounded-2xl transition-all",
            isReacting || isHeated ? "bg-slate-50" : ""
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="relative mt-8">
            <div className="w-16 h-12 mx-auto bg-gradient-to-r from-slate-500 via-slate-300 to-slate-500 border-x-4 border-t-4 border-slate-600 rounded-t-lg"></div>
            <div className="tl-furnace-body w-56 h-72 border-[6px] border-slate-600 rounded-t-2xl rounded-b-[40px] flex flex-col items-center justify-center relative overflow-hidden z-10">
              <div
                className={cn(
                  "w-36 h-36 rounded-full border-[8px] border-slate-500 relative overflow-hidden transition-all duration-1000",
                  isHeated ? "tl-hearth-heated" : "tl-hearth-cold"
                )}
              >
                <div
                  className="absolute bottom-0 w-full transition-all duration-1000"
                  style={{
                    height: oxide && !isReacting && !isFinished ? "40%" : "0%",
                    backgroundColor: oxide ? chemDB[oxide].color : "transparent",
                  }}
                />
                <div
                  className="absolute bottom-[40%] w-full transition-all duration-1000"
                  style={{
                    height: reducer && !isReacting && !isFinished && !chemDB[reducer].isGas ? "20%" : "0%",
                    backgroundColor: reducer ? chemDB[reducer].color : "transparent",
                  }}
                />
                <div
                  className="absolute bottom-0 w-full transition-all duration-1000"
                  style={{
                    height: isFinished ? "50%" : "0%",
                    backgroundColor: oxide ? chemDB[oxide].molten : "transparent",
                    filter: isFinished && isHeated ? "brightness(1.5) drop-shadow(0 -10px 20px rgba(255,200,0,0.8))" : "none",
                  }}
                />
              </div>
              <div
                className="absolute -bottom-4 w-full h-16 tl-fire-bg transition-opacity duration-500"
                style={{
                  opacity: isHeated ? 1 : 0,
                  animation: "tl-burn 0.5s infinite alternate",
                }}
              />
            </div>

            <div
              className={cn(
                "absolute top-0 -left-12 md:-left-24 w-48 h-48 bg-slate-900/95 border-4 border-blue-400 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.5)] z-20 flex items-center justify-around transition-all duration-500",
                isReacting ? "scale-100 opacity-100 visible" : "scale-50 opacity-0 invisible"
              )}
            >
              <div className="absolute top-3 text-[10px] font-bold text-blue-400 tracking-wider">ZOOM X1000</div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-slate-800 flex items-center justify-center text-white font-bold text-sm shadow-inner z-10">
                {reducer ? (isFinished ? (reducer === "C" ? "CO₂" : reducer === "H2" ? "H₂O" : "Al₂O₃") : reducer) : ""}
              </div>
              {isReacting && (
                <div
                  key={electronTick}
                  className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15] text-[8px] flex items-center justify-center font-bold text-black"
                  style={{ animation: "tl-shootElectron 0.8s ease-in-out" }}
                >
                  e⁻
                </div>
              )}
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-slate-800 flex items-center justify-center text-white font-bold text-sm shadow-inner z-10"
                style={{ background: isFinished && oxide ? chemDB[oxide].molten : undefined }}
              >
                {oxide ? (isFinished ? chemDB[oxide].metal.split(" ")[0] : chemDB[oxide].ion) : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" /> GIÁM SÁT HỆ THỐNG
        </h3>
        <div className="bg-blue-50/50 border-2 border-blue-100 rounded-xl p-5 mb-6 font-mono text-sm shadow-inner">
          <div className="flex justify-between mb-3 border-b border-blue-100 pb-2">
            <span className="font-bold text-slate-600">Quặng Oxit:</span>
            <span className="font-bold text-blue-700">{oxide ? chemDB[oxide].name : "-"}</span>
          </div>
          <div className="flex justify-between mb-3 border-b border-blue-100 pb-2">
            <span className="font-bold text-slate-600">Chất Khử:</span>
            <span className="font-bold text-blue-700">{reducer ? chemDB[reducer].name : "-"}</span>
          </div>
          <div className="flex justify-between mb-3 border-b border-blue-100 pb-2">
            <span className="font-bold text-slate-600">Nhiệt độ:</span>
            <span className={cn("font-bold", isHeated ? "text-red-600" : "text-blue-600")}>
              {isHeated ? "2000 °C" : "25 °C"}
            </span>
          </div>
          <div className="flex justify-between mt-4">
            <span className="font-bold text-slate-600">Trạng thái:</span>
            <span className={cn("font-bold text-right", statusColor)}>{statusText}</span>
          </div>
        </div>

        <button
          onClick={toggleFurnace}
          className={cn(
            "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none",
            isHeated ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
          )}
        >
          <Power className="w-6 h-6" /> {isHeated ? "TẮT LÒ" : "KHỞI ĐỘNG NHIỆT"}
        </button>

        <AnimatePresence>
          {isFinished && oxide && reducer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-green-50 border-2 border-green-200 rounded-xl p-5 text-center"
            >
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-green-600 uppercase mb-2">Phương trình</div>
              <div className="font-mono font-bold text-green-800 text-sm bg-white py-2 px-3 rounded border border-green-100">
                {eqDB[`${oxide}_${reducer}`]}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// --- HYDRO LAB COMPONENT ---
function HydroLab() {
  const [solution, setSolution] = useState<string | null>(null);
  const [metal, setMetal] = useState<string | null>(null);
  const [isReacting, setIsReacting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [hasError, setHasError] = useState(false);

  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let soundInterval: NodeJS.Timeout;
    if (isReacting) {
      soundInterval = setInterval(() => {
        const ctx = getAudioCtx();
        if (ctx) {
          if (Math.random() > 0.4) playBubble(ctx, 0.04, 1.2);
        }
      }, 150);
    }
    return () => clearInterval(soundInterval);
  }, [isReacting]);

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string, type: string) => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    e.dataTransfer.setData("id", id);
    e.dataTransfer.setData("type", type);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isReacting || isFinished) return;

    const id = e.dataTransfer.getData("id");
    const type = e.dataTransfer.getData("type");

    const ctx = getAudioCtx();
    if (ctx) playDrop(ctx);

    if (type === "solution" && !solution) {
      setSolution(id);
      setHasError(false);
    } else if (type === "metal" && !metal) {
      setMetal(id);
      setHasError(false);
    }
  };

  const startReaction = () => {
    const ctx = getAudioCtx(); // Resume audio context
    if (ctx) playClick(ctx);
    if (!solution || !metal || isReacting) return;

    const solData = hydroSolutions[solution];
    const metData = hydroMetals[metal];

    if (metData.rank > solData.rank) {
      setIsReacting(true);
      setHasError(false);

      reactionTimerRef.current = setTimeout(() => {
        setIsReacting(false);
        setIsFinished(true);
      }, 3500);
    } else {
      setHasError(true);
    }
  };

  const resetLab = () => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    setSolution(null);
    setMetal(null);
    setIsReacting(false);
    setIsFinished(false);
    setHasError(false);
  };

  // Tính toán màu sắc hiển thị
  const currentLiquidColor =
    (isReacting || isFinished) && solution && metal && reactionResults[`${metal}_${solution}`]
      ? reactionResults[`${metal}_${solution}`].newSolColor
      : solution
      ? hydroSolutions[solution].color
      : "transparent";

  const currentMetalColor = metal ? hydroMetals[metal].color : "transparent";
  
  const coatColor =
    (isReacting || isFinished) && solution && metal && reactionResults[`${metal}_${solution}`]
      ? reactionResults[`${metal}_${solution}`].coatColor
      : "transparent";

  const precipitateColor =
    (isReacting || isFinished) && solution && metal && reactionResults[`${metal}_${solution}`]?.precipitateColor
      ? reactionResults[`${metal}_${solution}`].precipitateColor
      : "transparent";

  // Trạng thái hệ thống
  let statusText = "CHỜ NẠP HÓA CHẤT";
  let statusColor = "text-red-500";
  if (hasError) {
    statusText = "KHÔNG XẢY RA PHẢN ỨNG!";
    statusColor = "text-red-500";
  } else if (isReacting) {
    statusText = "ĐANG XẢY RA PHẢN ỨNG...";
    statusColor = "text-blue-500";
  } else if (isFinished) {
    statusText = "PHẢN ỨNG HOÀN TẤT";
    statusColor = "text-green-600";
  } else if (solution && metal) {
    statusText = "SẴN SÀNG THÍ NGHIỆM";
    statusColor = "text-orange-500";
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 antialiased"
    >
      {/* KHU VỰC TRÁI: KHO VẬT LIỆU + CỐC THÍ NGHIỆM */}
      <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50 rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col md:flex-row gap-8 min-h-[550px]">
        
        {/* KHO VẬT LIỆU */}
        <div className="w-full md:w-1/3 border-r border-slate-200 pr-4 flex flex-col">
          <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" /> KHO HÓA CHẤT
          </h3>

          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Dung dịch (Kéo 1)
          </div>
          {Object.keys(hydroSolutions).map((k) => (
            <div
              key={k}
              draggable={solution !== k}
              onDragStart={(e) => handleDragStart(e, k, "solution")}
              className={cn(
                "flex items-center gap-3 p-3 mb-2 rounded-xl border-l-4 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all font-semibold text-sm",
                solution === k
                  ? "opacity-40 cursor-not-allowed border-slate-200 grayscale-[30%]"
                  : "cursor-grab hover:bg-slate-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 border-l-blue-500"
              )}
            >
              <span
                className="w-5 h-5 shadow-inner relative overflow-hidden rounded-b-lg rounded-t-sm opacity-90"
                style={{ background: hydroSolutions[k].color }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></span>
              </span>
              <span className="text-slate-700">{hydroSolutions[k].name}</span>
            </div>
          ))}

          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 mt-4">
            Kim loại (Kéo 1)
          </div>
          {Object.keys(hydroMetals).map((k) => (
            <div
              key={k}
              draggable={metal !== k}
              onDragStart={(e) => handleDragStart(e, k, "metal")}
              className={cn(
                "flex items-center gap-3 p-3 mb-2 rounded-xl border-l-4 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all font-semibold text-sm",
                metal === k
                  ? "opacity-40 cursor-not-allowed border-slate-200 grayscale-[30%]"
                  : "cursor-grab hover:bg-slate-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 border-l-slate-400"
              )}
            >
              <span
                className="w-5 h-5 shadow-inner relative overflow-hidden rounded-sm border border-slate-400"
                style={{ background: hydroMetals[k].color }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></span>
              </span>
              <span className="text-slate-700">{hydroMetals[k].name}</span>
            </div>
          ))}

          <button
            onClick={resetLab}
            className="mt-auto py-3 px-4 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Làm sạch cốc
          </button>
        </div>

        {/* CỐC THÍ NGHIỆM - CẤU TRÚC PHÂN LỚP 2D MỚI */}
        <div
          className="w-full md:w-2/3 flex flex-col items-center justify-end relative rounded-2xl bg-white/50 border border-slate-100 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] pb-12 pt-24"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="relative flex flex-col items-center w-64 h-72">
            
            {/* Giá treo thanh kim loại */}
            <div className="absolute -top-16 w-36 h-5 border-b-4 border-r-4 border-slate-500 rounded-br-xl -left-16 z-30 shadow-md bg-slate-100/50"></div>
            <div className="absolute -top-16 -left-16 w-4 h-72 bg-slate-500 rounded-t-xl z-30 shadow-md"></div>

            {/* CẤU TRÚC SANDWICH ĐỂ ĐẢM BẢO DUNG DỊCH NẰM SAU KIM LOẠI */}
            <div className="relative w-56 h-72 flex items-end justify-center">
              
              {/* LỚP 1: MẶT SAU CỦA CỐC VÀ DUNG DỊCH (NẰM DƯỚI CÙNG) */}
              <div className="absolute inset-0 z-0 flex items-end justify-center rounded-b-[40px] overflow-hidden">
                <motion.div
                  className="w-full relative flex items-start justify-center"
                  initial={{ height: "0%", backgroundColor: "transparent" }}
                  animate={{ 
                    height: solution ? "75%" : "0%",
                    backgroundColor: currentLiquidColor
                  }}
                  transition={{ 
                    height: { duration: 1, ease: "easeOut" },
                    backgroundColor: { duration: 3.5, ease: "easeInOut" }
                  }}
                >
                  {/* Hiệu ứng gradient mờ tạo chiều sâu cho chất lỏng */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/20 mix-blend-multiply pointer-events-none"></div>
                  
                  {/* Hiệu ứng gợn sóng/ánh sáng trong nước */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <motion.div 
                      animate={{ 
                        backgroundPosition: ["0% 0%", "100% 100%"],
                        opacity: [0.1, 0.3, 0.1]
                      }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, white 1%, transparent 10%)`,
                        backgroundSize: "40px 40px"
                      }}
                    />
                  </div>

                  {/* Đường viền trên mặt chất lỏng */}
                  {solution && (
                    <div className="absolute top-0 w-full h-3 bg-white/20 rounded-[100%] shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)] border-t border-white/30"></div>
                  )}

                  {/* Hạt sủi bọt */}
                  {isReacting && (
                    <div className="absolute inset-0 overflow-hidden opacity-90 mix-blend-screen">
                      {[...Array(30)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,1)]"
                          initial={{
                            bottom: "0%",
                            left: `${15 + Math.random() * 70}%`,
                            opacity: 0,
                            scale: 0.3,
                          }}
                          animate={{
                            bottom: "95%",
                            opacity:[0, 1, 0],
                            scale:[0.3, 1.2, 0.5],
                          }}
                          transition={{
                            duration: 0.6 + Math.random() * 0.8,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Lớp kết tủa/lắng đọng ở đáy cốc */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 blur-[2px]"
                    initial={{ height: "0%", opacity: 0 }}
                    animate={{ 
                      height: (isReacting || isFinished) ? "8%" : "0%",
                      opacity: (isReacting || isFinished) ? 0.8 : 0
                    }}
                    transition={{ duration: 4, ease: "easeOut" }}
                    style={{ 
                      backgroundColor: precipitateColor,
                      borderRadius: "0 0 40px 40px",
                      backgroundImage: `radial-gradient(circle at 50% 0%, transparent 20%, rgba(0,0,0,0.1) 100%)`
                    }}
                  />
                </motion.div>
              </div>

              {/* LỚP 2: THANH KIM LOẠI (NẰM TRƯỚC DUNG DỊCH) */}
              <div
                className={cn(
                  "absolute bottom-4 z-10 w-10 transition-all duration-700 rounded-sm shadow-[10px_4px_20px_rgba(0,0,0,0.4)] overflow-hidden",
                  metal ? "h-64" : "h-0 opacity-0"
                )}
                style={{ backgroundColor: currentMetalColor }}
              >
                {/* Texture kim loại chân thực */}
                <div 
                  className="absolute inset-0 opacity-40 mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  }}
                ></div>

                {/* Phản quang hình trụ đa lớp */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-white/30 via-white/10 to-black/70 w-full h-full pointer-events-none"></div>
                
                {/* Phản chiếu của dung dịch lên kim loại */}
                <motion.div 
                  className="absolute inset-0 opacity-20 mix-blend-color"
                  animate={{ backgroundColor: currentLiquidColor }}
                  transition={{ duration: 3.5, ease: "easeInOut" }}
                />

                {/* Rim Light */}
                <div className="absolute inset-y-0 left-0 w-[2px] bg-white/40 blur-[0.5px]"></div>
                <div className="absolute inset-y-0 right-0 w-[1px] bg-white/20"></div>
                
                {/* Vệt sáng bóng loáng chính */}
                <div className="absolute inset-y-0 left-[20%] w-2 bg-white/20 blur-[2px]"></div>
                <div className="absolute inset-y-0 left-[22%] w-0.5 bg-white/40 blur-[0.5px]"></div>

                {/* Tên hóa học kim loại */}
                {metal && (
                  <div className="absolute top-3 w-full text-center text-[13px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] z-20 tracking-tighter">
                    {hydroMetals[metal]?.formula}
                  </div>
                )}

                {/* Lớp bám phản ứng (Coating) */}
                <div className="absolute inset-0 pointer-events-none">
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 origin-bottom"
                    initial={{ height: "0%" }}
                    animate={{ height: (isReacting || isFinished) ? "65%" : "0%" }}
                    transition={{ duration: 3.5, ease: "easeInOut" }}
                    style={{ 
                      backgroundColor: coatColor,
                      opacity: 0.5,
                      filter: "blur(6px)"
                    }}
                  />
                  
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 origin-bottom shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]"
                    initial={{ height: "0%" }}
                    animate={{ height: (isReacting || isFinished) ? "62%" : "0%" }}
                    transition={{ duration: 3.8, ease: "easeOut", delay: 0.2 }}
                    style={{ 
                      backgroundColor: coatColor,
                      boxShadow: (isReacting || isFinished) 
                        ? `0 0 20px ${coatColor}88` 
                        : "none",
                    }}
                  >
                    {(isReacting || isFinished) && coatColor !== "transparent" && (
                      <div
                        className="absolute inset-0 mix-blend-multiply opacity-60"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        }}
                      />
                    )}
                  </motion.div>

                  <motion.div
                    className="absolute bottom-0 left-0 right-0 origin-bottom border-x border-white/30"
                    initial={{ height: "0%" }}
                    animate={{ height: (isReacting || isFinished) ? "60%" : "0%" }}
                    transition={{ duration: 4.2, ease: "linear", delay: 0.5 }}
                    style={{ backgroundColor: coatColor }}
                  >
                    {(isReacting || isFinished) && coatColor !== "transparent" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/30 pointer-events-none" />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* LỚP 3: MẶT KÍNH TRƯỚC CỦA CỐC (TRONG SUỐT) */}
              <div
                className={cn(
                  "absolute inset-0 z-20 rounded-b-[40px] border-[4px] border-t-0 border-white/80 shadow-[inset_0_0_20px_rgba(255,255,255,0.8),0_15px_35px_rgba(0,0,0,0.05)] transition-all pointer-events-none",
                  solution && !metal ? "ring-4 ring-blue-300/40 ring-offset-4" : ""
                )}
              >
                <div className="absolute top-0 left-3 w-6 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-bl-[40px]"></div>
                <div className="absolute top-0 right-4 w-2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-br-[40px]"></div>
                <div className="absolute bottom-2 left-10 right-10 h-4 bg-gradient-to-t from-white/40 to-transparent rounded-full blur-[2px]"></div>

                <div className="absolute left-0 bottom-12 w-5 h-[3px] bg-white/90 shadow-sm"></div>
                <div className="absolute left-0 bottom-24 w-8 h-[3px] bg-white/90 shadow-sm"></div>
                <div className="absolute left-10 bottom-24 text-[11px] text-slate-500 font-extrabold font-mono -mt-2 drop-shadow-sm">150ml</div>
                
                <div className="absolute left-0 bottom-36 w-5 h-[3px] bg-white/90 shadow-sm"></div>
                <div className="absolute left-0 bottom-48 w-8 h-[3px] bg-white/90 shadow-sm"></div>
                <div className="absolute left-10 bottom-48 text-[11px] text-slate-500 font-extrabold font-mono -mt-2 drop-shadow-sm">250ml</div>
                
                <div className="absolute top-0 -left-[6px] w-8 h-3 bg-white/90 rounded-bl-full shadow-sm border-b border-white"></div>
                <div className="absolute top-0 -right-[6px] w-8 h-3 bg-white/90 rounded-br-full shadow-sm border-b border-white"></div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC PHẢI: BẢNG ĐIỀU KHIỂN */}
      <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col h-full">
        <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" /> GIÁM SÁT HỆ THỐNG
        </h3>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 font-mono text-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between mb-4 border-b border-slate-200 pb-3">
            <span className="font-bold text-slate-500">Dung dịch:</span>
            <span className="font-bold text-blue-600 text-right">
              {solution ? hydroSolutions[solution].name : "Trống"}
            </span>
          </div>
          <div className="flex justify-between mb-4 border-b border-slate-200 pb-3">
            <span className="font-bold text-slate-500">Thanh nhúng:</span>
            <span className="font-bold text-slate-700 text-right">
              {metal ? hydroMetals[metal].name : "Trống"}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-bold text-slate-500">Trạng thái:</span>
            <span
              className={cn(
                "font-extrabold text-right w-3/5",
                statusColor,
                (isReacting || hasError || !solution || !metal) ? "animate-pulse" : ""
              )}
            >
              {statusText}
            </span>
          </div>
        </div>

        <button
          onClick={startReaction}
          disabled={!solution || !metal || isReacting || isFinished || hasError}
          className={cn(
            "w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            isFinished
              ? "bg-green-500 text-white shadow-[0_6px_0_#166534]"
              : hasError
              ? "bg-red-500 text-white shadow-[0_6px_0_#991b1b]"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_6px_0_#1e3a8a] hover:shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px]"
          )}
        >
          <Play className="w-6 h-6" /> BẮT ĐẦU PHẢN ỨNG
        </button>

        <AnimatePresence mode="wait">
          {isFinished && solution && metal && reactionResults[`${metal}_${solution}`] && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-green-50/80 border-2 border-green-200 rounded-2xl p-5 text-center shadow-sm"
            >
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <div className="text-[12px] font-black text-green-700 uppercase tracking-widest mb-3">
                Phương trình Phản ứng
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="font-mono font-extrabold text-green-900 text-base bg-white py-3 px-3 rounded-xl border border-green-200 mb-3 shadow-inner"
              >
                {reactionResults[`${metal}_${solution}`].eq}
              </motion.div>
              <p className="text-sm font-medium text-slate-700 text-left bg-white/60 p-3 rounded-xl leading-relaxed">
                <Info className="inline w-4 h-4 mr-1.5 text-blue-500 -mt-0.5" />
                {reactionResults[`${metal}_${solution}`].desc}
              </p>
            </motion.div>
          )}

          {hasError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 bg-red-50/80 border-2 border-red-200 rounded-2xl p-5 text-center shadow-sm"
            >
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <div className="text-base font-black text-red-700 mb-2">
                Kim loại yếu hơn!
              </div>
              <p className="text-sm font-medium text-red-700/80 leading-relaxed">
                {metal ? hydroMetals[metal]?.name : "Kim loại này"} không thể đẩy {solution ? hydroSolutions[solution]?.resultName : "kim loại trong muối"} ra khỏi dung dịch. <br/>
                <span className="block mt-2 font-bold bg-white/50 py-1 rounded text-red-800">Dãy hoạt động: Zn &gt; Fe &gt; Cu &gt; Ag</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// --- ELECTRO LAB COMPONENT ---
function ElectroLab() {
  const [voltage, setVoltage] = useState(0);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [time, setTime] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const isActive = isPowerOn && voltage > 2.1;

  useEffect(() => {
    let soundInterval: NodeJS.Timeout;
    if (isActive) {
      soundInterval = setInterval(() => {
        const ctx = getAudioCtx();
        if (ctx) {
          if (Math.random() > 0.3) playBubble(ctx, 0.03, 1.5);
        }
      }, 80);
    }
    return () => clearInterval(soundInterval);
  }, [isActive]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPowerOn && voltage > 2.1) {
      interval = setInterval(() => {
        setTime((t) => Math.min(t + 0.5, 100));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPowerOn, voltage]);

  const togglePower = () => {
    const ctx = getAudioCtx(); // Resume audio context
    if (ctx) playClick(ctx);
    setIsPowerOn(!isPowerOn);
    if (isPowerOn) setVoltage(0);
  };

  const resetLab = () => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    setIsPowerOn(false);
    setVoltage(0);
    setTime(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      {/* Simulation Area */}
      <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-slate-200 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden">
        <div className="absolute top-6 left-8 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Zap className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Điện phân nóng chảy Al₂O₃
            </h2>
            <p className="text-sm text-slate-500 font-medium">Sản xuất Nhôm trong công nghiệp (Quy trình Hall-Héroult)</p>
          </div>
        </div>

        <button 
          onClick={() => {
            const ctx = getAudioCtx();
            if (ctx) playClick(ctx);
            setShowInfo(!showInfo);
          }}
          className="absolute top-6 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Info className="w-6 h-6 text-slate-400" />
        </button>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-50 bg-white/95 p-12 overflow-y-auto"
            >
              <button 
                onClick={() => {
                  const ctx = getAudioCtx();
                  if (ctx) playClick(ctx);
                  setShowInfo(false);
                }}
                className="absolute top-6 right-8 text-slate-500 font-bold hover:text-slate-800"
              >
                Đóng [X]
              </button>
              <h3 className="text-2xl font-bold mb-6 text-blue-800">Thông tin quy trình</h3>
              <div className="space-y-4 text-slate-700 leading-relaxed">
                <p><strong>1. Nguyên liệu:</strong> Quặng bôxit được làm sạch thành Al₂O₃ tinh khiết.</p>
                <p><strong>2. Vai trò của Cryolit (Na₃AlF₆):</strong> 
                  <ul className="list-disc ml-6 mt-2">
                    <li>Hạ nhiệt độ nóng chảy của Al₂O₃ từ 2050°C xuống khoảng 900°C.</li>
                    <li>Tăng độ dẫn điện của hỗn hợp.</li>
                    <li>Tạo lớp màng bảo vệ nhôm nóng chảy không bị oxi hóa.</li>
                  </ul>
                </p>
                <p><strong>3. Điện cực:</strong> Cả Anode và Cathode đều làm bằng than chì (C).</p>
                <p><strong>4. Phản ứng phụ:</strong> Khí O₂ sinh ra ở Anode đốt cháy điện cực than chì tạo ra CO và CO₂, do đó phải thay thế Anode định kỳ.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative w-full max-w-2xl mt-16 flex flex-col items-center">
          {/* Power Supply Unit */}
          <div className="w-64 h-32 bg-slate-900 rounded-2xl border-4 border-slate-700 flex flex-col items-center justify-center relative mb-16 shadow-2xl z-20">
            <div className="absolute top-3 left-4 flex gap-2">
              <div className={cn("w-3 h-3 rounded-full transition-all duration-300", isPowerOn ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-slate-700")} />
              <div className={cn("w-3 h-3 rounded-full transition-all duration-300", isActive ? "bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse" : "bg-slate-700")} />
            </div>
            
            <div className="bg-black px-6 py-3 rounded-lg border-2 border-slate-700 shadow-inner">
              <span className="font-mono text-4xl font-bold text-green-400 tracking-tighter">
                {isPowerOn ? voltage.toFixed(1) : "0.0"}<span className="text-xl ml-1">V</span>
              </span>
            </div>
            <div className="text-slate-500 text-[10px] mt-2 font-black tracking-[0.2em] uppercase">
              Industrial DC Rectifier
            </div>

            {/* Heavy Duty Wires */}
            <div className="absolute -bottom-16 left-12 w-3 h-20 bg-red-600 rounded-full shadow-lg" />
            <div className="absolute -bottom-16 right-12 w-3 h-20 bg-slate-800 rounded-full shadow-lg" />
          </div>

          {/* Industrial Electrolytic Tank */}
          <div className="relative w-[500px] h-80">
            {/* Tank Shell */}
            <div className="absolute inset-0 border-[8px] border-slate-700 rounded-b-[40px] bg-slate-200 shadow-2xl overflow-hidden">
              
              {/* Molten Electrolyte Layer */}
              <div className="absolute bottom-0 w-full h-56 bg-gradient-to-t from-orange-600 to-orange-400 relative overflow-hidden">
                <div className="absolute top-0 w-full h-4 bg-white/20 blur-sm" />
                
                {/* Ion Movement Animation */}
                {isActive && (
                  <div className="absolute inset-0">
                    {/* Al3+ Cations moving to Cathode (Bottom/Sides) */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={`al-${i}`}
                        className="absolute w-4 h-4 bg-slate-300 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-700 shadow-sm"
                        initial={{ x: 50 + Math.random() * 400, y: 20 + Math.random() * 100 }}
                        animate={{ y: 200 }}
                        transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                      >
                        Al³⁺
                      </motion.div>
                    ))}
                    {/* O2- Anions moving to Anode (Top) */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={`o-${i}`}
                        className="absolute w-4 h-4 bg-yellow-200 rounded-full flex items-center justify-center text-[8px] font-bold text-yellow-800 shadow-sm"
                        initial={{ x: 50 + Math.random() * 400, y: 150 + Math.random() * 50 }}
                        animate={{ y: 20 }}
                        transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                      >
                        O²⁻
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Molten Aluminum Pool */}
                <motion.div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-slate-400 to-slate-200 border-t border-white/30 z-10"
                  animate={{ height: `${time * 0.6}px` }}
                  transition={{ type: "spring", stiffness: 50 }}
                >
                  <div className="absolute top-2 w-full text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Nhôm lỏng (Al)
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Electrodes */}
            <div className="absolute top-0 w-full flex justify-around px-12 z-20">
              {/* Anodes (Multiple blocks for realism) */}
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-10 h-40 bg-slate-800 rounded-b-lg relative shadow-lg border-x border-slate-700">
                      <div className="absolute top-2 w-full text-center text-white text-sm font-black">+</div >
                      {isActive && (
                        <div className="absolute -bottom-4 w-full flex flex-wrap justify-center gap-1">
                          {[...Array(4)].map((_, j) => (
                            <motion.div
                              key={j}
                              className="w-2 h-2 bg-white/60 rounded-full"
                              initial={{ y: 0, opacity: 1, scale: 0.5 }}
                              animate={{ y: -150, opacity: 0, scale: 1.5 }}
                              transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: Math.random() }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cathode (The tank lining itself is the cathode, but we show a connection) */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-12 bg-slate-800 rounded-b-lg relative shadow-lg border-x border-slate-700">
                  <div className="absolute top-2 w-full text-center text-white text-sm font-black">-</div>
                </div>
                <div className="text-[10px] font-bold mt-2 text-slate-500 uppercase">Cathode Lining</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 left-8 flex flex-wrap gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded shadow-sm" /> Hỗn hợp Al₂O₃ + Na₃AlF₆
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-300 rounded shadow-sm border border-slate-400" /> Nhôm nguyên chất
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-slate-200 rounded-full shadow-sm" /> Khí Oxy (O₂)
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            Hệ Thống Điều Khiển
          </h3>

          <div className="space-y-8">
            {/* Power Toggle */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800">Nguồn Tổng</div>
                <div className="text-xs text-slate-500">Main Power Supply</div>
              </div>
              <button
                onClick={togglePower}
                className={cn(
                  "relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-300 focus:outline-none",
                  isPowerOn ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-slate-300"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-transform duration-300",
                    isPowerOn ? "translate-x-8" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Voltage Control */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <label className="font-bold text-slate-800 block">Hiệu Điện Thế</label>
                  <span className="text-xs text-slate-500 italic">Voltage Regulation</span>
                </div>
                <span className="font-mono text-2xl font-black text-blue-600">
                  {voltage.toFixed(1)}<span className="text-sm ml-1">V</span>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={voltage}
                onMouseDown={() => {
                  const ctx = getAudioCtx();
                  if (ctx) playClick(ctx);
                }}
                onChange={(e) => setVoltage(Number(e.target.value))}
                disabled={!isPowerOn}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>0V</span>
                <span>Threshold: 2.1V</span>
                <span>10V</span>
              </div>
            </div>

            {/* Reaction Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                <span>Tiến độ phản ứng</span>
                <span>{Math.round(time)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${time}%` }}
                />
              </div>
            </div>

            {/* Chemical Equations */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
              <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Phương trình hóa học</h4>
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-slate-400 mb-1">Tổng quát:</div>
                  <div className="text-green-400 font-bold">2Al₂O₃ → 4Al + 3O₂↑</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-slate-400 mb-1">Cathode (-):</div>
                    <div className="text-blue-300">Al³⁺ + 3e → Al</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-slate-400 mb-1">Anode (+):</div>
                    <div className="text-orange-300">2O²⁻ → O₂ + 4e</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={resetLab}
          className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all mt-8 flex items-center justify-center gap-2 border border-slate-200"
        >
          <RotateCcw className="w-5 h-5" />
          Làm mới thí nghiệm
        </button>
      </div>
    </motion.div>
  );
}

// --- NACL LAB COMPONENT ---

const NACL_CHEMICAL_DATA = {
  NaCl: {
    name: "Natri Clorua (NaCl)",
    operatingTemp: "850 °C",
    minVoltage: 4.0,
    additives: "Không có (chỉ dùng NaCl tinh khiết nóng chảy).",
    equation: "2NaCl (nc) ⟶ 2Na + Cl₂↑",
    cathodeEq: "Na⁺ + 1e ⟶ Na",
    anodeEq: "2Cl⁻ ⟶ Cl₂ + 2e",
    cation: { symbol: "Na⁺", color: "bg-gradient-to-br from-amber-400 to-orange-600", label: "Cation" },
    anion: { symbol: "Cl⁻", color: "bg-gradient-to-br from-lime-400 to-emerald-600", label: "Anion" },
    movementDesc: "• Na⁺ (Cation) mang điện dương nên bị hút về Catot (cực âm). Tại đây, Na⁺ nhận electron trở thành kim loại Natri nóng chảy.\n• Cl⁻ (Anion) mang điện âm bị hút về Anot (cực dương). Tại đây, Cl⁻ nhường electron tạo thành khí Clo (Cl₂) bay lên."
  }
};

const NaClParticle = ({ type, isActive, index, data }: any) => {
  const isCation = type === 'cation';
  const ionData = isCation ? data.cation : data.anion;
  
  const startX = useRef(Math.random() * 180 - 90).current;
  const startY = useRef(Math.random() * 100 - 50).current;
  const targetX = isCation ? -84 : 84; 
  const targetY = useRef((index % 6) * 20 - 50).current; 

  return (
    <motion.div
      className={cn(
        "absolute w-7 h-7 flex items-center justify-center text-white text-[10px] font-extrabold shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.5)] ring-1 ring-white/50 z-10",
        ionData.color
      )}
      style={{ borderRadius: '50%', textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={
        isActive 
        ? (isCation 
            ? { x: [startX, targetX], y: [startY, targetY], opacity: [0, 1, 0], scale: [0.8, 1, 0.2] }
            : { x: targetX, y: targetY, opacity: 1, scale: 1 })
        : { x: [startX - 15, startX + 15, startX], y: [startY - 15, startY + 15, startY], opacity: 1, scale: 1 }
      }
      transition={
        isActive
        ? (isCation
            ? { duration: 1.5 + Math.random(), repeat: Infinity, ease: "easeIn" }
            : { duration: 1.5 + Math.random(), ease: "easeInOut" })
        : { duration: 3 + Math.random(), repeat: Infinity, ease: "easeInOut" }
      }
    >
      {ionData.symbol}
      
      {isActive && !isCation && (
        <motion.div
          className="absolute w-full h-full bg-white/80 shadow-sm"
          initial={{ scale: 0, y: 0, opacity: 0, borderRadius: '50%' }}
          animate={{ scale: [0, 1.2, 0.6], y: -150 - Math.random() * 50, opacity: [0, 1, 0] }}
          transition={{ delay: 1.8 + Math.random() * 0.4, duration: 2 + Math.random(), repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

function NaClLab() {
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [voltage, setVoltage] = useState(0);
  const [temperature, setTemperature] = useState(25);
  const [time, setTime] = useState(0); 
  const [particles, setParticles] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false); 

  const MAX_TIME = 280; 
  const currentData = NACL_CHEMICAL_DATA.NaCl;
  const isActive = isPowerOn && voltage >= currentData.minVoltage && temperature >= 801;

  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({ id: `NaCl-cat-${i}`, type: 'cation', index: i });
      newParticles.push({ id: `NaCl-ani-${i}`, type: 'anion', index: i });
    }
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    let tempInterval: any = null;
    if (isPowerOn && voltage >= currentData.minVoltage && temperature < 850) {
      tempInterval = setInterval(() => {
        setTemperature(prev => Math.min(prev + 5, 850));
      }, 50);
    }
    return () => clearInterval(tempInterval);
  }, [isPowerOn, voltage, temperature, currentData.minVoltage]);

  useEffect(() => {
    let interval: any = null;
    let soundInterval: any = null;

    if (isActive && !isCompleted) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (prevTime >= MAX_TIME - 1) {
            setIsCompleted(true);
            setIsPowerOn(false); 
            return MAX_TIME;
          }
          return prevTime + 1;
        });
      }, 100);

      soundInterval = setInterval(() => {
        const ctx = getAudioCtx();
        if (ctx) playBubble(ctx, 0.03, 1.3);
      }, 300);
    } else {
      clearInterval(interval);
      clearInterval(soundInterval);
    }
    return () => {
      clearInterval(interval);
      clearInterval(soundInterval);
    };
  }, [isActive, isCompleted]);

  const resetLab = () => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    setIsPowerOn(false);
    setVoltage(0);
    setTemperature(25);
    setTime(0);
    setIsCompleted(false);
  };

  const togglePower = () => {
    const ctx = getAudioCtx();
    if (ctx) playClick(ctx);
    if (!isCompleted) setIsPowerOn(!isPowerOn);
  };

  const formatTime = (ticks: number) => {
    const totalSeconds = Math.floor(ticks / 10);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-7xl mx-auto"
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-black text-blue-950 tracking-tight flex items-center justify-center gap-3">
          <Atom className="w-10 h-10 text-blue-500" />
          Mô Phỏng Điện Phân Muối Ăn (NaCl)
        </h1>
        <p className="text-blue-600/80 mt-2 font-medium">Kết hợp lý thuyết vi mô và cơ chế vận hành hệ thống thực tế</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 w-full">
        <div className="flex-1 space-y-4 max-w-[500px] xl:max-w-none mx-auto w-full flex flex-col">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
            <div className="bg-blue-950 p-4 rounded-2xl shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border-4 border-blue-900 flex justify-between items-center text-white mb-6">
              <div className="flex flex-col items-center w-1/3 border-r border-blue-800/50">
                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Thermometer className="w-3 h-3"/> Nhiệt độ
                </span>
                <span className={cn("font-mono text-xl md:text-2xl font-black", temperature >= 801 ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' : 'text-blue-700')}>
                  {temperature} °C
                </span>
              </div>
              <div className="flex flex-col items-center w-1/3 border-r border-blue-800/50">
                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3"/> Điện áp
                </span>
                <span className={cn("font-mono text-xl md:text-2xl font-black", isPowerOn ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'text-blue-700')}>
                  {parseFloat(voltage.toString()).toFixed(1)} V
                </span>
              </div>
              <div className="flex flex-col items-center w-1/3">
                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Timer className="w-3 h-3"/> Thời gian
                </span>
                <span className={cn("font-mono text-xl md:text-2xl font-black", isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-blue-700')}>
                  {formatTime(time)}
                </span>
              </div>
            </div>

            <div className="space-y-5 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 flex items-center gap-2">
                  <Power className="w-5 h-5 text-blue-500" /> Công tắc Nguồn
                </span>
                <button 
                  onClick={togglePower}
                  disabled={isCompleted}
                  className={cn(
                    "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                    isPowerOn ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : (isCompleted ? "bg-blue-100 cursor-not-allowed" : "bg-blue-200")
                  )}
                >
                  <span className={cn("inline-block h-6 w-6 transform rounded-full bg-white transition-transform", isPowerOn ? "translate-x-7" : "translate-x-1")} />
                </button>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-blue-800 text-sm">Nhiệt độ lò nung</label>
                  <span className={cn("font-mono font-bold", temperature >= 801 ? 'text-orange-600' : 'text-blue-400')}>
                    {temperature} °C / Ngưỡng 801 °C
                  </span>
                </div>
                <input 
                  type="range" min="25" max="850" step="1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  disabled={isCompleted}
                  className="w-full h-3 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-blue-800 text-sm">Hiệu điện thế thao tác</label>
                  <span className={cn("font-mono font-bold", voltage >= currentData.minVoltage ? 'text-blue-600' : 'text-red-400')}>
                    {parseFloat(voltage.toString()).toFixed(1)}V / Ngưỡng {currentData.minVoltage.toFixed(1)}V
                  </span>
                </div>
                <input 
                  type="range" min="0" max="10" step="0.1"
                  value={voltage}
                  onMouseDown={() => {
                    const ctx = getAudioCtx();
                    if (ctx) playClick(ctx);
                  }}
                  onChange={(e) => setVoltage(Number(e.target.value))}
                  disabled={!isPowerOn || isCompleted}
                  className={cn("w-full h-3 bg-blue-100 rounded-lg appearance-none cursor-pointer disabled:opacity-50", isPowerOn ? 'accent-blue-600' : 'accent-blue-300')}
                />
                {!isActive && isPowerOn && !isCompleted && (
                  <div className="mt-2 text-xs font-bold text-red-500 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-4 h-4" /> 
                    {temperature < 801 
                      ? "Cần nung nóng NaCl đến trạng thái nóng chảy (> 801°C)." 
                      : `Cần cấp đủ ${currentData.minVoltage}V để quá trình điện phân diễn ra.`}
                  </div>
                )}
                {isCompleted && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-700 text-sm font-bold shadow-sm">
                    <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" /> 
                    <span>Thí nghiệm đã kết thúc! Nhấn <strong>Làm lại thí nghiệm</strong> để tiếp tục.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              {isPowerOn && !isCompleted && (
                <button 
                  onClick={() => {
                    const ctx = getAudioCtx();
                    if (ctx) playClick(ctx);
                    setIsPowerOn(false);
                    setIsCompleted(true);
                  }}
                  className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all flex justify-center items-center gap-2 border border-red-200"
                >
                  <StopCircle className="w-4 h-4" /> Dừng phản ứng
                </button>
              )}
              <button 
                onClick={resetLab}
                className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all flex justify-center items-center gap-2 border border-blue-200"
              >
                <RotateCcw className="w-4 h-4" /> Làm lại thí nghiệm
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100 relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-10 opacity-60"></div>
            <h3 className="font-extrabold text-blue-950 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" /> THÔNG TIN & PHẢN ỨNG
            </h3>
            
            <div className="space-y-4">
              <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                <p className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3"/> Quá trình di chuyển Ion
                </p>
                <div className="text-sm text-blue-900 font-medium leading-relaxed space-y-2">
                  {currentData.movementDesc.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-100">
                  <p className="text-xs font-bold text-cyan-600 mb-1 flex items-center gap-1">Catot (-) <ChevronRight className="w-3 h-3"/></p>
                  <code className="text-[13px] text-blue-950 font-bold">{currentData.cathodeEq}</code>
                </div>
                <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                  <p className="text-xs font-bold text-sky-600 mb-1 flex items-center gap-1">Anot (+) <ChevronRight className="w-3 h-3"/></p>
                  <code className="text-[13px] text-blue-950 font-bold">{currentData.anodeEq}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[1.5] bg-[#082f49] rounded-3xl shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] border-4 border-[#0c4a6e] flex flex-col items-center justify-center relative overflow-hidden min-h-[500px] w-full max-w-[600px] xl:max-w-none mx-auto">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px] opacity-40" />

          <div className="relative flex items-end justify-center w-full max-w-[440px] h-[380px] mt-10 transform scale-90 sm:scale-100">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-16 bg-[#0c4a6e] rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-30 flex items-center justify-between px-5 border-b-4 border-[#082f49]">
              <span className="font-extrabold text-blue-300 text-3xl">-</span>
              <div className={cn("flex flex-col items-center", isPowerOn ? 'text-cyan-400' : 'text-blue-300/50')}>
                <BatteryCharging className={cn("w-6 h-6", isPowerOn ? 'animate-pulse' : '')} />
              </div>
              <span className="font-extrabold text-white text-3xl">+</span>
            </div>
            
            <svg className="absolute top-0 left-0 w-full h-[150px] z-0" pointerEvents="none">
              <path d="M 160 32 L 136 32 L 136 130" fill="none" stroke={isPowerOn ? "#38bdf8" : "#1e3a8a"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-500"/>
              <path d="M 280 32 L 304 32 L 304 130" fill="none" stroke={isPowerOn ? "#ffffff" : "#1e3a8a"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-500"/>
              
              {isActive && (
                <>
                  <circle cx="0" cy="0" r="4" fill="#67e8f9" className="shadow-[0_0_10px_#67e8f9]">
                    <animateMotion path="M 304 130 L 304 32 L 280 32" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="4" fill="#67e8f9" className="shadow-[0_0_10px_#67e8f9]">
                    <animateMotion path="M 160 32 L 136 32 L 136 130" dur="1s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </svg>

            <div className="absolute bottom-0 w-[340px] h-[180px] bg-gradient-to-b from-cyan-300/30 to-blue-500/30 rounded-b-[40px] z-10 flex items-center justify-center shadow-[inset_0_10px_40px_rgba(56,189,248,0.2)] border-t border-cyan-300/30">
              {particles.map(p => (
                <NaClParticle key={p.id} type={p.type} isActive={isActive} index={p.index} data={currentData} />
              ))}
            </div>

            <div className="absolute bottom-[30px] left-[120px] w-8 h-[240px] bg-gradient-to-b from-[#0f172a] to-[#020617] rounded-t-md z-20 shadow-[inset_-4px_0_10px_rgba(0,0,0,0.8)] border-t-2 border-blue-900 flex justify-center">
              <div className="mt-4 text-blue-300/50 font-black text-2xl z-30">-</div>
              
              <div 
                className="absolute bottom-0 left-[-25%] w-[150%] bg-gradient-to-r from-slate-200 via-white to-slate-400 rounded-t-sm z-30 shadow-[0_0_20px_rgba(255,255,255,0.9),inset_0_2px_5px_rgba(0,0,0,0.2)] border-t-[3px] border-l-[2px] border-r-[2px] border-white/90 overflow-hidden"
                style={{ 
                  height: `${Math.min(time * 0.5, 140)}px`, 
                  opacity: time > 0 ? 1 : 0,
                  transition: 'height 0.1s linear, opacity 0.5s ease' 
                }}
              >
                <div className="w-full h-[140px] opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.2)_2px,rgba(0,0,0,0.2)_4px)] absolute bottom-0" />
              </div>
            </div>
            
            <div className="absolute bottom-[30px] right-[120px] w-8 h-[240px] bg-gradient-to-b from-[#0f172a] to-[#020617] rounded-t-md z-20 shadow-[inset_4px_0_10px_rgba(0,0,0,0.8)] border-t-2 border-blue-900 flex justify-center">
              <div className="mt-4 text-white/40 font-black text-2xl z-30">+</div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-[220px] border-[6px] border-t-0 border-white/40 rounded-b-[48px] z-30 pointer-events-none shadow-[inset_0_0_15px_rgba(255,255,255,0.3),0_20px_40px_rgba(0,0,0,0.5)] bg-transparent">
              <div className="absolute top-4 right-6 w-5 h-[80%] bg-gradient-to-b from-white/40 to-transparent rounded-full blur-[1px] skew-x-[-8deg]" />
              <div className="absolute top-4 right-12 w-1 h-[60%] bg-gradient-to-b from-white/30 to-transparent rounded-full blur-[0px] skew-x-[-8deg]" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

