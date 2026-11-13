export type AuthorityExportRow = {
  userName: string;
  userEmail: string;
  userPhone: string;
  exactLocation: string;
  occurredAt: string | Date;
  riskBand: string;
  riskScore: number;
  deliveryStatus: string;
};

export function escapeAuthorityHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
}

export function buildAuthorityExportHtml(rows: AuthorityExportRow[], title: string) {
  const body = rows.map((row) => `<tr><td>${escapeAuthorityHtml(row.userName)}</td><td>${escapeAuthorityHtml(row.userEmail)}</td><td>${escapeAuthorityHtml(row.userPhone)}</td><td>${escapeAuthorityHtml(row.exactLocation)}</td><td>${escapeAuthorityHtml(new Date(row.occurredAt).toLocaleString())}</td><td>${escapeAuthorityHtml(`${row.riskBand} (${row.riskScore}/100)`)}</td><td>${escapeAuthorityHtml(row.deliveryStatus)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeAuthorityHtml(title)}</title><style>body{font-family:Arial;color:#18212B;padding:28px}h1{color:#12355B}p{color:#5F6F80}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#12355B;color:#fff;text-align:left}th,td{border:1px solid #DDE5EC;padding:8px;vertical-align:top}</style></head><body><h1>${escapeAuthorityHtml(title)}</h1><p>Safety Response authority export · ${new Date().toLocaleString()} · Observed SOS records; risk score is modeled context.</p><table><thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Exact SOS location</th><th>Triggered</th><th>Risk</th><th>Delivery</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
}
