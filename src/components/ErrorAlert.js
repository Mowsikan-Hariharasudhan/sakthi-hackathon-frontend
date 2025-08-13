import React from 'react';
import { Alert } from '@mui/material';

export default function ErrorAlert({ message }) {
  if (!message) return null;
  return <Alert severity="error">{message}</Alert>;
}
