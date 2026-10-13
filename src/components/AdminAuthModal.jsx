import React from 'react';
import AuthenticatorLoginModal from './AuthenticatorLoginModal';

export default function AdminAuthModal(props) {
  return <AuthenticatorLoginModal {...props} portal="admin" />;
}
