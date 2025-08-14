import React, { useMemo, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, IconButton, Switch, Container, Box, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Science';

import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Offsets from './pages/Offsets';
import Reports from './pages/Reports';
import Footer from './components/Footer';

function NavBar({ darkMode, onToggle }) {
  return (
    <AppBar position="static">
      <Toolbar>
        <MenuIcon sx={{ mr: 2 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Carbon Net-Zero Tracker
        </Typography>
        <Button color="inherit" component={Link} to="/">Dashboard</Button>
        <Button color="inherit" component={Link} to="/departments">Departments</Button>
        <Button color="inherit" component={Link} to="/offsets">Offsets</Button>
        <Button color="inherit" component={Link} to="/reports">Reports</Button>
        
      </Toolbar>
    </AppBar>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const theme = useMemo(() => createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } }), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar
        darkMode={darkMode}
        onToggle={() => {
          setDarkMode((d) => {
            const next = !d;
            localStorage.setItem('darkMode', JSON.stringify(next));
            return next;
          });
        }}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/offsets" element={<Offsets />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Container>
  <Footer />
    </ThemeProvider>
  );
}
