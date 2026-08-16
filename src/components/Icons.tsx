// Lucide 官方图标 (https://lucide.dev)
import React from 'react'

type P = { size?: number; color?: string; className?: string; strokeWidth?: number; fill?: string; stroke?: string }
const I: React.FC<React.PropsWithChildren<P>> = ({ children, size = 16, color = 'currentColor', strokeWidth = 2, fill, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? 'none'} stroke={stroke ?? color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

// 交通灯内部图标 (macOS 风格, 12x12 viewBox, 单色填充)
type TLP = { size?: number; color?: string }
const TL: React.FC<React.PropsWithChildren<TLP>> = ({ children, size = 8, color }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill={color} aria-hidden>
    {children}
  </svg>
)

export const TLCloseIcon = ({ size, color = '#4d0000' }: TLP) => (
  <TL size={size} color={color}>
    <path d="M10 3.4 8.6 2 6 4.6 3.4 2 2 3.4 4.6 6 2 8.6 3.4 10 6 7.4 8.6 10 10 8.6 7.4 6z" />
  </TL>
)
export const TLMinimizeIcon = ({ size, color = '#5a3500' }: TLP) => (
  <TL size={size} color={color}>
    <path d="M10 7H2V5h8z" />
  </TL>
)
export const TLMaximizeIcon = ({ size, color = '#004208' }: TLP) => (
  <TL size={size} color={color}>
    <path d="M4 2 L10 2 L10 8 Z" />
    <path d="M2 4 L2 10 L8 10 Z" />
  </TL>
)
export const TLRestoreIcon = ({ size, color = '#004208' }: TLP) => (
  <TL size={size} color={color}>
    <path d="M4 2 L10 2 L10 8 Z" />
    <path d="M2 4 L2 10 L8 10 Z" />
  </TL>
)

// 工具栏图标
export const NewFileIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5a9cf0'}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M9 15h6" />
    <path d="M12 12v6" />
  </I>
)
export const OpenIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#f0b840'}>
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.2 10H20a2 2 0 0 1 1.9 2.6l-1.5 5a2 2 0 0 1-1.9 1.4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.7.9L12 6h6a2 2 0 0 1 2 2v2" />
  </I>
)
export const ExportIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#e86868'}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </I>
)
export const BeautifyIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5fd478'}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </I>
)
export const CompressIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#f0b840'}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" x2="21" y1="10" y2="3" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </I>
)
export const EscapeIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#b578f0'}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </I>
)
export const UnescapeIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5a9cf0'}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </I>
)
export const FoldIcon = ({ size, color }: P) => (
  // chevrons-down-up (收起)
  <I size={size} color={color || '#e86868'}>
    <path d="m7 20 5-5 5 5" />
    <path d="m7 4 5 5 5-5" />
  </I>
)
export const UnfoldIcon = ({ size, color }: P) => (
  // chevrons-up-down (展开)
  <I size={size} color={color || '#5fd478'}>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </I>
)
export const DiffIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5fd478'}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M12 3v18" />
  </I>
)
export const ConvertIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5a9cf0'}>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </I>
)
export const CodeIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#b578f0'}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </I>
)
export const SchemaIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#f0b840'}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </I>
)

// 工具模式顶栏图标
export const BackIcon = ({ size = 24, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="m15 18-6-6 6-6" /></I>
)
export const CopyIcon = ({ size = 16, color = '#8b92a1' }: P) => (
  <I size={size} color={color} strokeWidth={1.8}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </I>
)
export const ThemeIcon = ({ size = 16, color = '#f0b840' }: P) => (
  <I size={size} color={color} strokeWidth={1.8}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </I>
)
export const SettingsIcon = ({ size = 16, color = '#8b92a1' }: P) => (
  <I size={size} color={color} strokeWidth={1.8}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </I>
)
export const PinIcon = ({ size = 15, color = '#f48771' }: P) => (
  <I size={size} color={color}>
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </I>
)
export const PinOffIcon = ({ size = 15, color = '#f48771' }: P) => (
  <I size={size} color={color}>
    <path d="M12 17v5" />
    <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
    <path d="m2 2 20 20" />
    <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
  </I>
)
export const TreeIcon = ({ size = 16, color = '#5fd478', strokeWidth = 2 }: P) => (
  <I size={size} color={color} strokeWidth={strokeWidth}>
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </I>
)

// 树形视图 / 通用图标
export const SearchIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></I>
)
export const CloseIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></I>
)
export const MoreIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}>
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </I>
)
export const InfoIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </I>
)
export const ChevronDown = ({ size = 12, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="m6 9 6 6 6-6" /></I>
)
export const CheckIcon = ({ size = 13, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="M20 6 9 17l-5-5" /></I>
)
export const ArrowRight = ({ size = 16, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </I>
)
export const ArrowsLeftRight = ({ size = 18, color = 'currentColor', strokeWidth = 2 }: P) => (
  <I size={size} color={color} strokeWidth={strokeWidth}>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </I>
)
export const WandIcon = ({ size = 13, color = 'currentColor' }: P) => (
  <I size={size} color={color}>
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h.01" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </I>
)
export const ShieldCheckIcon = ({ size = 13, color = 'currentColor' }: P) => (
  <I size={size} color={color}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </I>
)
export const ChevronsUpDown = ({ size = 14, color = '#5a6170', strokeWidth = 2 }: P) => (
  // chevrons-up-down (展开)
  <I size={size} color={color} strokeWidth={strokeWidth}>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </I>
)
export const ChevronsDownUp = ({ size = 14, color = '#5a6170', strokeWidth = 2 }: P) => (
  // chevrons-down-up (收起)
  <I size={size} color={color} strokeWidth={strokeWidth}>
    <path d="m7 20 5-5 5 5" />
    <path d="m7 4 5 5 5-5" />
  </I>
)
export const ExternalLinkIcon = ({ size = 13, color = '#5fd478' }: P) => (
  <I size={size} color={color}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </I>
)
