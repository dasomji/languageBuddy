import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export const TARGET_URL_HEADER = "x-fal-target-url";
const FAL_URL_REG_EXP = /(\.|^)fal\.(run|ai|dev)$/;
const EXCLUDED_HEADERS = ["content-length", "content-encoding"];

/**
 * A request handler that proxies the request to the fal API
 * endpoint. This is useful so client-side calls to the fal endpoint
 * can be made without CORS issues and the correct credentials can be added
 * effortlessly.
 */
async function handleRequest(request: NextRequest) {
  const targetUrl = request.headers.get(TARGET_URL_HEADER);
  if (!targetUrl) {
    return NextResponse.json(
      { error: `Missing the ${TARGET_URL_HEADER} header` },
      { status: 400 },
    );
  }

  let urlHost: string;
  try {
    urlHost = new URL(targetUrl).host;
  } catch (e) {
    return NextResponse.json({ error: "Invalid target URL" }, { status: 400 });
  }

  if (!FAL_URL_REG_EXP.test(urlHost)) {
    return NextResponse.json(
      { error: `Invalid ${TARGET_URL_HEADER} header` },
      { status: 412 },
    );
  }

  const falKey = env.FAL_AI_API_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: "Missing fal.ai credentials" },
      { status: 401 },
    );
  }

  // pass over headers prefixed with x-fal-*
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-fal-")) {
      headers[key.toLowerCase()] = value;
    }
  });

  const proxyUserAgent = `@fal-ai/server-proxy/nextjs`;
  const userAgent = request.headers.get("user-agent") ?? "";
  
  const body = request.method.toUpperCase() === "GET" 
    ? undefined 
    : await request.text();

  const res = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...headers,
      authorization: request.headers.get("authorization") ?? `Key ${falKey}`,
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": userAgent,
      "x-fal-client-proxy": proxyUserAgent,
    } as HeadersInit,
    body,
  });

  // Copy headers from fal to the proxied response
  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

