import React from 'react';
import AuthenticatorLoginModal from './AuthenticatorLoginModal';

export default function PinAccessModal({ role = 'cashier', ...props }) {
  return <AuthenticatorLoginModal {...props} portal={role === 'cashier' ? 'cashier' : 'admin'} />;
}
