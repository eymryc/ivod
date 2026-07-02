import type { Router } from "expo-router";

/** Parse `/path?a=1&b=2` vers href Expo Router (les query strings brutes ne marchent pas avec replace). */
export function parseExpoPath(path: string): {
  pathname: string;
  params: Record<string, string>;
} {
  const [rawPath, query = ""] = path.split("?");
  const params: Record<string, string> = {};
  if (query) {
    for (const segment of query.split("&")) {
      if (!segment) continue;
      const eq = segment.indexOf("=");
      const key = decodeURIComponent(eq >= 0 ? segment.slice(0, eq) : segment);
      const value = decodeURIComponent(eq >= 0 ? segment.slice(eq + 1) : "");
      if (key) params[key] = value;
    }
  }
  return { pathname: rawPath || "/", params };
}

export function navigateExpoPath(
  router: Router,
  path: string,
  method: "replace" | "push" = "replace",
): void {
  const { pathname, params } = parseExpoPath(path);
  const href = {
    pathname: pathname as never,
    ...(Object.keys(params).length > 0 ? { params } : {}),
  };
  if (method === "replace") router.replace(href);
  else router.push(href);
}
