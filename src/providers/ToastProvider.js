import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext({ success: () => {}, error: () => {} });

export function ToastProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'success' });

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const success = useCallback((message) => setState({ open: true, message, severity: 'success' }), []);
  const error = useCallback((message) => setState({ open: true, message, severity: 'error' }), []);

  const value = useMemo(() => ({ success, error }), [success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar open={state.open} autoHideDuration={2500} onClose={close} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={state.severity} onClose={close} sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
