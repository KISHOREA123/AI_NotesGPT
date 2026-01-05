import { FileText } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
        <div className={`relative ${sizeClasses[size]} rounded-xl bg-gradient-to-br from-primary to-amber-400 flex items-center justify-center`}>
          <FileText className="h-1/2 w-1/2 text-primary-foreground" />
        </div>
      </div>
      {showText && (
        <span className={`font-semibold ${textClasses[size]}`}>
          <span className="text-foreground">AI</span>
          <span className="gradient-text"> Notes</span>
        </span>
      )}
    </div>
  );
}
