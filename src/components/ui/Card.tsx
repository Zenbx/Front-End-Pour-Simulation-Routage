import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    elevation?: 1 | 2;
}

export const Card = ({ className, elevation = 1, ...props }: CardProps) => {
    return (
        <div
            className={cn(
                'bg-white rounded-lg border border-outline',
                elevation === 1 ? 'elevation-1' : 'elevation-2',
                className
            )}
            {...props}
        />
    );
};

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('p-6 border-b border-outline', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn('text-xl font-semibold text-foreground', className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('p-6', className)} {...props} />
);
