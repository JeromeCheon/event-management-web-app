"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Profile, ProfileUpdate } from "@/types/database";

export async function getMyProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email: claimsData.claims.email ?? "",
        display_name: claimsData.claims.email?.split("@")[0] ?? null,
      })
      .select()
      .single();

    if (insertError || !newProfile) {
      throw new Error("프로필을 불러올 수 없습니다.");
    }

    return newProfile as Profile;
  }

  return data as Profile;
}

export async function getPublicProfile(
  userId: string,
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("is_public", true)
    .single();

  return (data as Profile) ?? null;
}

export async function updateProfile(
  _prevState: ActionResult<Profile>,
  formData: FormData,
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return { success: false, error: "인증이 필요합니다." };
  }

  const userId = claimsData.claims.sub;

  const update: ProfileUpdate = {
    display_name: (formData.get("display_name") as string) || null,
    bio: (formData.get("bio") as string) || null,
    avatar_url: (formData.get("avatar_url") as string) || null,
    phone: (formData.get("phone") as string) || null,
    is_public: formData.get("is_public") === "true",
  };

  if (update.display_name && update.display_name.length > 50) {
    return { success: false, error: "닉네임은 50자 이내로 입력해주세요." };
  }

  if (update.bio && update.bio.length > 500) {
    return { success: false, error: "소개는 500자 이내로 입력해주세요." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: "프로필 저장에 실패했습니다." };
  }

  return { success: true, data: data as Profile };
}
