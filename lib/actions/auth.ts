"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Google OAuth 로그인 서버 액션
// 클라이언트에서 throw 없이 redirect()로만 종료됨
export async function signInWithGoogle(): Promise<never> {
  const headersList = await headers();

  // 요청 헤더에서 origin 동적 생성 (로컬/프로덕션 환경 모두 대응)
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  // error가 있거나 리다이렉트 URL이 없는 경우 에러 페이지로 이동
  if (error || !data.url) {
    const message = error?.message ?? "OAuth URL을 생성하지 못했습니다";
    redirect(`/auth/error?error=${encodeURIComponent(message)}`);
  }

  // Google 인증 페이지로 리다이렉트
  redirect(data.url);
}
