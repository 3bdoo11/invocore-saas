import React, { Component, ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

interface SafeQRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
}

interface SafeQRCodeState {
  hasError: boolean;
}

class QRCodeErrorBoundary extends Component<{ children: ReactNode; size: number }, SafeQRCodeState> {
  state: SafeQRCodeState = { hasError: false };

  static getDerivedStateFromError(): SafeQRCodeState {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.warn('QRCode generation fallback triggered:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ width: this.props.size, height: this.props.size }}
          className="bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 p-1 text-[9px] text-center"
        >
          <QrCode className="w-5 h-5 text-slate-400 mb-0.5" />
          <span>رمز QR</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SafeQRCode: React.FC<SafeQRCodeProps> = ({
  value,
  size = 80,
  level = 'L',
  includeMargin = false,
  className,
}) => {
  // If value is excessively long for standard QR code capacity (> 2500 chars),
  // truncate or show fallback rather than throwing uncaught exception
  const safeValue = typeof value === 'string' && value.length > 2500 ? value.slice(0, 2048) : value;

  return (
    <QRCodeErrorBoundary size={size}>
      <QRCodeSVG
        value={safeValue}
        size={size}
        level={level}
        includeMargin={includeMargin}
        className={className}
      />
    </QRCodeErrorBoundary>
  );
};
