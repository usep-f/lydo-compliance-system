import React from 'react';
import { Form } from 'react-bootstrap';

interface FormFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<any>) => void;
  required?: boolean;
  as?: any;
  rows?: number;
  accept?: string;
  helpText?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  as,
  rows,
  accept,
  helpText,
  error,
  className = 'mb-3',
  disabled = false,
  children
}) => {
  return (
    <Form.Group className={className}>
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type={type}
        as={as}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        accept={accept}
        isInvalid={!!error}
        disabled={disabled}
      />
      {helpText && <Form.Text className="text-muted">{helpText}</Form.Text>}
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
      {children}
    </Form.Group>
  );
};

export default FormField;
