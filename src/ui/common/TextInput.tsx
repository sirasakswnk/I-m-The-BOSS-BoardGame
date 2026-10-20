import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Room-code styling: larger mono digits with wide letter spacing. */
  code?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { code = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`text-input ${code ? 'text-input-code' : ''} ${className ?? ''}`}
      {...rest}
    />
  );
});
