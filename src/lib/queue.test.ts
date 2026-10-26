import { describe, expect, test } from "bun:test";
import { MINUTE } from "./date";
import { StudyQueue } from "./queue";

const t0 = 1_700_000_000_000;

describe("StudyQueue", () => {
  test("serves main items in order", () => {
    const q = new StudyQueue([
      { id: "r1", kind: "review" },
      { id: "n1", kind: "new" },
    ]);
    expect(q.next(t0)?.id).toBe("r1");
    expect(q.next(t0)?.id).toBe("n1");
    expect(q.next(t0)).toBeNull();
  });

  test("a waiting card comes back first once its step is over", () => {
    const q = new StudyQueue([
      { id: "a", kind: "new" },
      { id: "b", kind: "new" },
      { id: "c", kind: "new" },
    ]);
    q.next(t0); // a
    q.wait("a", t0 + MINUTE);
    expect(q.next(t0 + 30_000)?.id).toBe("b");
    expect(q.next(t0 + 61_000)).toEqual({ id: "a", kind: "learn" });
    expect(q.next(t0 + 62_000)?.id).toBe("c");
  });

  test("learns ahead up to 20 minutes when nothing else is left", () => {
    const q = new StudyQueue([], [{ id: "x", due: t0 + 10 * MINUTE }]);
    expect(q.next(t0)?.id).toBe("x");
  });

  test("ends when the next waiting card is far away", () => {
    const q = new StudyQueue([], [{ id: "x", due: t0 + 30 * MINUTE }]);
    expect(q.next(t0)).toBeNull();
    expect(q.nextWaitingDue()).toBe(t0 + 30 * MINUTE);
    expect(q.size).toBe(1);
  });

  test("counts by kind", () => {
    const q = new StudyQueue(
      [
        { id: "r", kind: "review" },
        { id: "n1", kind: "new" },
        { id: "n2", kind: "new" },
      ],
      [{ id: "l", due: t0 }],
    );
    expect(q.counts()).toEqual({ new: 2, review: 1, learn: 1 });
  });
});
