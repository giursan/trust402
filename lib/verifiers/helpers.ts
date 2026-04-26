import type { VerifierContext } from "./types";

export function getPageTitle(ctx: VerifierContext): string {
  return ctx.pageTitle ?? ctx.page_title ?? "";
}

export function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}
