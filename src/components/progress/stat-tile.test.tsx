import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Gauge } from "lucide-react";
import { Meter, StatTile } from "./stat-tile";

afterEach(cleanup);

describe("Meter", () => {
  it("exposes a value and a spoken equivalent, never a bare bar", () => {
    render(<Meter label="Progreso hacia el siguiente nivel" percent={37.4} valueText="59 XP" />);
    const bar = screen.getByRole("progressbar", { name: "Progreso hacia el siguiente nivel" });
    expect(bar).toHaveAttribute("aria-valuenow", "37");
    expect(bar).toHaveAttribute("aria-valuetext", "59 XP");
  });

  it("clamps out-of-range values so a goal already met cannot overflow the track", () => {
    render(<Meter label="Meta diaria" percent={180} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("StatTile", () => {
  it("renders label, number and the distance to the next threshold", () => {
    render(
      <dl>
        <StatTile
          label="Nivel"
          value={2}
          icon={Gauge}
          tone="achievement"
          caption="59 XP para el nivel 3"
        />
      </dl>,
    );
    expect(screen.getByText("Nivel")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("59 XP para el nivel 3")).toBeInTheDocument();
  });

  it("keeps the icon decorative: the label carries the meaning", () => {
    const { container } = render(
      <dl>
        <StatTile label="Monedas" value={36} icon={Gauge} />
      </dl>,
    );
    expect(container.querySelector("svg")?.closest("[aria-hidden='true']")).toBeTruthy();
    // No threshold, no meter: a full bar for coins would promise a goal that does not exist.
    expect(container.querySelector("[role='progressbar']")).toBeNull();
  });
});
