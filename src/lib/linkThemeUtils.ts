import { LinkProfile } from "@/types/link";

const DIRECTION_MAP: Record<string, string> = {
  "to-b": "to bottom",
  "to-t": "to top",
  "to-r": "to right",
  "to-l": "to left",
};

export function getProfileBackground(profile: LinkProfile): React.CSSProperties {
  const bg1 = profile.bg_color_1 || "#FFFFFF";
  const bg2 = profile.bg_color_2;
  const dir = DIRECTION_MAP[profile.bg_gradient_direction || "to-b"] || "to bottom";

  if (bg2) {
    return { background: `linear-gradient(${dir}, ${bg1}, ${bg2})` };
  }
  return { backgroundColor: bg1 };
}

export function getButtonStyle(profile: LinkProfile): React.CSSProperties {
  return {
    backgroundColor: profile.button_color || "#1e293b",
    color: profile.button_text_color || "#ffffff",
  };
}
