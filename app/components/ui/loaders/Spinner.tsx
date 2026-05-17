import { twMerge as tw } from "tailwind-merge";
import { SpinnerIcon } from "../../icons/react-icons";

interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className }: SpinnerProps) {
  return (
    <SpinnerIcon
      className={tw("text-2xl animate-spin transition-all", className)}
    />
  );
}
