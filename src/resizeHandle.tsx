import { useRef } from "preact/hooks";
import { WindowSize } from "./types";
import { h } from "preact";
import styles from "./styles.css";

export const ResizeHandle = ({ onResize }: { onResize: (size: WindowSize) => void }) => {
  const handle = useRef<HTMLDivElement>(null);

  function onPointerDown(event: PointerEvent) {
    if (handle.current) {
      handle.current.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (handle.current?.hasPointerCapture(event.pointerId)) {
      const size = handle.current.clientWidth;
      onResize({
        w: 320,
        h: Math.max(580, Math.floor(event.clientY + size)),
      });
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (handle.current) {
      handle.current.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={styles.resize_handle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={handle}
    />
  );
};
