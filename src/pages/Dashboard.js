import React, { useEffect, useMemo, useState } from 'react';
import { Grid, Paper, Typography, Box, TextField, Button, Skeleton, Alert } from '@mui/material';
import KpiCard from '../components/KpiCard';
import HotspotsList from '../components/HotspotsList';
import ErrorAlert from '../components/ErrorAlert';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CategoryScale,
} from 'chart.js';
import api from '../api/api';
import Loading from '../components/Loading';
import { toCSV, downloadCSV } from '../utils/csv';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, CategoryScale);

export default function Dashboard() {
  const [recent, setRecent] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [offsetTotal, setOffsetTotal] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [minutesAhead, setMinutesAhead] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warning, setWarning] = useState('');
const [predictionData, setPredictionData] = useState([]);
  const GAS_THRESHOLD = 1000; // ppm
  const CO2_SPIKE_PERCENT = 20; // %

  const totals = useMemo(() => {
    const totalCO2 = recent.reduce((a, b) => a + (b.co2_emissions || 0), 0);
    const totalEnergy = recent.reduce((a, b) => a + (b.energy || 0), 0);
    const totalCurrent = recent.reduce((a, b) => a + (b.current || 0), 0);
    const totalPower = recent.reduce((a, b) => a + (b.power || 0), 0);
    const totalGasPPM = recent.reduce((a, b) => a + (b.gas_ppm || 0), 0);
    return { totalCO2, totalEnergy, totalCurrent, totalPower, totalGasPPM };
  }, [recent]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [r1, r2, r3, r4] = await Promise.all([
          api.get('/emissions/recent'),
          api.get('/emissions/hotspots'),
          api.get('/offsets').catch(() => ({ data: [] })),
          api.get('/reports/summary').catch(() => ({ data: null })),
        ]);
        setRecent(r1.data || []);
        setHotspots(r2.data || []);
        const sumOffsets = (r3.data || []).reduce((a, b) => a + (b.amount || 0), 0);
        setOffsetTotal(sumOffsets);
        setSummary(r4.data);
        setError('');
        setLoading(false);
      } catch (e) {
        setError('Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Warning logic
  useEffect(() => {
    if (recent.length < 2) return;
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];

    let newWarning = '';
    if (last.gas_ppm && last.gas_ppm > GAS_THRESHOLD) {
      newWarning = `⚠️ High Gas Levels: ${last.gas_ppm} ppm (Threshold: ${GAS_THRESHOLD} ppm)`;
    } else if (prev.co2_emissions && last.co2_emissions &&
               ((last.co2_emissions - prev.co2_emissions) / prev.co2_emissions) * 100 > CO2_SPIKE_PERCENT) {
      newWarning = `⚠️ CO₂ spike detected: from ${prev.co2_emissions.toFixed(3)} kg to ${last.co2_emissions.toFixed(3)} kg`;
    }
    setWarning(newWarning);
  }, [recent]);

  const filteredRecent = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;
    return recent.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= fromTs && t <= toTs;
    });
  }, [recent, from, to]);

 const data = useMemo(() => {
  const labels = filteredRecent.map((r) => new Date(r.timestamp).toLocaleTimeString());

  // Prepare CO2 emissions dataset with point colors
  const co2Values = filteredRecent.map((r) => r.co2_emissions);
  const gasValues = filteredRecent.map((r) => r.gas_ppm || 0);
  
const predictionDataset = predictionData.length
  ? {
      label: "Predicted CO2 (Next Hour)",
      data: [
        ...filteredRecent.map((r) => r.co2_emissions),
        ...predictionData.map((p) => p.predicted),
      ],
      borderColor: "orange",
      borderDash: [5, 5],
      tension: 0.2,
      fill: false,
    }
  : null;


  const pointColors = filteredRecent.map((r, i) => {
    if (gasValues[i] > GAS_THRESHOLD) {
      return 'red'; // High gas
    }
    if (
      i > 0 &&
      co2Values[i - 1] > 0 &&
      ((co2Values[i] - co2Values[i - 1]) / co2Values[i - 1]) * 100 > CO2_SPIKE_PERCENT
    ) {
      return 'orange'; // CO2 spike
    }
    return '#66bb6a'; // Normal
  });

    return {
      labels: [
    ...filteredRecent.map((r) => new Date(r.timestamp).toLocaleTimeString()),
    ...predictionData.map((p) => new Date(p.timestamp).toLocaleTimeString()),
  ],
    datasets: [
      {
        label: 'CO2 Emissions (kg)',
        data: filteredRecent.map((r) => r.co2_emissions),
        borderColor: '#66bb6a',
        backgroundColor: 'rgba(102,187,106,0.2)',
        tension: 0.2,
        yAxisID: 'y1',
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Current (A)',
        data: filteredRecent.map((r) => r.current),
        borderColor: '#42a5f5',
        backgroundColor: 'rgba(66,165,245,0.2)',
        tension: 0.2,
        yAxisID: 'y2',
      },
      ...(predictionDataset ? [predictionDataset] : []),
    ],
    };
  }, [filteredRecent]);

const handlePredict = async () => {
  try {
    const res = await api.get('/emissions/predict', { params: { minutesAhead } });
    setPrediction(res.data);
  } catch (error) {
    console.error(error);
    alert(error.response?.data?.error || 'Prediction failed');
  }
};


  const netZeroProgress = useMemo(() => {
    if (summary && typeof summary.progress === 'number') {
      return summary.progress.toFixed(1);
    }
    const totalCO2 = totals.totalCO2 || 0;
    if (totalCO2 <= 0) return 0;
    return Math.min(100, ((offsetTotal / totalCO2) * 100)).toFixed(1);
  }, [offsetTotal, totals, summary]);

  return (
    <Box>
      {/* Warning Banner */}
      {warning && (
        <Alert severity="warning" sx={{ mb: 2, fontWeight: 'bold' }}>
          {warning}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* KPI Cards */}
        <Grid item xs={12} md={4}>
          <KpiCard title="Total CO2" value={`${(summary?.totalCO2 ?? totals.totalCO2).toFixed(3)} kg`} loading={!summary} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title="Total Energy" value={`${(summary?.totalEnergy ?? totals.totalEnergy).toFixed(3)} kWh`} loading={!summary} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title="Net-Zero Progress" value={`${netZeroProgress}%`} loading={!summary} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title="Total Current" value={`${totals.totalCurrent.toFixed(2)} A`} loading={!summary} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title="Total Power" value={`${totals.totalPower.toFixed(2)} W`} loading={!summary} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title="Total Gas" value={`${totals.totalGasPPM.toFixed(0)} ppm`} loading={!summary} />
        </Grid>

        {/* Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Live CO2 & Current Over Time</Typography>
            <ErrorAlert message={error} />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField type="datetime-local" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} size="small" />
              <TextField type="datetime-local" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} size="small" />
              <Button variant="outlined" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const headers = [
                    { key: 'timestamp', label: 'Timestamp' },
                    { key: 'department', label: 'Department' },
                    { key: 'scope', label: 'Scope' },
                    { key: 'gas_ppm', label: 'Gas PPM' },
                    { key: 'current', label: 'Current (A)' },
                    { key: 'voltage', label: 'Voltage (V)' },
                    { key: 'power', label: 'Power (W)' },
                    { key: 'energy', label: 'Energy (kWh)' },
                    { key: 'co2_emissions', label: 'CO₂ (kg)' },
                  ];
                  const csv = toCSV(filteredRecent, headers);
                  downloadCSV('emissions.csv', csv);
                }}
              >
                Export CSV
              </Button>
            </Box>
            {loading ? (
              <Loading />
            ) : (
              filteredRecent.length ? (
                <Line
                  data={data}
                  options={{
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                      y1: { type: 'linear', position: 'left' },
                      y2: { type: 'linear', position: 'right' },
                    },
                  }}
                />
              ) : (
                <Skeleton variant="rectangular" height={240} />
              )
            )}
          </Paper>
        </Grid>

        {/* Hotspots + Prediction */}
        <Grid item xs={12} md={4}>
          <HotspotsList hotspots={hotspots} />
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Prediction</Typography>
            <Box display="flex" gap={1}>
              <TextField
                label="Minutes Ahead"
                type="number"
                value={minutesAhead}
                onChange={(e) => setMinutesAhead(parseInt(e.target.value || '60', 10))}
                size="small"
              />
             <Button variant="contained" onClick={handlePredict}>Predict</Button>

            </Box>
            {prediction && (
              <Typography sx={{ mt: 1 }}>
                Predicted CO2: {prediction.prediction?.toFixed ? prediction.prediction.toFixed(3) : prediction.prediction} kg
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
