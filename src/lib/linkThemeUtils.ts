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

const RADIUS_MAP: Record<string, string> = {
  none: "0px",
  md: "8px",
  xl: "16px",
  full: "9999px",
};

const PADDING_MAP: Record<string, string> = {
  compact: "8px 20px",
  normal: "16px 20px",
  spacious: "24px 20px",
};

const SPACING_MAP: Record<string, string> = {
  tight: "4px",
  normal: "12px",
  spacious: "20px",
};

export function getButtonStyle(profile: LinkProfile): React.CSSProperties {
  const bgColor = profile.button_color || "#1e293b";
  const textColor = profile.button_text_color || "#ffffff";
  const style = profile.button_style || "filled";
  const radius = RADIUS_MAP[profile.button_radius || "xl"] || "16px";
  const padding = PADDING_MAP[profile.button_padding || "normal"] || "16px 20px";

  const base: React.CSSProperties = {
    borderRadius: radius,
    padding,
    color: textColor,
  };

  switch (style) {
    case "outline":
      return {
        ...base,
        backgroundColor: "transparent",
        border: `2px solid ${profile.button_border_color || bgColor}`,
        color: profile.button_border_color || bgColor,
      };
    case "soft":
      return {
        ...base,
        backgroundColor: `${bgColor}22`,
        color: bgColor,
      };
    case "shadow":
      return {
        ...base,
        backgroundColor: bgColor,
        boxShadow: `0 8px 24px -4px ${bgColor}66`,
      };
    case "filled":
    default:
      return {
        ...base,
        backgroundColor: bgColor,
      };
  }
}

export function getButtonSpacing(profile: LinkProfile): string {
  return SPACING_MAP[profile.button_spacing || "normal"] || "12px";
}

export function getSubButtonStyle(profile: LinkProfile): React.CSSProperties {
  // Use dedicated sub-button fields, falling back to parent button values
  const bgColor = profile.sub_button_color || profile.button_color || "#1e293b";
  const textColor = profile.sub_button_text_color || profile.button_text_color || "#ffffff";
  const style = profile.sub_button_style || "soft";
  const radius = RADIUS_MAP[profile.sub_button_radius || "xl"] || "16px";
  const padding = PADDING_MAP[profile.sub_button_padding || "compact"] || "8px 20px";

  const base: React.CSSProperties = {
    borderRadius: radius,
    padding,
    color: textColor,
    fontSize: "0.875rem",
  };

  switch (style) {
    case "outline":
      return {
        ...base,
        backgroundColor: "transparent",
        border: `2px solid ${bgColor}`,
        color: bgColor,
      };
    case "soft":
      return {
        ...base,
        backgroundColor: `${bgColor}22`,
        color: bgColor,
      };
    case "shadow":
      return {
        ...base,
        backgroundColor: bgColor,
        boxShadow: `0 6px 16px -4px ${bgColor}55`,
      };
    case "filled":
    default:
      return {
        ...base,
        backgroundColor: bgColor,
      };
  }
}

const VERTICAL_POSITION_MAP: Record<string, string> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

export function getContentAlignment(profile: LinkProfile): string {
  return VERTICAL_POSITION_MAP[profile.content_vertical_position || "top"] || "flex-start";
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
