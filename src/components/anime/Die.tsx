"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DieProps {
  rolling: boolean;
  onRollComplete: () => void;
}

const DURATION = 1500;
const FACE_SIZE = 120;
const HALF = FACE_SIZE / 2;

const FACES = [
  { value: 1, label: "1", gradient: "from-purple-600 to-purple-800" },
  { value: 2, label: "2", gradient: "from-red-500 to-rose-700" },
  { value: 3, label: "3", gradient: "from-purple-700 to-indigo-800" },
  { value: 4, label: "4", gradient: "from-rose-600 to-red-800" },
  { value: 5, label: "5", gradient: "from-indigo-600 to-purple-900" },
  { value: 6, label: "6", gradient: "from-red-600 to-purple-700" },
];

const FACE_TRANSFORMS = [
  `rotateY(0deg) translateZ(${HALF}px)`,
  `rotateY(180deg) translateZ(${HALF}px)`,
  `rotateY(90deg) translateZ(${HALF}px)`,
  `rotateY(-90deg) translateZ(${HALF}px)`,
  `rotateX(90deg) translateZ(${HALF}px)`,
  `rotateX(-90deg) translateZ(${HALF}px)`,
];

const FINAL_ROTATIONS = [
  { x: 0, y: 0 },
  { x: 0, y: 180 },
  { x: 0, y: -90 },
  { x: 0, y: 90 },
  { x: -90, y: 0 },
  { x: 90, y: 0 },
];

function randomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Die({ rolling, onRollComplete }: DieProps) {
  const cubeRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const targetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const totalRotationRef = useRef<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!rolling) return;

    if (prefersReducedMotion) {
      onRollComplete();
      return;
    }

    const target = randomRange(0, 5);
    targetRef.current = FINAL_ROTATIONS[target];

    const totalSpinsX = randomRange(4, 8) * 360;
    const totalSpinsY = randomRange(4, 8) * 360;
    const totalSpinsZ = randomRange(2, 5) * 360;
    totalRotationRef.current = {
      x: totalSpinsX + targetRef.current.x,
      y: totalSpinsY + targetRef.current.y,
      z: totalSpinsZ,
    };

    startTimeRef.current = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = easeOutCubic(progress);

      const rotX = totalRotationRef.current.x * eased;
      const rotY = totalRotationRef.current.y * eased;
      const rotZ = totalRotationRef.current.z * (1 - eased);

      if (cubeRef.current) {
        cubeRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
        onRollComplete();
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => stopAnimation();
  }, [rolling, onRollComplete, prefersReducedMotion, stopAnimation]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ perspective: 800 }}
    >
      <div
        ref={cubeRef}
        className="relative"
        style={{
          width: FACE_SIZE,
          height: FACE_SIZE,
          transformStyle: "preserve-3d",
        }}
      >
        {FACES.map((face, i) => (
          <div
            key={face.value}
            className={cn(
              "absolute flex items-center justify-center rounded-lg border border-white/10",
              "bg-gradient-to-br text-white font-bold shadow-lg",
              face.gradient
            )}
            style={{
              width: FACE_SIZE,
              height: FACE_SIZE,
              transform: FACE_TRANSFORMS[i],
              backfaceVisibility: "hidden",
            }}
          >
            <span className="text-3xl font-black drop-shadow-md select-none">
              {face.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
