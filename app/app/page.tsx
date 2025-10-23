'use client';

import { useState, useRef, useEffect } from 'react';
import { ImportPanel } from '@/components/ImportPanel';
import { Toolbar } from '@/components/Toolbar';
import { CanvasStage } from '@/components/CanvasStage';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { SelectedElement } from '@/lib/types';
import { exportToHTML, downloadHTML, generateUniqueId } from '@/lib/html-utils';
import { useHistory } from '@/hooks/use-history';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AppPage() {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clipboard, setClipboard] = useState<string[]>([]);
  const stageContentRef = useRef('');
  const { state: htmlContent, set: setHtmlContent, undo, redo, canUndo, canRedo, reset } = useHistory('');

  useEffect(() => {
    stageContentRef.current = htmlContent;
  }, [htmlContent]);

  const handleImport = (html: string) => {
    reset(html);
    setSelectedElement(null);
    setSelectedElements([]);
  };

  const handleContentChange = (html: string) => {
    setHtmlContent(html);
  };

  const handleAddText = () => {
    const newTextId = generateUniqueId();
    const newText = `<p id="${newTextId}" style="position: absolute; left: 50px; top: 50px; font-size: 16px; color: #000000;">New Text</p>`;
    const updatedContent = stageContentRef.current + newText;
    setHtmlContent(updatedContent);
  };

  const handleAddImage = (imageUrl: string) => {
    const newImageId = generateUniqueId();
    const newImage = `<img id="${newImageId}" src="${imageUrl}" alt="Image" style="position: absolute; left: 100px; top: 100px; width: 200px; height: 200px; object-fit: cover;" />`;
    const updatedContent = stageContentRef.current + newImage;
    setHtmlContent(updatedContent);
  };

  const handleDelete = () => {
    if (selectedElements.length > 0) {
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    if (selectedElements.length > 0) {
      selectedElements.forEach(el => el.element.remove());
      setSelectedElement(null);
      setSelectedElements([]);
      setShowDeleteDialog(false);
      const updatedContent = stageContentRef.current;
      setHtmlContent(updatedContent);
    }
  };

  const handleExport = () => {
    const fullHTML = exportToHTML(stageContentRef.current);
    downloadHTML(fullHTML, 'edited-poster.html');
  };

  const handleCopy = () => {
    if (selectedElements.length > 0) {
      const copiedHTML = selectedElements.map(el => el.element.outerHTML);
      setClipboard(copiedHTML);
    }
  };

  const handlePaste = () => {
    if (clipboard.length > 0) {
      const parser = new DOMParser();
      const pastedHTML = clipboard.map(html => {
        const doc = parser.parseFromString(html, 'text/html');
        const element = doc.body.firstChild as HTMLElement;
        if (element) {
          element.id = generateUniqueId();
          const currentLeft = parseInt(element.style.left) || 0;
          const currentTop = parseInt(element.style.top) || 0;
          element.style.left = `${currentLeft + 20}px`;
          element.style.top = `${currentTop + 20}px`;
          return element.outerHTML;
        }
        return '';
      }).join('');
      const updatedContent = stageContentRef.current + pastedHTML;
      setHtmlContent(updatedContent);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if ((e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (isCtrlOrCmd && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (isCtrlOrCmd && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.length > 0) {
        e.preventDefault();
        setShowDeleteDialog(true);
      } else if (isCtrlOrCmd && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if (isCtrlOrCmd && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, clipboard, canUndo, canRedo, undo, redo]);

  return (
    <div className="h-screen flex bg-slate-50">
      <Toolbar
        onAddText={handleAddText}
        onAddImage={handleAddImage}
        onDelete={handleDelete}
        onExport={handleExport}
        onImport={handleImport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={!!selectedElement}
      />

      <div className="flex flex-1 overflow-hidden">
        <CanvasStage
          htmlContent={htmlContent}
          onSelect={setSelectedElement}
          selectedElement={selectedElement}
          selectedElements={selectedElements}
          onContentChange={handleContentChange}
          onMultiSelect={setSelectedElements}
        />

        <PropertiesPanel
          selectedElement={selectedElement}
          onContentChange={handleContentChange}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Element</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedElements.length} element{selectedElements.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
