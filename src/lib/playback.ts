// ============================================================================
//  PLAYBACK TICKETS
//  When access is granted, we hand the player a short-lived signed "ticket"
//  instead of a permanent video URL. This is the software mirror of CloudFront
//  signed URLs/cookies from the architecture plan: a copied link dies in minutes.
// ============================================================================

import jwt from "jsonwebtoken";

export interface PlaybackTicketClaims {
  /** The one episode this ticket is good for — scoping matters. */
  episodeId: string;
  /** Who it was issued to (null for anonymous free-episode plays). */
  userId: string | null;
  /** Whether the client must play ads (drives the player, enforced server-side too). */
  adSupported: boolean;
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET missing/too short");
  return s;
}

function ttlSeconds(): number {
  const raw = process.env.PLAYBACK_TICKET_TTL_SECONDS;
  const n = raw ? parseInt(raw, 10) : 300;
  return Number.isFinite(n) && n > 0 ? n : 300;
}

export function issuePlaybackTicket(claims: PlaybackTicketClaims): {
  ticket: string;
  expiresInSec: number;
} {
  const expiresInSec = ttlSeconds();
  const ticket = jwt.sign({ ...claims, kind: "playback" }, secret(), {
    expiresIn: expiresInSec,
  });
  return { ticket, expiresInSec };
}

export function verifyPlaybackTicket(
  ticket: string,
  episodeId: string,
): PlaybackTicketClaims | null {
  try {
    const d = jwt.verify(ticket, secret()) as jwt.JwtPayload;
    if (d.kind !== "playback") return null;
    if (d.episodeId !== episodeId) return null; // ticket is scoped to one episode
    return {
      episodeId: d.episodeId,
      userId: (d.userId as string | null) ?? null,
      adSupported: !!d.adSupported,
    };
  } catch {
    return null;
  }
}

/**
 * Build the URL the player fetches. In production this is a CloudFront signed
 * URL; for now we attach the ticket so the streaming endpoint can verify it.
 */
export function buildStreamUrl(episodeVideoKey: string, ticket: string): string {
  const base = process.env.CDN_BASE_URL ?? "https://cdn.vbox.example";
  return `${base}/${episodeVideoKey}/master.m3u8?ticket=${encodeURIComponent(ticket)}`;
}
