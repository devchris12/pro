import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("[v0] Missing Google OAuth credentials");
      return NextResponse.json(
        { error: "Google OAuth is not configured" },
        { status: 500 }
      );
    }

    // Generate authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      access_type: "offline",
      prompt: "consent",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ redirect_url: authUrl });
  } catch (error) {
    console.error("[v0] Google login error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google login" },
      { status: 500 }
    );
  }
}
