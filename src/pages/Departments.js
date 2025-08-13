import React, { useEffect, useMemo, useState } from 'react';
import { Paper, Typography, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Box, TextField, MenuItem, Button, Skeleton } from '@mui/material';
import { toCSV, downloadCSV } from '../utils/csv';
import api from '../api/api';

export default function Departments() {
  const [recent, setRecent] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deptFilter, setDeptFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const r1 = await api.get('/emissions/recent');
        if (!mounted) return;
        setRecent(r1.data || []);
      } catch (err) {
        console.error('fetch recent error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const rows = useMemo(() => {
    const base = recent.map((r) => ({
      department: r.department,
      scope: r.scope,
      current: r.current,
      voltage: r.voltage,
      power: r.power,
      energy: r.energy,
      co2: r.co2_emissions,
      timestamp: r.timestamp, // Keep original timestamp
    }));

    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;

    return base.filter((row) => {
      const rowTs = new Date(row.timestamp).getTime();
      return (
        (!deptFilter || row.department?.toLowerCase().includes(deptFilter.toLowerCase())) &&
        (!scopeFilter || String(row.scope) === String(scopeFilter)) &&
        rowTs >= fromTs &&
        rowTs <= toTs
      );
    });
  }, [recent, deptFilter, scopeFilter, from, to]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Recent Department Readings</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField label="Department" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} size="small" />
        <TextField label="Scope" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} size="small" select sx={{ width: 140 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="1">1</MenuItem>
          <MenuItem value="2">2</MenuItem>
          <MenuItem value="3">3</MenuItem>
        </TextField>
        <TextField type="datetime-local" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} size="small" />
        <TextField type="datetime-local" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} size="small" />
        <Button variant="outlined" onClick={() => { setDeptFilter(''); setScopeFilter(''); setFrom(''); setTo(''); }}>Clear</Button>
        <Button variant="outlined" onClick={() => {
          const headers = [
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'department', label: 'Department' },
            { key: 'scope', label: 'Scope' },
            { key: 'current', label: 'Current' },
            { key: 'voltage', label: 'Voltage' },
            { key: 'power', label: 'Power' },
            { key: 'energy', label: 'Energy' },
            { key: 'co2', label: 'CO2' },
          ];
          const csv = toCSV(rows, headers);
          downloadCSV('departments.csv', csv);
        }}>Export CSV</Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Department</TableCell>
            <TableCell>Scope</TableCell>
            <TableCell>Current</TableCell>
            <TableCell>Voltage</TableCell>
            <TableCell>Power</TableCell>
            <TableCell>Energy</TableCell>
            <TableCell>CO2</TableCell>
            <TableCell>Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={`sk-${i}`}>
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}><Skeleton /></TableCell>
              ))}
            </TableRow>
          ))}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">No data</TableCell>
            </TableRow>
          )}
          {!loading && rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.department}</TableCell>
              <TableCell>{row.scope}</TableCell>
              <TableCell>{row.current}</TableCell>
              <TableCell>{row.voltage}</TableCell>
              <TableCell>{row.power}</TableCell>
              <TableCell>{row.energy}</TableCell>
              <TableCell>{row.co2}</TableCell>
              <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
}
