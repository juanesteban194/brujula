import { config } from "./config";

/** Returns true when the request carries a valid `Authorization: Bearer <token>`. */
export function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === config.adminToken;
}
