import { describe, expect, it } from "vitest";
import { attentionTotal, isUnseen, parseSeenAt } from "@/lib/admin/attention";

/** D-43: the number on the header's «Admin» link = open reports + unseen code redemptions. */

const NOW = new Date("2026-09-25T12:00:00Z");

describe("parseSeenAt", () => {
  it("accepts a past timestamp and normalises it", () => {
    expect(parseSeenAt("2026-09-25T09:00:00-03:00", NOW)).toBe("2026-09-25T12:00:00.000Z");
  });

  it("ignores a missing, malformed or future mark", () => {
    expect(parseSeenAt(undefined, NOW)).toBeNull();
    expect(parseSeenAt("", NOW)).toBeNull();
    expect(parseSeenAt("ayer", NOW)).toBeNull();
    expect(parseSeenAt("2099-01-01T00:00:00Z", NOW)).toBeNull();
  });
});

describe("isUnseen", () => {
  const seen = "2026-09-24T10:00:00.000Z";
  it("counts only redemptions after the mark", () => {
    expect(isUnseen("2026-09-24T10:00:01Z", seen)).toBe(true);
    expect(isUnseen("2026-09-24T10:00:00Z", seen)).toBe(false);
    expect(isUnseen("2026-09-23T10:00:00Z", seen)).toBe(false);
  });
  it("treats everything as new before the first visit", () => {
    expect(isUnseen("2020-01-01T00:00:00Z", null)).toBe(true);
  });
});

describe("attentionTotal", () => {
  it("adds open reports and unseen redemptions", () => {
    expect(attentionTotal(2, 3)).toBe(5);
    expect(attentionTotal(0, 0)).toBe(0);
  });
  it("leaves out a count that could not be read instead of guessing", () => {
    expect(attentionTotal(null, 3)).toBe(3);
    expect(attentionTotal(4, null)).toBe(4);
    expect(attentionTotal(null, null)).toBe(0);
  });
});
