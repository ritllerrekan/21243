'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { assignIdsToElements, isTextElement, isImageElement } from '@/lib/html-utils';
import { SelectedElement } from '@/lib/types';
import { ResizeHandles } from './ResizeHandles';

interface CanvasStageProps {
  htmlContent: string;
  onSelect: (element: SelectedElement | null) => void;
  selectedElement: SelectedElement | null;
  selectedElements: SelectedElement[];
  onContentChange: (html: string) => void;
  onMultiSelect: (elements: SelectedElement[]) => void;
}

export function CanvasStage({ htmlContent, onSelect, selectedElement, selectedElements, onContentChange, onMultiSelect }: CanvasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (stageRef.current && htmlContent) {
      stageRef.current.innerHTML = htmlContent;
      assignIdsToElements(stageRef.current);

      stageRef.current.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.style.position || htmlEl.style.position === 'static') {
          const computedStyle = window.getComputedStyle(htmlEl);
          if (computedStyle.position === 'absolute' || computedStyle.position === 'relative') {
            return;
          }
        }
      });
    }
  }, [htmlContent]);

  useEffect(() => {
    if (selectedElement) {
      setElementRect(selectedElement.element.getBoundingClientRect());
    } else {
      setElementRect(null);
    }
  }, [selectedElement]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (target === stageRef.current) {
      if (!e.ctrlKey && !e.metaKey) {
        onSelect(null);
        onMultiSelect([]);
      }
      return;
    }

    let clickedElement = target;
    while (clickedElement && clickedElement.parentElement !== stageRef.current) {
      clickedElement = clickedElement.parentElement as HTMLElement;
    }

    if (clickedElement && clickedElement !== stageRef.current) {
      e.stopPropagation();

      const selection: SelectedElement = {
        id: clickedElement.id,
        element: clickedElement,
        tagName: clickedElement.tagName,
        isImage: isImageElement(clickedElement),
        isText: isTextElement(clickedElement),
      };

      if (e.ctrlKey || e.metaKey) {
        const isAlreadySelected = selectedElements.some(el => el.id === selection.id);
        if (isAlreadySelected) {
          const newSelection = selectedElements.filter(el => el.id !== selection.id);
          onMultiSelect(newSelection);
          if (newSelection.length === 1) {
            onSelect(newSelection[0]);
          } else if (newSelection.length === 0) {
            onSelect(null);
          }
        } else {
          const newSelection = [...selectedElements, selection];
          onMultiSelect(newSelection);
          onSelect(selection);
        }
        return;
      } else {
        onSelect(selection);
        onMultiSelect([selection]);
      }

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });

      const computedStyle = window.getComputedStyle(clickedElement);
      const currentLeft = parseInt(computedStyle.left) || 0;
      const currentTop = parseInt(computedStyle.top) || 0;

      setElementStart({ x: currentLeft, y: currentTop });

      if (computedStyle.position === 'static' || !clickedElement.style.position) {
        clickedElement.style.position = 'absolute';
        clickedElement.style.left = `${currentLeft}px`;
        clickedElement.style.top = `${currentTop}px`;
      }
    }
  }, [onSelect, onMultiSelect, selectedElements]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (selectedElements.length > 1) {
      selectedElements.forEach((el) => {
        const computedStyle = window.getComputedStyle(el.element);
        const currentLeft = parseInt(computedStyle.left) || 0;
        const currentTop = parseInt(computedStyle.top) || 0;

        el.element.style.left = `${currentLeft + deltaX}px`;
        el.element.style.top = `${currentTop + deltaY}px`;
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (selectedElement) {
      const newLeft = elementStart.x + deltaX;
      const newTop = elementStart.y + deltaY;

      selectedElement.element.style.left = `${newLeft}px`;
      selectedElement.element.style.top = `${newTop}px`;
    }
  }, [isDragging, selectedElement, selectedElements, dragStart, elementStart]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && stageRef.current) {
      onContentChange(stageRef.current.innerHTML);
    }
    setIsDragging(false);
  }, [isDragging, onContentChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);


  const handleResize = useCallback((width: number, height: number) => {
    if (!selectedElement || !selectedElement.isImage) return;

    const img = selectedElement.element as HTMLImageElement;
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.width = width;
    img.height = height;

    setElementRect(img.getBoundingClientRect());
  }, [selectedElement]);

  const handleResizeEnd = useCallback(() => {
    if (stageRef.current) {
      onContentChange(stageRef.current.innerHTML);
    }
  }, [onContentChange]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 flex-1 overflow-auto">
        <div className="relative">
          <div
            ref={stageRef}
            className="relative bg-white shadow-2xl cursor-pointer rounded-lg overflow-hidden border border-slate-200"
            style={{
              width: '720px',
              height: '720px',
            }}
            onMouseDown={handleMouseDown}
          >
            {!htmlContent && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">Import HTML to start editing</p>
                <p className="text-sm mt-1">Use the sidebar to get started</p>
              </div>
            )}
          </div>

          {selectedElement && elementRect && selectedElement.isImage && stageRef.current && selectedElements.length === 1 && (
            <ResizeHandles
              element={selectedElement.element}
              stageRef={stageRef.current}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
            />
          )}
        </div>

        {selectedElements.length > 0 && (
          <style jsx global>{`
            ${selectedElements.map(el => `
              #${el.id} {
                outline: 2px solid #3b82f6 !important;
                outline-offset: 2px;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
              }
            `).join('')}
          `}</style>
        )}
      </div>

      <div className="bg-slate-900 text-slate-300 px-6 py-3 border-t border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="font-medium">Canvas:</span>
            <span className="text-slate-400">720 × 720 px</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <span className="font-medium">Zoom:</span>
            <span className="text-slate-400">100%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedElement ? (
            <>
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium">Selected:</span>
              <span className="text-slate-400">
                {selectedElement.tagName.toLowerCase()}
                {selectedElement.isImage && ' (image)'}
                {selectedElement.isText && ' (text)'}
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-slate-500">No element selected</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
