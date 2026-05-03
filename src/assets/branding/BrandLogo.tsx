import * as React from 'react';
import logoFull from '../../assets/branding/logo-full-preto.png';

type BrandLogoVariant = 'icon' | 'full';
interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  imgClassName?: string;
  showText?: boolean;
}

export const BrandLogo = ({
  variant = 'full',
  className = '',
  imgClassName = '',
}: BrandLogoProps) => {
  if (variant === 'icon') {
    return (
      <div className={className}>
        <img
          src="/logo-icon.png"
          alt="PostHub"
          className={imgClassName || 'h-10 w-10 object-contain'}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={logoFull}
        alt="PostHub"
        className={imgClassName || 'h-10 w-auto object-contain'}
      />
    </div>
  );
};
