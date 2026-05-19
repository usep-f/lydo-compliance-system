import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import type { ButtonProps } from 'react-bootstrap';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading, 
  loadingText, 
  children, 
  disabled, 
  ...props 
}) => {
  return (
    <Button {...props} disabled={disabled || loading}>
      {loading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default LoadingButton;
