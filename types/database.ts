export type ProfileRole = "attendee" | "organizer" | "admin";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: ProfileRole;
  is_public: boolean;
  events_created_count: number;
  events_attended_count: number;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Pick<
  Profile,
  "display_name" | "bio" | "avatar_url" | "phone" | "is_public"
>;

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
