import assert from "node:assert/strict";
import { test } from "node:test";
import { planAgentSteps } from "../src/lib/agent/planner.ts";

const surfaces = ["web", "slack", "telegram"];

test("plans equivalent summary requests across web, Slack, and Telegram surfaces", () => {
  const request = "What happened with Acme this week?";
  const expected = planAgentSteps(request);

  for (const surface of surfaces) {
    assert.deepEqual(planAgentSteps(request), expected, surface);
  }
  assert.equal(expected[0].toolName, "summarize_activity");
});

test("plans destructive requests behind the delete tool for every surface", () => {
  const request = "Delete employee 00000000-0000-0000-0000-000000000001";
  for (const surface of surfaces) {
    const [step] = planAgentSteps(request);
    assert.equal(step.toolName, "delete_record", surface);
    assert.equal(step.input.recordType, "employees");
  }
});

test("plans team invites and billing portal actions as typed tools", () => {
  assert.deepEqual(planAgentSteps("Invite James at james@example.com as admin")[0], {
    toolName: "invite_team_member",
    input: { email: "james@example.com", role: "admin" },
  });

  assert.equal(
    planAgentSteps("Update the billing contact and payment method")[0].toolName,
    "create_billing_portal_session",
  );
});
