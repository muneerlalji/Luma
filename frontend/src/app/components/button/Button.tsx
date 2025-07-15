import React from 'react';
import './Button.css';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  className?: string;
};

const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button className={`luma-btn ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button; 