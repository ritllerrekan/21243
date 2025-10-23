export interface ElementData {
  id: string;
  tagName: string;
  innerHTML?: string;
  attributes: Record<string, string>;
  style: Partial<CSSStyleDeclaration>;
  children?: ElementData[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface SelectedElement {
  id: string;
  element: HTMLElement;
  tagName: string;
  isImage: boolean;
  isText: boolean;
}

export interface ClipboardData {
  html: string;
  styles: string;
}
