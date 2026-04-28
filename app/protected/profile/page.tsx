import { getMyProfile } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile-form";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";

async function ProfileContent() {
  const profile = await getMyProfile();

  return (
    <div className="flex flex-col gap-8">
      {/* 프로필 요약 헤더 */}
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name ?? "프로필 이미지"}
            className="w-16 h-16 rounded-full object-cover border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground">
            {(profile.display_name ?? profile.email)[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {profile.display_name ?? profile.email}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize">
              {profile.role}
            </Badge>
            {!profile.is_public && <Badge variant="outline">비공개</Badge>}
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">참가한 이벤트</p>
          <p className="text-2xl font-bold">{profile.events_attended_count}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">개최한 이벤트</p>
          <p className="text-2xl font-bold">{profile.events_created_count}</p>
        </div>
      </div>

      {/* 편집 폼 */}
      <ProfileForm profile={profile} />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground">불러오는 중...</div>}
    >
      <ProfileContent />
    </Suspense>
  );
}
