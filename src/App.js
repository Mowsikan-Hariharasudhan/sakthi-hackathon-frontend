import React, { useMemo, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Offsets from './pages/Offsets';
import Reports from './pages/Reports';
import Footer from './components/Footer';

function NavBar({ darkMode, onToggle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ width: 240 }}>
      <List>
        {['Dashboard', 'Departments', 'Offsets', 'Reports'].map((text) => (
          <ListItem key={text} disablePadding>
            <ListItemButton component={Link} to={text === 'Dashboard' ? '/' : `/${text.toLowerCase()}`}>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Carbon Net-Zero Tracker
        </Typography>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/departments">Departments</Button>
          <Button color="inherit" component={Link} to="/offsets">Offsets</Button>
          <Button color="inherit" component={Link} to="/reports">Reports</Button>
        </Box>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' } }}
        >
          {drawer}
        </Drawer>
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
  <Container maxWidth="lg" sx={{ py: 3, px: { xs: 1, sm: 3, md: 4 } }}>
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
