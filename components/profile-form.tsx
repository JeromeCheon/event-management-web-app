"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/lib/actions/profile";
import type { ActionResult, Profile } from "@/types/database";

interface ProfileFormProps {
  profile: Profile;
}

const initialState: ActionResult<Profile> = {
  success: true,
  data: {} as Profile,
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">프로필 편집</CardTitle>
        <CardDescription>
          다른 사용자에게 표시될 정보를 입력하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <div className="flex flex-col gap-6">
            {/* 이메일: 읽기 전용 */}
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">
                이메일은 변경할 수 없습니다.
              </p>
            </div>

            {/* 닉네임 */}
            <div className="grid gap-2">
              <Label htmlFor="display_name">닉네임</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={profile.display_name ?? ""}
                placeholder="표시될 이름을 입력하세요"
                maxLength={50}
              />
            </div>

            {/* 소개 */}
            <div className="grid gap-2">
              <Label htmlFor="bio">소개</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio ?? ""}
                placeholder="자신을 소개해주세요 (최대 500자)"
                maxLength={500}
                rows={4}
              />
            </div>

            {/* 전화번호 */}
            <div className="grid gap-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="010-0000-0000"
              />
            </div>

            {/* 아바타 URL */}
            <div className="grid gap-2">
              <Label htmlFor="avatar_url">프로필 이미지 URL</Label>
              <Input
                id="avatar_url"
                name="avatar_url"
                type="url"
                defaultValue={profile.avatar_url ?? ""}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* 공개 여부 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                name="is_public"
                value="true"
                defaultChecked={profile.is_public}
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="is_public" className="cursor-pointer font-normal">
                프로필 공개
              </Label>
            </div>

            {/* 역할 뱃지 (읽기 전용) */}
            <div className="grid gap-2">
              <Label>역할</Label>
              <p className="text-sm capitalize text-muted-foreground">
                {profile.role}
              </p>
            </div>

            {/* 에러/성공 메시지 */}
            {state && !state.success && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}
            {state?.success && state.data?.id && (
              <p className="text-sm text-green-600">프로필이 저장되었습니다.</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "저장 중..." : "프로필 저장"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
