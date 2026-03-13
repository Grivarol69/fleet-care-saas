import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SiigoSyncStatus } from '@prisma/client';
import { Clock, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export interface SiigoSyncStatusBadgeProps {
    status: SiigoSyncStatus | null;
    siigoId?: string | null;
    error?: string | null;
    showTooltip?: boolean;
}

export function SiigoSyncStatusBadge({ status, siigoId, error, showTooltip = true }: SiigoSyncStatusBadgeProps) {
    if (status === null) {
        return null;
    }

    const getStatusConfig = () => {
        switch (status) {
            case 'PENDING':
                return { variant: 'default' as const, className: 'bg-yellow-500 hover:bg-yellow-600', label: 'Pendiente sync', icon: Clock };
            case 'SYNCING':
                return { variant: 'default' as const, className: 'bg-yellow-500 hover:bg-yellow-600', label: 'Sincronizando...', icon: Loader2, animate: true };
            case 'SYNCED':
                return { variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700', label: 'En Siigo', icon: CheckCircle2 };
            case 'FAILED':
                return { variant: 'destructive' as const, className: '', label: 'Error Siigo', icon: XCircle };
            case 'SKIPPED':
                return { variant: 'secondary' as const, className: '', label: 'Sin datos DIAN', icon: AlertCircle };
            default:
                return { variant: 'secondary' as const, className: '', label: 'Desconocido', icon: AlertCircle };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    const BadgeContent = (
        <div className="flex items-center gap-2">
            <Badge variant={config.variant} className={`flex items-center gap-1 w-max ${config.className || ''}`}>
                <Icon className={`w-3 h-3 ${'animate' in config && config.animate ? 'animate-spin' : ''}`} />
                {config.label}
            </Badge>
            {status === 'SYNCED' && siigoId && (
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={siigoId}>
                    {siigoId}
                </span>
            )}
        </div>
    );

    if (showTooltip && status === 'FAILED' && error) {
        return (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="cursor-help w-max">{BadgeContent}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs break-words border-destructive bg-destructive/10 text-destructive-foreground">
                        <p className="text-sm font-semibold mb-1">Error de Sincronización</p>
                        <p className="text-xs">{error}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return BadgeContent;
}
