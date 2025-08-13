import React from 'react';
import { Paper, Typography, Button } from '@mui/material';

export default function Reports() {
  const download = () => {
    const base = process.env.REACT_APP_API_BASE || 'http://localhost:4000/api';
    window.open(`${base}/reports/generate`, '_blank');
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>ESG Reports</Typography>
      <Button variant="contained" onClick={download}>Download ESG PDF</Button>
    </Paper>
  );
}
