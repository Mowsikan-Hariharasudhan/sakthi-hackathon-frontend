import React from 'react';
import { Card, CardContent, Typography, Skeleton } from '@mui/material';

export default function KpiCard({ title, value, subtitle, loading = false }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        {loading ? (
          <Skeleton variant="text" width={120} height={40} />
        ) : (
          <Typography variant="h4">{value}</Typography>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        )}
      </CardContent>
    </Card>
  );
}
