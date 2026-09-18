"use client";

import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder,
} from "@codemirror/view";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  schema: Record<string, string[]>;
  ariaLabel: string;
  placeholderText: string;
  disabled?: boolean;
}

const theme = EditorView.theme({
  "&": {
    fontSize: "14px",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    borderRadius: "var(--radius-md)",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    padding: "12px 0",
    minHeight: "180px",
    caretColor: "var(--text)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--surface-2)",
    color: "var(--text-muted)",
    border: "none",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--primary) 8%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  "&.cm-focused": { outline: "2px solid var(--ring)", outlineOffset: "2px" },
  ".cm-placeholder": { color: "var(--text-muted)" },
});

/**
 * CodeMirror 6 SQL editor. Keyboard: Ctrl/⌘+Enter runs, Ctrl/⌘+Shift+Enter submits,
 * Esc then Tab leaves the editor (Tab inside indents). Labelled for screen readers.
 */
export function SqlEditor({
  value,
  onChange,
  onRun,
  onSubmit,
  schema,
  ariaLabel,
  placeholderText,
  disabled,
}: SqlEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun, onSubmit });
  const editable = useRef(new Compartment());
  useEffect(() => {
    callbacks.current = { onChange, onRun, onSubmit };
  });

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        highlightActiveLine(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true }),
        placeholder(placeholderText),
        theme,
        EditorView.lineWrapping,
        editable.current.of(EditorView.editable.of(!disabled)),
        keymap.of([
          { key: "Mod-Enter", run: () => (callbacks.current.onRun(), true) },
          { key: "Mod-Shift-Enter", run: () => (callbacks.current.onSubmit(), true) },
          { key: "Escape", run: (v) => (v.contentDOM.blur(), true) },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) callbacks.current.onChange(u.state.doc.toString());
        }),
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
          role: "textbox",
          "aria-multiline": "true",
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor owns its document after mount; external resets go through the `value` effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (reset, draft restore) are applied without re-creating the editor.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current !== value) v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure(EditorView.editable.of(!disabled)),
    });
  }, [disabled]);

  return <div ref={host} className="border-border rounded-md border" />;
}
