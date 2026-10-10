import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#3949ab' },
    secondary: { main: '#00897b' },
    background: { default: '#f5f6fa', paper: '#ffffff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: '1px solid #e3e6ef' } },
    },
    MuiPaper: {
      styleOverrides: { outlined: { borderColor: '#e3e6ef' } },
    },
    MuiTableCell: {
      styleOverrides: { head: { fontWeight: 600, color: '#5a6072', backgroundColor: '#fafbfd' } },
    },
  },
});

export default theme;
