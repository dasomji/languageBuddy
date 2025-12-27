import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { getReadPresignedUrl } from "~/lib/server/storage";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return new NextResponse("Key is required", { status: 400 });
  }

  try {
    const url = await getReadPresignedUrl(key);
    
    // If the request prefers a redirect (e.g. for <audio> or <img> tags), redirect to the presigned URL
    const redirect = searchParams.get("redirect") === "true";
    if (redirect) {
      return NextResponse.redirect(url);
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new NextResponse("Failed to generate URL", { status: 500 });
  }
}

