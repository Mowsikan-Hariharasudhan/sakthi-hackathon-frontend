import React, { useEffect, useState } from 'react';
import { Paper, Typography, TextField, Button, List, ListItem, ListItemText, Box, Skeleton } from '@mui/material';
import api from '../api/api';
import ErrorAlert from '../components/ErrorAlert';
import { useToast } from '../providers/ToastProvider';
import { toCSV, downloadCSV } from '../utils/csv';

export default function Offsets() {
  const [description, setDescription] = useState('Tree plantation');
  const [amount, setAmount] = useState(1);
  const [offsets, setOffsets] = useState([]);
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/offsets');
      setOffsets(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    try {
      setError('');
      if (!description || !amount) {
        setError('Description and amount are required');
        return;
      }
  await api.post('/offsets', { description, amount: Number(amount) });
  setDescription('');
      setAmount(1);
  toastSuccess('Offset added');
      await load();
    } catch (e) {
  setError('Failed to add offset');
  toastError('Failed to add offset');
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Add Carbon Offset</Typography>
  <ErrorAlert message={error} />
      <Box sx={{ display: 'flex', gap: 2, my: 1 }}>
        <Button variant="outlined" onClick={() => {
          const headers = [
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount (kg)' },
          ];
          const csv = toCSV(offsets, headers);
          downloadCSV('offsets.csv', csv);
        }}>Export CSV</Button>
      </Box>
  <Box display="flex" gap={2} sx={{ mt: 1 }}>
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth />
        <TextField label="Amount (kg CO2)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} size="small" />
        <Button variant="contained" onClick={add}>Add</Button>
      </Box>
      <Typography variant="h6" sx={{ mt: 3 }}>Existing Offsets</Typography>
      <List>
        {loading && Array.from({ length: 5 }).map((_, idx) => (
          <ListItem key={`sk-${idx}`} divider>
            <ListItemText primary={<Skeleton width={220} />} secondary={<Skeleton width={160} />} />
          </ListItem>
        ))}
        {!loading && offsets.length === 0 && (
          <ListItem>
            <ListItemText primary="No offsets yet" />
          </ListItem>
        )}
        {!loading && offsets.map((o, idx) => (
          <ListItem key={idx}>
            <ListItemText primary={`${o.description} - ${o.amount} kg`} secondary={new Date(o.timestamp).toLocaleString()} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
