import { describe, expect, it, vi } from "vitest";
import { Cygnus, type CygnusEvent } from "../src/client.js";
import { subscribeToEvents, type EventCursor } from "../src/events.js";

describe("subscribeToEvents", () => {
  it("streams events and updates cursor", async () => {
    const client = new Cygnus();
    const event1: CygnusEvent = {
      type: "ProgrammeFunded",
      programmeId: 1n,
      amount: 1000n,
    };
    const event2: CygnusEvent = {
      type: "MilestoneApproved",
      programmeId: 1n,
      milestoneIndex: 0,
    };

    vi.spyOn(client, "events")
      .mockResolvedValueOnce([event1])
      .mockResolvedValueOnce([event2])
      .mockResolvedValue([]);

    const emitted: CygnusEvent[] = [];
    const cursors: EventCursor[] = [];

    const sub = subscribeToEvents(client, {
      startLedger: 100,
      pollIntervalMs: 10,
      onEvent: (e) => emitted.push(e),
      onCursorUpdate: (c) => cursors.push(c),
    });

    expect(sub.isRunning()).toBe(true);

    // Wait briefly for polling cycles
    await new Promise((r) => setTimeout(r, 60));
    sub.stop();

    expect(sub.isRunning()).toBe(false);
    expect(emitted.length).toBeGreaterThanOrEqual(2);
    expect(emitted[0]).toEqual(event1);
    expect(emitted[1]).toEqual(event2);
    expect(cursors.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onError when polling throws", async () => {
    const client = new Cygnus();
    vi.spyOn(client, "events").mockRejectedValue(new Error("RPC Timeout"));

    const errors: unknown[] = [];
    const sub = subscribeToEvents(client, {
      startLedger: 100,
      pollIntervalMs: 10,
      onEvent: () => {},
      onError: (err) => errors.push(err),
    });

    await new Promise((r) => setTimeout(r, 40));
    sub.stop();

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect((errors[0] as Error).message).toBe("RPC Timeout");
  });

  it("stops cleanly without emitting further events", async () => {
    const client = new Cygnus();
    const event: CygnusEvent = {
      type: "ProgrammeRefunded",
      programmeId: 9n,
      amount: 50n,
    };
    vi.spyOn(client, "events").mockResolvedValue([event]);

    const emitted: CygnusEvent[] = [];
    const sub = subscribeToEvents(client, {
      startLedger: 100,
      pollIntervalMs: 10,
      onEvent: (e) => emitted.push(e),
    });

    sub.stop();
    const countAtStop = emitted.length;
    await new Promise((r) => setTimeout(r, 50));

    expect(emitted.length).toBe(countAtStop);
  });
});
