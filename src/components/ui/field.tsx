import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Field 系統 · shadcn 推薦的表單 layout primitive。
 *   <FieldGroup>
 *     <Field>
 *       <FieldLabel>...</FieldLabel>
 *       <Input />
 *       <FieldDescription>...</FieldDescription>
 *     </Field>
 *   </FieldGroup>
 */

const fieldVariants = cva('group/field flex w-full gap-3 data-[invalid=true]:text-destructive', {
  variants: {
    orientation: {
      vertical: 'flex-col [&>[data-slot=label]]:font-medium',
      horizontal: 'flex-row items-center [&>[data-slot=label]]:flex-none',
      responsive:
        'flex-col @md:flex-row @md:items-center [&>[data-slot=label]]:font-medium @md:[&>[data-slot=label]]:flex-none',
    },
  },
  defaultVariants: { orientation: 'vertical' },
});

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      role="group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
        className
      )}
      {...props}
    />
  );
}

function Field({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation || 'vertical'}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border has-[>[data-slot=field]]:p-4 has-[>[data-slot=field]]:has-data-[state=checked]:border-primary has-[>[data-slot=field]]:has-data-[state=checked]:bg-primary/5',
        className
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'text-foreground mb-3 font-medium',
        'data-[variant=legend]:text-base',
        'data-[variant=label]:text-sm',
        className
      )}
      {...props}
    />
  );
}

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'flex flex-col gap-6',
        'has-[>[data-slot=field-group]]:gap-4',
        className
      )}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
        'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className
      )}
      {...props}
    />
  );
}

function FieldError({
  className,
  errors,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = React.useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors) {
      return null;
    }

    if (errors?.length === 1 && errors[0]?.message) {
      return errors[0].message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-destructive text-sm font-normal', className)}
      {...props}
    >
      {content}
    </div>
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'relative -my-2 h-5 text-sm group-data-[disabled=true]/field:opacity-50',
        className
      )}
      {...props}
    >
      <span
        data-slot="field-separator-content"
        className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
      >
        {children}
      </span>
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldSeparator,
};
