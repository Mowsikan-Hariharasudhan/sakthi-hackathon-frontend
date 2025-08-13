import React, { useMemo } from 'react';
import { Paper, Typography, List, ListItem, ListItemText, Box } from '@mui/material';

export default function HotspotsList({ hotspots }) {
  const max = useMemo(() => Math.max(0, ...((hotspots || []).map(h => h.totalCO2 || 0))), [hotspots]);
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Hotspots</Typography>
      <List>
        {(hotspots || []).map((h, idx) => {
          const value = h.totalCO2 || 0;
          const pct = max > 0 ? Math.round((value / max) * 100) : 0;
          return (
            <ListItem key={idx} sx={{ display: 'block' }}>
              <ListItemText primary={h.department ?? h._id} secondary={`${value.toFixed(3)} kg`} />
              <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'success.main', borderRadius: 1 }} />
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
