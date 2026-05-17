import { NextRequest, NextResponse } from "next/server";
import { setSessionToken } from "@/lib/auth/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("[v0] Google OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      console.error("[v0] No authorization code received");
      return NextResponse.redirect(
        new URL("/?auth_error=no_code", request.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[v0] Missing Google OAuth configuration");
      return NextResponse.redirect(
        new URL("/?auth_error=config_error", request.url)
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("[v0] Token exchange failed:", error);
      return NextResponse.redirect(
        new URL("/?auth_error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const idToken = tokens.id_token;

    if (!accessToken || !idToken) {
      console.error("[v0] Missing tokens in response");
      return NextResponse.redirect(
        new URL("/?auth_error=missing_tokens", request.url)
      );
    }

    // Get user info from Google
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userResponse.ok) {
      console.error("[v0] Failed to fetch user info");
      return NextResponse.redirect(
        new URL("/?auth_error=user_info_failed", request.url)
      );
    }

    const userInfo = await userResponse.json();

    // Store the ID token as session token
    // In a real app, you'd create/update a user record in your database
    await setSessionToken(idToken);

    // Redirect to dashboard or profile page
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("[v0] Callback error:", error);
    return NextResponse.redirect(
      new URL("/?auth_error=callback_error", request.url)
    );
  }
}
