import { NextResponse, type NextRequest } from "next/server";
import { directoryCsv, exportFileName } from "@/lib/admin/csv";
import { parseDirectoryParams } from "@/lib/admin/directory";
import { exportRateLimited, exportUsersAdmin, logUsersExport } from "@/lib/admin/queries";
import { getCurrentProfile } from "@/lib/auth/session";

/**
 * CSV of the user directory (owner feedback item 1).
 *
 * A Route Handler rather than a server action because the browser has to download a file. The
 * rules are the same as everywhere else: admin checked on the server, input parsed before use,
 * rate limited (a full table scan per call), and the export itself audit-logged — an export is a
 * privileged read of everybody at once, so it belongs in `audit_logs` like any grant.
 *
 * The columns are exactly the ones the on-screen directory shows: no email, no birth date
 * (docs/SECURITY.md §7.2). A non-admin gets 404 rather than 403: the route's existence is not
 * something a signed-in learner needs confirmed.
 */
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.deleted_at) {
    return new NextResponse(null, { status: 404 });
  }

  const params = parseDirectoryParams(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (await exportRateLimited(profile.id)) return new NextResponse(null, { status: 429 });

  const { rows, total, truncated } = await exportUsersAdmin(params);
  await logUsersExport(profile.id, { rows: rows.length, total, truncated, params });

  return new NextResponse(directoryCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFileName()}"`,
      // A directory snapshot must never sit in a shared or browser cache.
      "cache-control": "no-store",
    },
  });
}
