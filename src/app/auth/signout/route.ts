
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign-out failed:", error.message);

      return NextResponse.redirect(
        new URL("/app?error=signout", request.url),
        { status: 303 }
      );
    }

    return NextResponse.redirect(new URL("/login", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Unexpected sign-out error:", error);

    return NextResponse.redirect(
      new URL("/app?error=signout", request.url),
      { status: 303 }
    );
  }
}
