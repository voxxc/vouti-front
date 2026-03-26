import { useRef, useState, useCallback } from "react";
import { LinkTextElement } from "@/types/link";

interface DraggableTextElementProps {
  element: LinkTextElement;
  editable?: boolean;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onClick?: (element: LinkTextElement) => void;
  containerScale?: number;
}

export const DraggableTextElement = ({
  element,
  editable = false,
  onPositionChange,
  onClick,
  containerScale = 1,
}: DraggableTextElementProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0, elX: 0, elY: 0 });

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!editable || !ref.current) return;
      setDragging(true);
      startPos.current = {
        x: clientX,
        y: clientY,
        elX: element.position_x,
        elY: element.position_y,
      };
    },
    [editable, element.position_x, element.position_y]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging || !ref.current) return;
      const parent = ref.current.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dx = ((clientX - startPos.current.x) / rect.width) * 100;
      const dy = ((clientY - startPos.current.y) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, startPos.current.elX + dx));
      const newY = Math.max(0, Math.min(100, startPos.current.elY + dy));
      ref.current.style.left = `${newX}%`;
      ref.current.style.top = `${newY}%`;
    },
    [dragging]
  );

  const handleEnd = useCallback(() => {
    if (!dragging || !ref.current) return;
    setDragging(false);
    const parent = ref.current.parentElement;
    if (!parent) return;
    const left = parseFloat(ref.current.style.left);
    const top = parseFloat(ref.current.style.top);
    onPositionChange?.(element.id, left, top);
  }, [dragging, element.id, onPositionChange]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY);

    const onMM = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY);
    const onMU = () => {
      handleEnd();
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("mouseup", onMU);
    };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!editable) return;
    e.stopPropagation();
    const t = e.touches[0];
    handleStart(t.clientX, t.clientY);

    const onTM = (ev: TouchEvent) => {
      ev.preventDefault();
      handleMove(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const onTE = () => {
      handleEnd();
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("touchend", onTE);
    };
    window.addEventListener("touchmove", onTM, { passive: false });
    window.addEventListener("touchend", onTE);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onClick?.(element);
  };

  // Scale font size for preview containers
  const scaledFontSize = element.font_size * containerScale;

  return (
    <div
      ref={ref}
      className={`absolute select-none whitespace-pre-wrap ${editable ? "cursor-grab ring-1 ring-transparent hover:ring-primary/40 rounded" : ""} ${dragging ? "cursor-grabbing z-50" : ""}`}
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: "translate(-50%, -50%)",
        fontFamily: element.font_family,
        fontSize: `${scaledFontSize}px`,
        color: element.color,
        fontWeight: element.font_weight,
        fontStyle: element.font_style,
        lineHeight: 1.3,
        pointerEvents: "auto",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={handleClick}
    >
      {element.content}
    </div>
  );
};
