import React from "react";
import clsx from "clsx";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "muted" | "ghost";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Button: React.FC<ButtonProps> = ({
  className,
  children,
  variant = "primary",
  loading,
  leftIcon,
  rightIcon,
  ...rest
}) => {
  const base = "btn";
  const variants = {
    primary: "btn-primary",
    muted: "btn-muted",
    ghost: "bg-transparent hover:bg-muted text-black",
  } as const;
  return (
    <button
      className={clsx(base, variants[variant], className)}
      {...rest}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {loading ? "..." : children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
