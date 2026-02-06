import React from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// PIXEL ART RPG MEDIEVAL - NANO BANANA PRO DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════

export const PIXEL_FONT = "'Press Start 2P', monospace";

// Color palette - Medieval RPG
export const COLORS = {
  // Backgrounds
  panelDark: "#0c0c1d",
  panelMid: "#151530",
  panelLight: "#1e1e3a",
  
  // Borders
  gold: "#d4a017",
  goldLight: "#f5c842",
  goldDark: "#8b6914",
  
  // Bars
  hpGreen: "#22c55e",
  hpYellow: "#eab308",
  hpRed: "#ef4444",
  mpBlue: "#3b82f6",
  xpGold: "#f59e0b",
  
  // Text
  textWhite: "#e8e0d0",
  textGold: "#f5c842",
  textGray: "#6b7280",
  textRed: "#ef4444",
  textGreen: "#22c55e",
  textBlue: "#60a5fa",
  textPurple: "#c084fc",
  
  // Buttons
  btnAttack: "#8b1a1a",
  btnAttackBorder: "#d4a017",
  btnMagic: "#3d1a6e",
  btnMagicBorder: "#9b59b6",
  btnSkill: "#6b3a00",
  btnSkillBorder: "#d4a017",
  btnFlee: "#1a3a6b",
  btnFleeBorder: "#4a90c2",
  btnDefault: "#2a2a4a",
  btnDefaultBorder: "#6b7280",
  
  // Rarity
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

// ═══════════════════════════════════════════════════════════
// PIXEL FRAME - Main container with ornate medieval border
// ═══════════════════════════════════════════════════════════

export function PixelFrame({ 
  children, 
  className, 
  borderColor = COLORS.gold,
  bgColor = COLORS.panelDark,
  ornate = false,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
  bgColor?: string;
  ornate?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        background: bgColor,
        border: `3px solid ${borderColor}`,
        boxShadow: `
          inset 0 0 0 1px ${bgColor},
          inset 0 0 0 2px ${borderColor}30,
          4px 4px 0 0 rgba(0,0,0,0.5),
          0 0 0 1px rgba(0,0,0,0.4)
          ${glow ? `, 0 0 12px ${borderColor}40` : ''}
        `,
        imageRendering: 'pixelated' as const,
      }}
    >
      {/* Corner ornaments for ornate frames */}
      {ornate && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3" style={{ background: borderColor, boxShadow: `1px 1px 0 ${bgColor}` }} />
          <div className="absolute -top-1 -right-1 w-3 h-3" style={{ background: borderColor, boxShadow: `-1px 1px 0 ${bgColor}` }} />
          <div className="absolute -bottom-1 -left-1 w-3 h-3" style={{ background: borderColor, boxShadow: `1px -1px 0 ${bgColor}` }} />
          <div className="absolute -bottom-1 -right-1 w-3 h-3" style={{ background: borderColor, boxShadow: `-1px -1px 0 ${bgColor}` }} />
        </>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL BAR - HP/MP/XP bar with segmented fill
// ═══════════════════════════════════════════════════════════

export function PixelBar({
  current,
  max,
  color = COLORS.hpGreen,
  label,
  labelColor,
  showValue = true,
  height = 12,
  segments = 16,
  className,
}: {
  current: number;
  max: number;
  color?: string;
  label?: string;
  labelColor?: string;
  showValue?: boolean;
  height?: number;
  segments?: number;
  className?: string;
}) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const filledSegments = Math.ceil((percentage / 100) * segments);
  const autoColor = percentage > 50 ? COLORS.hpGreen : percentage > 20 ? COLORS.hpYellow : COLORS.hpRed;
  const barColor = color === COLORS.hpGreen ? autoColor : color;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {label && (
        <span style={{ 
          fontFamily: PIXEL_FONT, 
          fontSize: '7px', 
          color: labelColor || barColor,
          textShadow: '1px 1px 0 #000',
          minWidth: '16px',
        }}>
          {label}
        </span>
      )}
      <div 
        className="flex-1 flex gap-px p-px"
        style={{ 
          height: `${height}px`,
          background: '#0a0a0a',
          border: '2px solid #333',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
          imageRendering: 'pixelated' as const,
        }}
      >
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              background: i < filledSegments ? barColor : '#111',
              boxShadow: i < filledSegments 
                ? `inset 0 -1px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)` 
                : 'none',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      {showValue && (
        <span style={{ 
          fontFamily: PIXEL_FONT, 
          fontSize: '6px', 
          color: COLORS.textWhite,
          textShadow: '1px 1px 0 #000',
          minWidth: '40px',
          textAlign: 'right',
        }}>
          {current}/{max}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL BUTTON - Medieval RPG button with 3D press effect
// ═══════════════════════════════════════════════════════════

export function PixelBtn({
  children,
  onClick,
  disabled,
  variant = 'default',
  size = 'md',
  className,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'attack' | 'magic' | 'skill' | 'flee' | 'default' | 'close' | 'gold' | 'success' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
}) {
  const styles: Record<string, { bg: string; border: string; shadow: string; hover: string; text: string }> = {
    attack:  { bg: '#8b1a1a', border: '#d4a017', shadow: '#4a0e0e', hover: '#a52020', text: '#f5c842' },
    magic:   { bg: '#3d1a6e', border: '#9b59b6', shadow: '#2a0e4e', hover: '#5a2d8e', text: '#d4b0ff' },
    skill:   { bg: '#6b3a00', border: '#d4a017', shadow: '#3a2000', hover: '#8b4e10', text: '#f5c842' },
    flee:    { bg: '#1a3a6b', border: '#4a90c2', shadow: '#0e2040', hover: '#2a5090', text: '#87CEEB' },
    default: { bg: '#2a2a4a', border: '#6b7280', shadow: '#151530', hover: '#3a3a5a', text: '#e8e0d0' },
    close:   { bg: '#6b1a1a', border: '#ef4444', shadow: '#3a0e0e', hover: '#8b2020', text: '#fca5a5' },
    gold:    { bg: '#6b5000', border: '#d4a017', shadow: '#3a2a00', hover: '#8b6a10', text: '#f5c842' },
    success: { bg: '#1a5a2a', border: '#22c55e', shadow: '#0e3018', hover: '#2a7a3a', text: '#86efac' },
    danger:  { bg: '#6b1a1a', border: '#ef4444', shadow: '#3a0e0e', hover: '#8b2020', text: '#fca5a5' },
  };

  const sizeStyles = {
    xs: { px: 6, py: 2, font: '6px', shadow: 2 },
    sm: { px: 8, py: 4, font: '7px', shadow: 3 },
    md: { px: 12, py: 6, font: '8px', shadow: 4 },
    lg: { px: 16, py: 8, font: '10px', shadow: 5 },
  };

  const s = styles[variant];
  const sz = sizeStyles[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative uppercase tracking-wider transition-all duration-75",
        "active:translate-y-[2px] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:translate-y-0",
        fullWidth && "w-full",
        className,
      )}
      style={{
        fontFamily: PIXEL_FONT,
        fontSize: sz.font,
        color: s.text,
        background: s.bg,
        border: `2px solid ${s.border}`,
        padding: `${sz.py}px ${sz.px}px`,
        boxShadow: `
          0 ${sz.shadow}px 0 0 ${s.shadow},
          0 ${sz.shadow + 1}px 0 0 rgba(0,0,0,0.3),
          inset 0 1px 0 0 rgba(255,255,255,0.1),
          inset 0 -1px 0 0 rgba(0,0,0,0.2)
        `,
        imageRendering: 'pixelated' as const,
        textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = s.hover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = s.bg; }}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL TEXT - Styled text with pixel font
// ═══════════════════════════════════════════════════════════

export function PixelText({
  children,
  size = 'sm',
  color = COLORS.textWhite,
  className,
  glow,
  bold,
  as: Tag = 'span',
}: {
  children: React.ReactNode;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  color?: string;
  className?: string;
  glow?: boolean;
  bold?: boolean;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3';
}) {
  const sizes = { xxs: '5px', xs: '6px', sm: '7px', md: '8px', lg: '10px', xl: '12px', xxl: '16px' };

  return (
    <Tag
      className={className}
      style={{
        fontFamily: PIXEL_FONT,
        fontSize: sizes[size],
        color,
        textShadow: glow ? `0 0 6px ${color}80, 1px 1px 0 #000` : '1px 1px 0 rgba(0,0,0,0.5)',
        fontWeight: bold ? 'bold' : 'normal',
        lineHeight: '1.6',
        letterSpacing: '0.5px',
      }}
    >
      {children}
    </Tag>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL DIALOG BOX - RPG message box with typewriter cursor
// ═══════════════════════════════════════════════════════════

export function PixelDialogBox({
  message,
  isTyping,
  speaker,
  className,
}: {
  message: string;
  isTyping?: boolean;
  speaker?: string;
  className?: string;
}) {
  return (
    <PixelFrame borderColor={COLORS.gold} ornate className={cn("p-3", className)}>
      {speaker && (
        <PixelText size="xs" color={COLORS.textGold} className="mb-1 block">
          {speaker}:
        </PixelText>
      )}
      <PixelText size="sm" color={COLORS.textWhite} as="p">
        {message}
        {isTyping && (
          <span className="animate-pulse ml-1" style={{ color: COLORS.textGold }}>▼</span>
        )}
      </PixelText>
    </PixelFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL TITLE BAR - Section header with decorative line
// ═══════════════════════════════════════════════════════════

export function PixelTitleBar({
  title,
  onClose,
  color = COLORS.textGold,
  className,
}: {
  title: string;
  onClose?: () => void;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between pb-2 mb-2", className)}
      style={{ borderBottom: `2px solid ${COLORS.gold}40` }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2" style={{ background: color, boxShadow: `0 0 4px ${color}60` }} />
        <PixelText size="md" color={color} bold>{title}</PixelText>
        <div className="w-2 h-2" style={{ background: color, boxShadow: `0 0 4px ${color}60` }} />
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center transition-all hover:brightness-125"
          style={{
            background: '#6b1a1a',
            border: '2px solid #ef4444',
            fontFamily: PIXEL_FONT,
            fontSize: '8px',
            color: '#fff',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
          }}
        >
          X
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL ITEM SLOT - For inventory/equipment display
// ═══════════════════════════════════════════════════════════

export function PixelItemSlot({
  icon,
  name,
  subtitle,
  rarity = 'common',
  selected,
  onClick,
  className,
  children,
}: {
  icon?: string;
  name: string;
  subtitle?: string;
  rarity?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const rarityColor = COLORS[rarity as keyof typeof COLORS] || COLORS.common;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 p-2 w-full text-left transition-all",
        selected ? "brightness-125" : "hover:brightness-110",
        className,
      )}
      style={{
        background: selected ? `${rarityColor}15` : COLORS.panelMid,
        border: `2px solid ${selected ? rarityColor : '#333'}`,
        boxShadow: selected ? `0 0 8px ${rarityColor}30, inset 0 0 8px ${rarityColor}10` : '2px 2px 0 rgba(0,0,0,0.3)',
        imageRendering: 'pixelated' as const,
      }}
    >
      {icon && (
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
          style={{ 
            background: '#0a0a1a', 
            border: `1px solid ${rarityColor}60`,
            boxShadow: `inset 0 0 4px ${rarityColor}20`,
          }}
        >
          <img src={icon} alt={name} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <PixelText size="xs" color={rarityColor} className="block truncate">{name}</PixelText>
        {subtitle && <PixelText size="xxs" color={COLORS.textGray} className="block truncate">{subtitle}</PixelText>}
      </div>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL STAT ROW - For character sheet attributes
// ═══════════════════════════════════════════════════════════

export function PixelStatRow({
  label,
  value,
  modifier,
  color = COLORS.textWhite,
  onAllocate,
  canAllocate,
}: {
  label: string;
  value: number;
  modifier?: number;
  color?: string;
  onAllocate?: () => void;
  canAllocate?: boolean;
}) {
  const mod = modifier !== undefined ? modifier : Math.floor((value - 10) / 2);
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

  return (
    <div className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid #ffffff08' }}>
      <PixelText size="xs" color={COLORS.textGray} className="w-16">{label}</PixelText>
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 flex items-center justify-center"
          style={{ 
            background: COLORS.panelMid, 
            border: `2px solid ${color}60`,
            boxShadow: `inset 0 0 6px rgba(0,0,0,0.5)`,
          }}
        >
          <PixelText size="md" color={color} bold>{value}</PixelText>
        </div>
        <PixelText size="xs" color={mod >= 0 ? COLORS.textGreen : COLORS.textRed}>
          ({modStr})
        </PixelText>
      </div>
      {canAllocate && onAllocate && (
        <button
          onClick={onAllocate}
          className="ml-auto w-5 h-5 flex items-center justify-center transition-all hover:brightness-125"
          style={{
            background: '#1a5a2a',
            border: '1px solid #22c55e',
            fontFamily: PIXEL_FONT,
            fontSize: '8px',
            color: '#22c55e',
          }}
        >
          +
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL OVERLAY - Full screen overlay for menus
// ═══════════════════════════════════════════════════════════

export function PixelOverlay({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div 
      className={cn("fixed inset-0 flex items-center justify-center p-4", className)}
      style={{ 
        zIndex: 9998,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL SEPARATOR - Decorative line separator
// ═══════════════════════════════════════════════════════════

export function PixelSeparator({ color = COLORS.gold }: { color?: string }) {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px" style={{ background: `${color}40` }} />
      <div className="w-1.5 h-1.5" style={{ background: color, transform: 'rotate(45deg)' }} />
      <div className="flex-1 h-px" style={{ background: `${color}40` }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL TABS - Tab navigation with pixel art style
// ═══════════════════════════════════════════════════════════

export function PixelTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; icon?: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 mb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex-1 py-2 px-1 text-center transition-all"
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: '6px',
            color: activeTab === tab.id ? COLORS.textGold : COLORS.textGray,
            background: activeTab === tab.id ? COLORS.panelLight : COLORS.panelDark,
            border: `2px solid ${activeTab === tab.id ? COLORS.gold : '#333'}`,
            borderBottom: activeTab === tab.id ? `2px solid ${COLORS.panelLight}` : `2px solid ${COLORS.gold}40`,
            boxShadow: activeTab === tab.id ? `0 -2px 4px ${COLORS.gold}20` : 'none',
            textShadow: '1px 1px 0 #000',
          }}
        >
          {tab.icon && <span className="mr-1">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIXEL SCROLL AREA - Scrollable content with styled scrollbar
// ═══════════════════════════════════════════════════════════

export function PixelScrollArea({
  children,
  maxHeight = '300px',
  className,
}: {
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-y-auto", className)}
      style={{
        maxHeight,
        scrollbarWidth: 'thin',
        scrollbarColor: `${COLORS.gold}60 ${COLORS.panelDark}`,
      }}
    >
      {children}
    </div>
  );
}
