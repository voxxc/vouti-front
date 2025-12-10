import { useTenant } from '@/contexts/TenantContext';
import LogoVouti from './LogoVouti';
import LogoSolvenza from './LogoSolvenza';

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: 'vouti' | 'solvenza' | 'auto';
}

const Logo = ({ className = "", size = "md", variant = "auto" }: LogoProps) => {
  // Try to get tenant from context (may fail if outside TenantProvider)
  let tenantSlug: string | null = null;
  try {
    const tenantContext = useTenant();
    tenantSlug = tenantContext?.tenant?.slug || null;
  } catch {
    // Outside TenantProvider, use default
  }

  // Determine which logo to use
  const effectiveVariant = variant === 'auto' 
    ? (tenantSlug === 'solvenza' ? 'solvenza' : 'vouti')
    : variant;

  if (effectiveVariant === 'solvenza') {
    return <LogoSolvenza className={className} size={size} />;
  }
  
  return <LogoVouti className={className} size={size} />;
};

export default Logo;
