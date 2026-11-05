import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

export const asset = (name: string) => `${import.meta.env.BASE_URL}figma-v2/${name}`;

export function HomeIndicator() {
  return (
    <div className="j-home" aria-hidden="true">
      <i />
    </div>
  );
}

export function IconButton({
  kind,
  label,
  onClick,
  glass = false,
}: {
  kind: 'back' | 'close' | 'replay';
  label: string;
  onClick: () => void;
  glass?: boolean;
}) {
  const icon = kind === 'back' ? 'back.svg' : 'close.svg';
  return (
    <button
      type="button"
      className={`j-icon${glass ? ' j-icon--glass' : ''}`}
      aria-label={label}
      onClick={onClick}
    >
      {kind === 'replay' ? (
        <RotateCcw size={24} aria-hidden="true" />
      ) : (
        <img src={asset(icon)} alt="" width={24} height={24} />
      )}
    </button>
  );
}

export function AppBar({
  title,
  back,
  close,
  review = false,
}: {
  title?: string;
  back?: () => void;
  close?: () => void;
  review?: boolean;
}) {
  return (
    <header className={review ? 'j-appbar j-appbar--review' : 'j-appbar'}>
      {back && <IconButton kind="back" label="이전 화면" onClick={back} />}
      <span>{title}</span>
      {close && <IconButton kind="close" label="닫기" onClick={close} />}
    </header>
  );
}

export function Action({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      className={`j-action${secondary ? ' j-action--secondary' : ''}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Chip({
  children,
  tone = 'pink',
}: {
  children: ReactNode;
  tone?: 'pink' | 'glass' | 'green' | 'neutral';
}) {
  return <span className={`j-chip j-chip--${tone}`}>{children}</span>;
}
