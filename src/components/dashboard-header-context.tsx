"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

type HeaderContent = ReactNode;

interface HeaderContextType {
  setHeaderContent: (content: HeaderContent) => void;
  clearHeaderContent: () => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

// A simple global state to avoid re-rendering the entire layout when header changes
let globalHeaderContent: HeaderContent = null;
const listeners = new Set<(content: HeaderContent) => void>();

const notify = () => {
  listeners.forEach((l) => l(globalHeaderContent));
};

export function HeaderProvider({ children }: { children: ReactNode }) {
  const setHeaderContent = useCallback((content: HeaderContent) => {
    if (globalHeaderContent === content) return;
    globalHeaderContent = content;
    notify();
  }, []);

  const clearHeaderContent = useCallback(() => {
    if (globalHeaderContent === null) return;
    globalHeaderContent = null;
    notify();
  }, []);

  return (
    <HeaderContext.Provider value={{ setHeaderContent, clearHeaderContent }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

export function useHeaderContent() {
  const [content, setContent] = useState<HeaderContent>(globalHeaderContent);

  useEffect(() => {
    const l = (newContent: HeaderContent) => setContent(newContent);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return content;
}

export function HeaderSetter({ children }: { children: ReactNode }) {
  const { setHeaderContent, clearHeaderContent } = useHeader();

  useEffect(() => {
    setHeaderContent(children);
  }, [children, setHeaderContent]);

  useEffect(() => {
    return () => {
      clearHeaderContent();
    };
  }, [clearHeaderContent]);

  return null;
}
