import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
        },
        classNames: {
          success: 'bg-success text-white',
          error: 'bg-danger text-white',
        },
      }}
    />
  );
}

export const toast = {
  success: (message: string) =>
    sonnerToast.success(message, { duration: 3000 }),
  error: (message: string) =>
    sonnerToast.error(message, { duration: Infinity }),
};
