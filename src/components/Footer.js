import React from 'react';
import { Box, Link, Typography } from '@mui/material';

export default function Footer() {
  const api = process.env.REACT_APP_API_BASE || 'https://sakthi-hackathon-2.onrender.com/api';
  return (
    <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="caption">
        API: <Link href={api} target="_blank" rel="noreferrer">{api}</Link>
      </Typography>
    </Box>
  );
}
