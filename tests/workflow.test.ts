import { describe, it, expect } from "vitest";
import { veldoWorkflow } from "@/lib/agents/workflow-plan";

describe("campaign workflow plan", () => {
  it("defines the canonical 7-stage outbound pipeline", () => {
    expect(veldoWorkflow).toHaveLength(7);
  });

  it("orders stages from research through send without gaps", () => {
    const orders = veldoWorkflow.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("ends with a human approval gate before the sender", () => {
    const agents = veldoWorkflow.map((s) => s.agent);
    expect(agents.indexOf("human_review")).toBeLessThan(agents.indexOf("sender"));
  });

  it("every stage has an agent and a label", () => {
    for (const stage of veldoWorkflow) {
      expect(stage.agent).toBeTruthy();
      expect(stage.label).toBeTruthy();
    }
  });
});
