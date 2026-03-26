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

  if (profile.bg_image_url) {
    const colorBg = bg2
      ? `linear-gradient(${dir}, ${bg1}, ${bg2})`
      : bg1;
    return {
      background: colorBg,
      backgroundImage: `url(${profile.bg_image_url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }

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

const FONT_SIZE_MAP: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

export function getUsernameStyle(profile: LinkProfile): { color: string; className: string } {
  const color = profile.username_color || profile.button_text_color || "#1e293b";
  const className = FONT_SIZE_MAP[profile.username_font_size || "xl"] || "text-xl";
  return { color, className };
}
