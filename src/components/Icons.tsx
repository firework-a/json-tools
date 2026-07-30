// Lucide 风格图标
import React from 'react'

type P = { size?: number; color?: string; className?: string; strokeWidth?: number; fill?: string }
const I: React.FC<React.PropsWithChildren<P>> = ({ children, size = 16, color = 'currentColor', strokeWidth = 2, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? 'none'} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const NewFileIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5a9cf0'}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M12 12v6"/></I>
)
export const OpenIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#f0b840'}><path d="M6 14l1.5-2.9A2 2 0 0 1 9.2 10H20a2 2 0 0 1 1.9 2.6l-1.5 5A2 2 0 0 1 18.5 19H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.7.9L12 6h6a2 2 0 0 1 2 2v2"/></I>
)
export const ExportIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#e86868'}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></I>
)
export const BeautifyIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5fd478'}><path d="m8 3-3 9 3 9M16 3l3 9-3 9"/></I>
)
export const CompressIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#f0b840'}><path d="M3 6h18M3 12h18M3 18h12"/></I>
)
export const EscapeIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#b578f0'}><path d="M8 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="m15 10 5 5-5 5"/><path d="M20 15H9"/></I>
)
export const UnescapeIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5a9cf0'}><path d="M16 5h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3"/><path d="m9 10-5 5 5 5"/><path d="M4 15h11"/></I>
)
export const FoldIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#e86868'} strokeWidth={2.2}><path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/></I>
)
export const UnfoldIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5fd478'} strokeWidth={2.2}><path d="m7 6 5 5 5-5"/><path d="m7 13 5 5 5-5"/></I>
)
export const DiffIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5fd478'}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/></I>
)
export const ConvertIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#5a9cf0'}><path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></I>
)
export const CodeIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#b578f0'}><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></I>
)
export const SchemaIcon = ({ size, color }: P) => (
  <I size={size} color={color || '#f0b840'} strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></I>
)

export const BackIcon = ({ size = 24, color = '#fff' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="m15 18-6-6 6-6"/></I>
)
// 复制：两个叠层方块（截图右上角）
export const CopyIcon = ({ size = 16, color = '#8b92a1' }: P) => (
  <I size={size} color={color} strokeWidth={1.8}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></I>
)
export const ThemeIcon = ({ size = 16, color = '#f0b840' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><circle cx="12" cy="12" r="4"/><g stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg>
)
export const SettingsIcon = ({ size = 16, color = '#8b92a1' }: P) => (
  <I size={size} color={color} strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></I>
)
export const PinIcon = ({ size = 15, color = '#f48771' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
)
export const TreeIcon = ({ size = 16, color = '#5fd478', strokeWidth = 2 }: P) => (
  <I size={size} color={color} strokeWidth={strokeWidth}>
    <circle cx="6" cy="6" r="1.8" fill={color} stroke="none" />
    <circle cx="18" cy="6" r="1.8" fill={color} stroke="none" />
    <circle cx="12" cy="18" r="1.8" fill={color} stroke="none" />
    <path d="M12 18V12M6 6v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M12 12v-2" />
  </I>
)
export const SearchIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color} strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></I>
)
export const CloseIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color} strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></I>
)
export const MoreIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></I>
)
export const InfoIcon = ({ size = 14, color = '#5a6170' }: P) => (
  <I size={size} color={color} strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></I>
)
export const ChevronDown = ({ size = 12, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="m6 9 6 6 6-6"/></I>
)
export const CheckIcon = ({ size = 13, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="M20 6 9 17l-5-5"/></I>
)
export const ArrowRight = ({ size = 16, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></I>
)
// 双向箭头（中央按钮）
export const ArrowsLeftRight = ({ size = 18, color = 'currentColor', strokeWidth = 2.2 }: P) => (
  <I size={size} color={color} strokeWidth={strokeWidth}><path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></I>
)
// 魔法棒（Schema 生成按钮图标）
export const WandIcon = ({ size = 13, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2}><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></I>
)
// 盾牌校验
export const ShieldCheckIcon = ({ size = 13, color = 'currentColor' }: P) => (
  <I size={size} color={color} strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></I>
)
// 全部展开/收起（树形视图）
export const ChevronsUpDown = ({ size = 14, color = '#5a6170', strokeWidth = 2 }: P) => (
  <I size={size} color={color} strokeWidth={strokeWidth}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></I>
)
// 外部链接
export const ExternalLinkIcon = ({ size = 13, color = '#5fd478' }: P) => (
  <I size={size} color={color} strokeWidth={2}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></I>
)
