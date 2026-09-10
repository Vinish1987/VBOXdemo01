import { ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  return ok({ service: "vbox-api", time: new Date().toISOString() });
}
