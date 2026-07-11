declare module "sonner" {
  export const toast: {
    error: (msg: string) => void;
    success: (msg: string) => void;
  };
}
