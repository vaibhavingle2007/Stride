import React, { useEffect, useState, useRef } from "react";

interface TrailGridProps {
  cellSize?: number;
  duration?: number;
  cellColor?: string;
}

export default function TrailGrid({
  cellSize = 36,
  duration = 200,
  cellColor = "#E4E4E7",
}: TrailGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const timeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const updateGrid = () => {
      const cols = Math.ceil(window.innerWidth / cellSize);
      const rows = Math.ceil(window.innerHeight / cellSize);
      setGrid({ cols, rows });
    };

    updateGrid();
    window.addEventListener("resize", updateGrid);
    return () => window.removeEventListener("resize", updateGrid);
  }, [cellSize]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Dead zone: suppress grid in hero section
      const heroSection = document.getElementById("stride-hero");
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        if (
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right
        ) {
          return; // exit early — no grid cells in hero
        }
      }

      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

      const col = Math.floor(e.clientX / cellSize);
      const row = Math.floor(e.clientY / cellSize);
      const index = row * grid.cols + col;
      const cell = document.getElementById(`trail-cell-${index}`);

      if (cell) {
        cell.style.backgroundColor = cellColor;
        cell.style.transition = "none";

        if (timeouts.current.has(index)) {
          clearTimeout(timeouts.current.get(index));
        }

        const timeout = setTimeout(() => {
          cell.style.backgroundColor = "transparent";
          cell.style.transition = `background-color ${duration}ms ease`;
        }, 10);

        timeouts.current.set(index, timeout);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [cellSize, duration, cellColor, grid.cols]);

  return (
    <>
      <style>
        {`
          .bg-grid-wrapper { display: none; }
          @media (hover: hover) and (pointer: fine) {
            .bg-grid-wrapper { display: grid; }
          }
        `}
      </style>
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0 bg-grid-wrapper"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.rows}, ${cellSize}px)`,
        }}
      >
        {Array.from({ length: grid.cols * grid.rows }).map((_, i) => (
          <div
            key={i}
            id={`trail-cell-${i}`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              backgroundColor: "transparent",
            }}
          />
        ))}
      </div>
    </>
  );
}
