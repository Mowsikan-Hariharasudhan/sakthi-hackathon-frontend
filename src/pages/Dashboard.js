import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Skeleton,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Fade,
  Slide
} from '@mui/material';

// ✅ All icons imported only if they exist in @mui/icons-material
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PublicIcon from '@mui/icons-material/Public';
import BusinessIcon from '@mui/icons-material/Business';
import ForestIcon from '@mui/icons-material/Forest'; // ✅ replaced EcoIcon
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import TimelineIcon from '@mui/icons-material/Timeline';
import InsightsIcon from '@mui/icons-material/Insights';

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
  CategoryScale
} from 'chart.js';
import api from '../api/api';
import Loading from '../components/Loading';
import { toCSV, downloadCSV } from '../utils/csv';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, CategoryScale);

// Difficulty badge helper
const getDifficultyChip = (difficulty) => {
  const config = {
    low: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', label: 'Low', icon: '🟢' },
    medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', label: 'Medium', icon: '🟡' },
    high: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'High', icon: '🔴' }
  };
  const diff = config[difficulty?.toLowerCase()] || config.medium;
  return (
    <Chip
      label={`${diff.icon} ${diff.label}`}
      size="small"
      sx={{
        backgroundColor: diff.bg,
        color: diff.color,
        fontWeight: 600,
        fontSize: '0.75rem',
        border: `1px solid ${diff.color}30`
      }}
    />
  );
};

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
  const [department, setDepartment] = useState('');
  const [scope, setScope] = useState('');
  const [live, setLive] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStrategies, setAiStrategies] = useState(null);
  const [analysisWindow, setAnalysisWindow] = useState(6);

  const totals = useMemo(() => {
    const totalCO2 = recent.reduce((a, b) => a + (b.co2_emissions || 0), 0);
    const totalEnergy = recent.reduce((a, b) => a + (b.energy || 0), 0);
    return { totalCO2, totalEnergy };
  }, [recent]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [r1, r2, r3, r4] = await Promise.all([
          api.get('/emissions/recent'),
          api.get('/emissions/hotspots'),
          api.get('/offsets').catch(() => ({ data: [] })),
          api.get('/reports/summary').catch(() => ({ data: null }))
        ]);
        setRecent(r1.data || []);
        setHotspots(r2.data || []);
        const sumOffsets = (r3.data || []).reduce((a, b) => a + (b.amount || 0), 0);
        setOffsetTotal(sumOffsets);
        setSummary(r4.data);
        setError('');
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = live ? setInterval(fetchData, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [live]);

  const deptOptions = useMemo(() => {
    const set = new Set((recent || []).map(r => r.department).filter(Boolean));
    return Array.from(set);
  }, [recent]);

  const filteredRecent = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;
    return recent.filter(r => {
      const t = new Date(r.timestamp).getTime();
      const deptOk = !department || r.department === department;
      const scopeOk = !scope || String(r.scope) === String(scope);
      return t >= fromTs && t <= toTs && deptOk && scopeOk;
    });
  }, [recent, from, to, department, scope]);

  const mergedData = useMemo(() => {
    const labels = filteredRecent.map(r => new Date(r.timestamp).toLocaleTimeString());
    return {
      labels,
      datasets: [
        {
          label: 'CO₂ Emissions (kg)',
          data: filteredRecent.map(r => r.co2_emissions),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        },
        {
          label: 'Current (A)',
          data: filteredRecent.map(r => r.current),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          yAxisID: 'y2'
        }
      ]
    };
  }, [filteredRecent]);

  const mergedOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    stacked: false,
    scales: {
      y1: { type: 'linear', position: 'left', title: { display: true, text: 'CO₂ (kg)' } },
      y2: { type: 'linear', position: 'right', title: { display: true, text: 'Current (A)' }, grid: { drawOnChartArea: false } }
    }
  };

  const fetchAi = async () => {
    try {
      setAiLoading(true);
      const res = await api.get('/ai/strategies', { params: { hours: analysisWindow, topN: 5 } });
      setAiStrategies(res.data);
    } catch {
      setAiStrategies({ error: 'Failed to fetch AI strategies' });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePredict = async () => {
    const res = await api.get(`/emissions/predict`, { params: { minutesAhead } });
    setPrediction(res.data);
  };

  const netZeroProgress = useMemo(() => {
    if (summary && typeof summary.progress === 'number') return summary.progress.toFixed(1);
    const totalCO2 = totals.totalCO2 || 0;
    if (totalCO2 <= 0) return 0;
    return Math.min(100, ((offsetTotal / totalCO2) * 100)).toFixed(1);
  }, [offsetTotal, totals, summary]);

  return (
    <Box sx={{ px: { xs:1, sm:2, md:3 } }}>
      {/* Enhanced Header */}
      <Slide direction="down" in={true} timeout={800}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          alignItems={{ xs: 'flex-start', md: 'center' }} 
          justifyContent="space-between" 
          sx={{ mb: 4, gap: 2 }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              Operations Dashboard
            </Typography>
            <Stack direction="row" alignItems="center" gap={1}>
              <TimelineIcon sx={{ color: '#10b981', fontSize: 20 }} />
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Live emissions monitoring with AI-powered insights
              </Typography>
              {live && (
                <Chip 
                  label="LIVE" 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#10b981', 
                    color: '#fff', 
                    fontWeight: 700,
                    animation: 'pulse 2s infinite'
                  }} 
                />
              )}
            </Stack>
          </Box>
          
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<DownloadIcon />} 
              onClick={() => {
                const headers = [
                  { key: 'timestamp', label: 'Timestamp' },
                  { key: 'department', label: 'Department' },
                  { key: 'scope', label: 'Scope' },
                  { key: 'current', label: 'Current (A)' },
                  { key: 'voltage', label: 'Voltage (V)' },
                  { key: 'power', label: 'Power (W)' },
                  { key: 'energy', label: 'Energy (kWh)' },
                  { key: 'co2_emissions', label: 'CO₂ (kg)' },
                ];
                const csv = toCSV(filteredRecent, headers);
                downloadCSV('emissions.csv', csv);
              }}
              sx={{ 
                borderColor: '#10b981', 
                color: '#10b981',
                '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
              }}
            >
              Export CSV
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<PictureAsPdfIcon />} 
              onClick={() => {
                const apiBase = process.env.REACT_APP_API_BASE || 'https://sakthi-hackathon-2.onrender.com/api';
                const params = new URLSearchParams();
                if (from) params.set('from', from);
                if (to) params.set('to', to);
                if (department) params.set('department', department);
                if (scope) params.set('scope', scope);
                params.set('t', String(Date.now()));
                window.open(`${apiBase}/reports/generate?${params.toString()}`, '_blank');
              }}
              sx={{ 
                borderColor: '#f59e0b', 
                color: '#f59e0b',
                '&:hover': { backgroundColor: 'rgba(245, 158, 11, 0.1)' }
              }}
            >
              ESG PDF
            </Button>
            <Button 
              size="small" 
              variant={live ? 'contained' : 'outlined'} 
              color={live ? 'success' : 'inherit'} 
              startIcon={live ? <PauseIcon /> : <PlayArrowIcon />} 
              onClick={() => setLive((v) => !v)}
              sx={{ 
                fontWeight: 600,
                boxShadow: live ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              {live ? 'Pause Live' : 'Resume Live'}
            </Button>
          </Stack>
        </Stack>
      </Slide>

      <Grid container spacing={3}>
        {/* Enhanced KPI Cards */}
        <Grid item xs={12} md={4}>
          <Fade in={true} timeout={600}>
            <div>
              <KpiCard 
                title="Total CO₂" 
                value={`${(summary?.totalCO2 ?? totals.totalCO2).toFixed(3)} kg`} 
                loading={!summary}
                icon={<ForestIcon />}
                color="#ef4444"
              />
            </div>
          </Fade>
        </Grid>
        <Grid item xs={12} md={4}>
          <Fade in={true} timeout={800}>
            <div>
              <KpiCard 
                title="Total Energy" 
                value={`${(summary?.totalEnergy ?? totals.totalEnergy).toFixed(3)} kWh`} 
                loading={!summary}
                icon={<SpeedIcon />}
                color="#3b82f6"
              />
            </div>
          </Fade>
        </Grid>
        <Grid item xs={12} md={4}>
          <Fade in={true} timeout={1000}>
            <div>
              <KpiCard 
                title="Net-Zero Progress" 
                value={`${netZeroProgress}%`} 
                loading={!summary}
                icon={<InsightsIcon />}
                color="#10b981"
              />
            </div>
          </Fade>
        </Grid>

        {/* Enhanced Filters Bar */}
        <Grid item xs={12}>
          <Slide direction="up" in={true} timeout={600}>
            <Paper 
              sx={{ 
                p: { xs:1, sm:2 }, 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems={{ xs: 'stretch', lg: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FilterAltIcon sx={{ color: '#1976d2', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                    Smart Filters
                  </Typography>
                </Stack>
                
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1 }}>
                  <Autocomplete
                    size="small"
                    options={deptOptions}
                    sx={{ minWidth: 200 }}
                    value={department}
                    onChange={(_, val) => setDepartment(val || '')}
                    renderInput={(params) => 
                      <TextField 
                        {...params} 
                        label="Department" 
                        placeholder="All Departments" 
                        variant="outlined"
                      />
                    }
                  />
                  
                  <ToggleButtonGroup
                    size="small"
                    value={scope}
                    exclusive
                    onChange={(_, val) => setScope(val || '')}
                    sx={{ 
                      '& .MuiToggleButton-root': { 
                        fontWeight: 600,
                        '&.Mui-selected': { 
                          backgroundColor: '#1976d2',
                          color: '#fff'
                        }
                      }
                    }}
                  >
                    <ToggleButton value="">All</ToggleButton>
                    <ToggleButton value="1">Scope 1</ToggleButton>
                    <ToggleButton value="2">Scope 2</ToggleButton>
                    <ToggleButton value="3">Scope 3</ToggleButton>
                  </ToggleButtonGroup>
                  
                  <TextField 
                    type="datetime-local" 
                    label="From" 
                    InputLabelProps={{ shrink: true }} 
                    value={from} 
                    onChange={(e) => setFrom(e.target.value)} 
                    size="small" 
                  />
                  <TextField 
                    type="datetime-local" 
                    label="To" 
                    InputLabelProps={{ shrink: true }} 
                    value={to} 
                    onChange={(e) => setTo(e.target.value)} 
                    size="small" 
                  />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button 
                    size="small" 
                    variant="text" 
                    startIcon={<AccessTimeIcon />} 
                    onClick={() => {
                      const d = new Date(Date.now() - 60 * 60 * 1000);
                      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                      setFrom(iso); setTo('');
                    }}
                  >
                    1h
                  </Button>
                  <Button 
                    size="small" 
                    variant="text" 
                    onClick={() => {
                      const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
                      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                      setFrom(iso); setTo('');
                    }}
                  >
                    24h
                  </Button>
                  <Button 
                    size="small" 
                    variant="text" 
                    onClick={() => {
                      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                      setFrom(iso); setTo('');
                    }}
                  >
                    7d
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => { 
                      setFrom(''); setTo(''); setDepartment(''); setScope(''); 
                    }}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Slide>
        </Grid>

        {/* Enhanced Chart */}
        <Grid item xs={12} md={8}>
          <Fade in={true} timeout={1200}>
            <Paper 
              sx={{ 
                p: { xs:1, sm:2 }, 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <TimelineIcon sx={{ color: '#1976d2', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Live Telemetry: CO₂ & Current Analysis
                </Typography>
                <Chip 
                  label={`${filteredRecent.length} data points`}
                  size="small"
                  sx={{ backgroundColor: '#e0f2fe', color: '#01579b', fontWeight: 600 }}
                />
              </Box>
              
              <ErrorAlert message={error} />
              {loading ? (
                <Loading />
              ) : filteredRecent.length ? (
                <Box sx={{ height: 400 }}>
                  <Line data={mergedData} options={mergedOptions} />
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 2,
                    border: '2px dashed #cbd5e1'
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    No data available for selected filters
                  </Typography>
                </Box>
              )}
            </Paper>
          </Fade>
        </Grid>

        {/* Enhanced Hotspots & Prediction */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Fade in={true} timeout={1400}>
              <div>
                <HotspotsList hotspots={hotspots} />
              </div>
            </Fade>
            
            <Fade in={true} timeout={1600}>
              <Paper 
                sx={{ 
                  p: { xs:1, sm:2 }, 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #fff 0%, #f0f9ff 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)'
                }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <InsightsIcon sx={{ color: '#3b82f6', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    AI Prediction
                  </Typography>
                </Box>
                
                <Stack spacing={2}>
                  <TextField
                    label="Minutes Ahead"
                    type="number"
                    value={minutesAhead}
                    onChange={(e) => setMinutesAhead(parseInt(e.target.value || '60', 10))}
                    size="small"
                    fullWidth
                  />
                  <Button 
                    variant="contained" 
                    onClick={handlePredict}
                    sx={{ 
                      background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(45deg, #2563eb, #1e40af)'
                      }
                    }}
                  >
                    Generate Prediction
                  </Button>
                  
                  {prediction && (
                    <Card sx={{ backgroundColor: '#f0f9ff', border: '1px solid #3b82f6' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Predicted CO₂ Emission
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af' }}>
                          {prediction.prediction?.toFixed ? prediction.prediction.toFixed(3) : prediction.prediction} kg
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </Paper>
            </Fade>
          </Stack>
        </Grid>

        {/* Professional AI Strategies Section */}
        <Grid item xs={12}>
          <Fade in={true} timeout={1800}>
            <Paper 
              sx={{ 
                p: { xs: 2, sm: 3, md: 4 }, 
                background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #2d3561 100%)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #ec4899, #f59e0b)'
                }
              }}
            >
              {/* Enhanced Header Section */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: { xs: 2, md: 3 },
                  mb: 4
                }}
              >
                <Box display="flex" alignItems="center" gap={3}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 3, 
                      background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 25px rgba(79, 70, 229, 0.4)'
                    }}
                  >
                    <AutoFixHighIcon sx={{ color: '#fff', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 800,
                        mb: 1,
                        background: 'linear-gradient(45deg, #fff, #e2e8f0)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      AI-Powered Reduction Strategies
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontWeight: 500,
                        maxWidth: 500
                      }}
                    >
                      Our system analyze your telemetry data to provide actionable optimization recommendations
                    </Typography>
                  </Box>
                </Box>

                {/* Enhanced Controls */}
                <Card 
                  sx={{ 
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Stack spacing={3}>
                      <Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            mb: 1,
                            display: 'block'
                          }}
                        >
                          Analysis Window
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={analysisWindow}
                          onChange={(e) => setAnalysisWindow(parseInt(e.target.value) || 6)}
                          sx={{ 
                            width: 120,
                            '& .MuiOutlinedInput-root': {
                              color: '#fff',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 2,
                              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                              '&.Mui-focused fieldset': { borderColor: '#4f46e5', borderWidth: 2 }
                            },
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                          }}
                          InputProps={{
                            endAdornment: <Typography variant="caption" sx={{ color: '#cbd5e1', ml: 1 }}>hrs</Typography>
                          }}
                        />
                      </Box>
                      
                      <Button 
                        variant="contained"
                        size="large"
                        startIcon={aiLoading ? <CircularProgress size={20} color="inherit" /> : <PsychologyIcon />}
                        disabled={aiLoading}
                        onClick={fetchAi}
                        sx={{ 
                          background: aiLoading 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'linear-gradient(45deg, #4f46e5, #7c3aed)',
                          color: '#fff',
                          fontWeight: 700,
                          px: 4,
                          py: 1.5,
                          borderRadius: 3,
                          textTransform: 'none',
                          fontSize: '1rem',
                          boxShadow: aiLoading 
                            ? 'none' 
                            : '0 8px 25px rgba(79, 70, 229, 0.4)',
                          '&:hover': {
                            background: aiLoading 
                              ? 'rgba(255, 255, 255, 0.1)' 
                              : 'linear-gradient(45deg, #4338ca, #6d28d9)',
                            boxShadow: '0 12px 35px rgba(79, 70, 229, 0.6)',
                            transform: 'translateY(-2px)'
                          },
                          '&:disabled': {
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.5)'
                          },
                          transition: 'all 0.3s ease-in-out'
                        }}
                      >
                        {aiLoading ? 'Analyzing Patterns...' : 'Generate Smart Strategies'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>

              {/* Enhanced Empty State */}
              {!aiStrategies && (
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 3,
                    border: '2px dashed rgba(255, 255, 255, 0.15)',
                    position: 'relative'
                  }}
                >
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <TrendingUpIcon sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.4)', mb: 3 }} />
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        mb: 2,
                        fontWeight: 700
                      }}
                    >
                      Ready to Unlock Optimization Insights
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxWidth: 600,
                        mx: 'auto',
                        lineHeight: 1.7
                      }}
                    >
                      Our advanced AI will analyze your recent operational data and provide personalized, 
                      actionable strategies to reduce carbon emissions and optimize energy efficiency
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Enhanced Error State */}
              {aiStrategies?.error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 3,
                    '& .MuiAlert-icon': { color: '#f87171' },
                    '& .MuiAlert-message': { fontSize: '1rem' }
                  }}
                >
                  <AlertTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    Analysis Failed
                  </AlertTitle>
                  {aiStrategies.error}
                </Alert>
              )}

              {/* Enhanced Results Section */}
              {aiStrategies && !aiStrategies.error && (
                <Box sx={{ mt: 3 }}>
                  {/* Global Recommendations */}
                  {aiStrategies.global_recommendations && aiStrategies.global_recommendations.length > 0 && (
                    <Box sx={{ mb: 6 }}>
                      <Box display="flex" alignItems="center" gap={3} mb={4}>
                        <PublicIcon sx={{ color: '#4f46e5', fontSize: 32 }} />
                        <Box>
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              color: '#fff', 
                              fontWeight: 800,
                              mb: 0.5
                            }}
                          >
                            Global Optimization Opportunities
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)'
                            }}
                          >
                            Enterprise-wide strategies for maximum impact
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${aiStrategies.global_recommendations.length} strategies identified`}
                          sx={{ 
                            backgroundColor: 'rgba(79, 70, 229, 0.3)',
                            color: '#c7d2fe',
                            fontWeight: 700,
                            border: '1px solid rgba(79, 70, 229, 0.5)'
                          }}
                        />
                      </Box>
                      <Grid container spacing={{ xs: 2, md: 3 }}>
                        {aiStrategies.global_recommendations.map((g, i) => (
                          <Grid item xs={12} lg={6} key={i}>
                            <Card 
                              sx={{ 
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                borderRadius: 4,
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                  transform: 'translateY(-8px) scale(1.02)',
                                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                  border: '1px solid rgba(79, 70, 229, 0.4)',
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)'
                                }
                              }}
                            >
                              <CardContent sx={{ p: 4 }}>
                                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3}>
                                  <Typography 
                                    variant="h6" 
                                    sx={{ 
                                      color: '#fff', 
                                      fontWeight: 800,
                                      lineHeight: 1.3,
                                      flex: 1,
                                      mr: 2
                                    }}
                                  >
                                    {g.title}
                                  </Typography>
                                  {getDifficultyChip(g.difficulty)}
                                </Box>
                                
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    color: 'rgba(255, 255, 255, 0.85)', 
                                    mb: 3,
                                    lineHeight: 1.6
                                  }}
                                >
                                  {g.rationale}
                                </Typography>
                                
                                {'expected_impact_kg_co2_per_day' in g && (
                                  <Box 
                                    sx={{ 
                                      p: 3, 
                                      borderRadius: 3, 
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      mb: 3
                                    }}
                                  >
                                    <Box display="flex" alignItems="center" gap={2}>
                                      <ForestIcon sx={{ color: '#10b981', fontSize: 24 }} />
                                      <Box>
                                        <Typography 
                                          variant="subtitle1" 
                                          sx={{ 
                                            color: '#10b981', 
                                            fontWeight: 800
                                          }}
                                        >
                                          Expected Daily Impact
                                        </Typography>
                                        <Typography 
                                          variant="h6" 
                                          sx={{ 
                                            color: '#10b981', 
                                            fontWeight: 700
                                          }}
                                        >
                                          {g.expected_impact_kg_co2_per_day} kg CO₂ reduction
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                
                                {Array.isArray(g.actions) && g.actions.length > 0 && (
                                  <Box>
                                    <Typography 
                                      variant="subtitle1" 
                                      sx={{ 
                                        color: '#c7d2fe', 
                                        fontWeight: 700, 
                                        mb: 2,
                                        textTransform: 'uppercase',
                                        letterSpacing: 1.2
                                      }}
                                    >
                                      🎯 Action Items
                                    </Typography>
                                    <List dense sx={{ pl: 0 }}>
                                      {g.actions.map((a, idx) => (
                                        <ListItem key={idx} sx={{ pl: 0, py: 1 }}>
                                          <ListItemIcon sx={{ minWidth: 32 }}>
                                            <ChevronRightIcon sx={{ color: '#4f46e5', fontSize: 20 }} />
                                          </ListItemIcon>
                                          <ListItemText 
                                            primary={a} 
                                            sx={{ 
                                              '& .MuiListItemText-primary': { 
                                                color: 'rgba(255, 255, 255, 0.95)', 
                                                fontSize: '0.95rem',
                                                fontWeight: 500
                                              } 
                                            }} 
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Department Strategies */}
                  {aiStrategies.strategies_by_department && aiStrategies.strategies_by_department.length > 0 && (
                    <Box>
                      <Box display="flex" alignItems="center" gap={3} mb={4}>
                        <BusinessIcon sx={{ color: '#f59e0b', fontSize: 32 }} />
                        <Box>
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              color: '#fff', 
                              fontWeight: 800,
                              mb: 0.5
                            }}
                          >
                            Department-Specific Strategies
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)'
                            }}
                          >
                            Targeted optimizations for individual departments
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${aiStrategies.strategies_by_department.length} departments analyzed`}
                          sx={{ 
                            backgroundColor: 'rgba(245, 158, 11, 0.3)',
                            color: '#fbbf24',
                            fontWeight: 700,
                            border: '1px solid rgba(245, 158, 11, 0.5)'
                          }}
                        />
                      </Box>
                      
                      <Grid container spacing={{ xs: 2, md: 3 }}>
                        {aiStrategies.strategies_by_department.map((d, i) => (
                          <Grid item xs={12} xl={6} key={i}>
                            <Card 
                              sx={{ 
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                borderRadius: 4,
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                  transform: 'translateY(-8px)',
                                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)'
                                }
                              }}
                            >
                              <CardContent sx={{ p: 4 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                                  <Typography 
                                    variant="h5" 
                                    sx={{ 
                                      color: '#fff', 
                                      fontWeight: 800,
                                      textTransform: 'capitalize'
                                    }}
                                  >
                                    {d.department || d?.summary?.department || 'Department'}
                                  </Typography>
                                  <Chip 
                                    label={`${(d.strategies || []).length} strategies`}
                                    sx={{ 
                                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                      color: '#fbbf24',
                                      fontWeight: 700,
                                      border: '1px solid rgba(245, 158, 11, 0.3)'
                                    }}
                                  />
                                </Box>
                                
                                {d.summary && (
                                  <Box 
                                    sx={{ 
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: 3, 
                                      mb: 4,
                                      p: 3,
                                      borderRadius: 3,
                                      background: 'rgba(55, 65, 81, 0.6)'
                                    }}
                                  >
                                    <Box textAlign="center">
                                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                        CO₂ Emissions
                                      </Typography>
                                      <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 800, mt: 1 }}>
                                        {d.summary?.co2_kg ?? '—'} kg
                                      </Typography>
                                    </Box>
                                    <Box textAlign="center">
                                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                        Energy Usage
                                      </Typography>
                                      <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 800, mt: 1 }}>
                                        {d.summary?.energy_kWh ?? '—'} kWh
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}
                                
                                <Accordion 
                                  sx={{ 
                                    background: 'transparent',
                                    boxShadow: 'none',
                                    '&:before': { display: 'none' },
                                    '& .MuiAccordionSummary-root': {
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      borderRadius: 2,
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                      }
                                    }
                                  }}
                                >
                                  <AccordionSummary 
                                    expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}
                                    sx={{ px: 3, py: 2 }}
                                  >
                                    <Typography sx={{ color: '#c7d2fe', fontWeight: 700, fontSize: '1rem' }}>
                                      💡 View Optimization Strategies ({(d.strategies || []).length})
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails sx={{ px: 3, py: 2 }}>
                                    <Stack spacing={3}>
                                      {(d.strategies || []).map((s, j) => (
                                        <Box 
                                          key={j}
                                          sx={{ 
                                            p: 3,
                                            borderRadius: 3,
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                              background: 'rgba(255, 255, 255, 0.08)',
                                              transform: 'translateY(-2px)'
                                            }
                                          }}
                                        >
                                          <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                                            <Typography 
                                              variant="h6" 
                                              sx={{ 
                                                color: '#fff', 
                                                fontWeight: 700,
                                                flex: 1,
                                                mr: 2
                                              }}
                                            >
                                              {s.title}
                                            </Typography>
                                            {getDifficultyChip(s.difficulty)}
                                          </Box>
                                          
                                          <Typography 
                                            variant="body1" 
                                            sx={{ 
                                              color: 'rgba(255, 255, 255, 0.85)', 
                                              mb: 2,
                                              lineHeight: 1.6
                                            }}
                                          >
                                            {s.rationale}
                                          </Typography>
                                          
                                          <Box 
                                            sx={{ 
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 2,
                                              px: 3,
                                              py: 1.5,
                                              borderRadius: 2,
                                              background: 'rgba(16, 185, 129, 0.15)',
                                              border: '1px solid rgba(16, 185, 129, 0.3)',
                                              mb: 2
                                            }}
                                          >
                                            <TrendingDownIcon sx={{ color: '#10b981', fontSize: 20 }} />
                                            <Typography 
                                              variant="subtitle1" 
                                              sx={{ 
                                                color: '#10b981', 
                                                fontWeight: 700 
                                              }}
                                            >
                                              {s.expected_impact_kg_co2_per_day} kg CO₂/day reduction potential
                                            </Typography>
                                          </Box>
                                          
                                          {Array.isArray(s.actions) && s.actions.length > 0 && (
                                            <Box>
                                              <Typography 
                                                variant="subtitle2" 
                                                sx={{ 
                                                  color: '#c7d2fe', 
                                                  fontWeight: 700, 
                                                  mb: 1.5,
                                                  textTransform: 'uppercase',
                                                  letterSpacing: 1
                                                }}
                                              >
                                                🔧 Implementation Steps
                                              </Typography>
                                              <List dense sx={{ pl: 0 }}>
                                                {s.actions.map((a, k) => (
                                                  <ListItem key={k} sx={{ pl: 0, py: 0.5 }}>
                                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                                      <FiberManualRecordIcon sx={{ color: '#4f46e5', fontSize: 12 }} />
                                                    </ListItemIcon>
                                                    <ListItemText 
                                                      primary={a} 
                                                      sx={{ 
                                                        '& .MuiListItemText-primary': { 
                                                          color: 'rgba(255, 255, 255, 0.95)', 
                                                          fontSize: '0.9rem',
                                                          fontWeight: 500
                                                        } 
                                                      }} 
                                                    />
                                                  </ListItem>
                                                ))}
                                              </List>
                                            </Box>
                                          )}
                                        </Box>
                                      ))}
                                    </Stack>
                                  </AccordionDetails>
                                </Accordion>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Fade>
        </Grid>
      </Grid>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Box>
  );
}
