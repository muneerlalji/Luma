import React from 'react';
import './TextBox.css';

interface TextBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
};

const TextBox: React.FC<TextBoxProps> = ({ className = '', ...props }) => {
  return <input className={`luma-textbox ${className}`} {...props} />;
};

export default TextBox; 