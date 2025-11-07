import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Warning, ArrowClockwise } from '@phosphor-icons/react';
import { getApiErrorMessage } from '@/lib/api';

interface ErrorDisplayProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  title = 'Error',
  onRetry,
  className 
}: ErrorDisplayProps) {
  const message = getApiErrorMessage(error);

  return (
    <Alert variant="destructive" className={className}>
      <Warning className="h-4 w-4" weight="fill" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit"
          >
            <ArrowClockwise className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface ErrorFallbackProps {
  error: unknown;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorFallback({ error, onRetry, fullScreen = false }: ErrorFallbackProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full">
          <ErrorDisplay error={error} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <ErrorDisplay error={error} onRetry={onRetry} />
    </div>
  );
}
