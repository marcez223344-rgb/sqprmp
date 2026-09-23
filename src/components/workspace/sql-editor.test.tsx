import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { SqlEditor } from "./sql-editor";

afterEach(cleanup);

function mount(value: string, onChange: (v: string) => void) {
  const utils = render(
    <SqlEditor
      value={value}
      onChange={onChange}
      onRun={() => {}}
      onSubmit={() => {}}
      schema={{ customers: ["id", "full_name"] }}
      ariaLabel="Editor de SQL"
      placeholderText="SELECT …"
    />,
  );
  const dom = utils.container.querySelector<HTMLElement>(".cm-editor");
  const view = dom ? EditorView.findFromDOM(dom) : null;
  if (!view) throw new Error("CodeMirror view not found");
  return { ...utils, view };
}

describe("SqlEditor value synchronisation", () => {
  /**
   * Regression: React state lags behind fast typing, so the parent re-renders with a `value`
   * that is already one or more characters old. Echoing it back into the document deleted text
   * the learner had typed — in CI "select id from customers order by id limit 10" reached the
   * engine as "seid frcustomerid li" (05-exercise.spec.ts) and "select pg_sleep(1)" as
   * "select pg_sleep(1", which the gate reported as a syntax error instead of a denied function
   * (04-demo-sandbox.spec.ts).
   */
  it("keeps the learner's text when the parent re-renders with a stale value", () => {
    const onChange = vi.fn();
    const { view, rerender } = mount("select ", onChange);
    view.contentDOM.focus();
    // Two keystrokes the parent has not rendered yet.
    view.dispatch({ changes: { from: view.state.doc.length, insert: "i" } });
    view.dispatch({ changes: { from: view.state.doc.length, insert: "d" } });
    expect(onChange).toHaveBeenLastCalledWith("select id");

    // The render for the first of those keystrokes arrives now.
    rerender(
      <SqlEditor
        value="select i"
        onChange={onChange}
        onRun={() => {}}
        onSubmit={() => {}}
        schema={{ customers: ["id", "full_name"] }}
        ariaLabel="Editor de SQL"
        placeholderText="SELECT …"
      />,
    );
    expect(view.state.doc.toString()).toBe("select id");
  });

  it("applies an external reset when the editor does not have focus", () => {
    const onChange = vi.fn();
    const { view, rerender } = mount("select id", onChange);
    view.contentDOM.blur();
    rerender(
      <SqlEditor
        value=""
        onChange={onChange}
        onRun={() => {}}
        onSubmit={() => {}}
        schema={{ customers: ["id", "full_name"] }}
        ariaLabel="Editor de SQL"
        placeholderText="SELECT …"
      />,
    );
    expect(view.state.doc.toString()).toBe("");
  });
});
