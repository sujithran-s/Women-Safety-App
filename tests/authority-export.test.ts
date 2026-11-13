import { describe, expect, it } from "vitest";

import { buildAuthorityExportHtml } from "../lib/authority-export";

describe("authority exports", () => {
  it("renders the required individual and collective user fields in a formatted table", () => {
    const html = buildAuthorityExportHtml([{ userName: "Asha", userEmail: "asha@example.test", userPhone: "+91 98765 43210", exactLocation: "RS Puram, Coimbatore", occurredAt: "2026-10-10T08:00:00.000Z", riskBand: "High", riskScore: 82, deliveryStatus: "online_dispatch_requested" }], "Authority today");
    expect(html).toContain("Asha");
    expect(html).toContain("asha@example.test");
    expect(html).toContain("+91 98765 43210");
    expect(html).toContain("RS Puram, Coimbatore");
    expect(html).toContain("<th>Exact SOS location</th>");
    expect(html).toContain("High (82/100)");
  });

  it("escapes user-controlled values before putting them into export HTML", () => {
    const html = buildAuthorityExportHtml([{ userName: "<script>alert(1)</script>", userEmail: "a&b@example.test", userPhone: "unknown", exactLocation: "<unresolved>", occurredAt: "2026-10-10T08:00:00.000Z", riskBand: "Low", riskScore: 4, deliveryStatus: "safe" }], "Export");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("a&amp;b@example.test");
  });
});
