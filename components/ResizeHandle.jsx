'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TABLE_HEIGHT_MIN, TABLE_HEIGHT_MAX } from '@/lib/brand';

// Resize handle — drag (or keyboard) to adjust the table height.
// Calls onResize(absoluteHeight) where absoluteHeight = startHeight + deltaY.
// Shared between the one-file and two-file flows.
export default function ResizeHandle({
  currentHeight,
  getStartHeight,
  onResize,
  min = TABLE_HEIGHT_MIN,
  max = TABLE_HEIGHT_MAX,
}) {
  // Visible focus ring is a separate state instead of relying on :focus-visible
  // CSS — this component uses inline styles, so toggling React state is the
  // cleanest way to give keyboard users a visible focus indicator without
  // adding a global stylesheet.
  const [hasFocus, setHasFocus] = useState(false);
  // Keep a reference to the active drag's cleanup function so we can invoke
  // it if the component unmounts mid-drag (prevents document.body from
  // getting stuck with ns-resize cursor and no text selection).
  const cleanupRef = useRef(() => {});
  useEffect(() => () => cleanupRef.current(), []);

  const startDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = getStartHeight();
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    const onMove = (ev) => onResize(startHeight + (ev.clientY - startY));
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      cleanupRef.current = () => {};
    };
    cleanupRef.current = cleanup;
    // setPointerCapture routes subsequent pointer events to this element
    // even if the pointer leaves the browser window (fixes stuck-state bug)
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cleanup, { once: true });
    window.addEventListener('pointercancel', cleanup, { once: true });
  };

  const handleKeyDown = (e) => {
    // Keyboard accessibility — Arrow keys nudge, Page keys jump, Home/End extremes
    const step = e.shiftKey ? 48 : 24;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onResize(getStartHeight() - step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onResize(getStartHeight() + step);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      onResize(getStartHeight() - 120);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      onResize(getStartHeight() + 120);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onResize(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onResize(max);
    }
  };

  return (
    <div
      role="separator"
      aria-label="Resize table height"
      aria-orientation="horizontal"
      aria-valuenow={currentHeight}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={startDrag}
      onKeyDown={handleKeyDown}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      title="Drag to resize the table (or use arrow keys, Home/End for min/max)"
      style={{
        height: '8px',
        cursor: 'ns-resize',
        background: hasFocus ? '#D6EBF2' : '#F5F7F8',
        borderTop: '0.5px solid #E6E6E6',
        borderBottom: '0.5px solid #E6E6E6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        outline: hasFocus ? '2px solid #00B5D6' : 'none',
        outlineOffset: '-2px',
      }}
    >
      <div style={{ width: '40px', height: '3px', background: hasFocus ? '#00B5D6' : '#CCCCCC', borderRadius: '2px' }} />
    </div>
  );
}
