import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppsIcon from '@mui/icons-material/ViewQuilt';
import LogoutIcon from '@mui/icons-material/Logout';
import RecordForm from '../components/RecordForm';
import EmptyState from '../components/EmptyState';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { createRecord, listRecords } from '../services/recordApi';
import { getErrorMessage } from '../utils/errors';

const formatDate = (iso) => new Date(iso).toLocaleString();

export default function Dashboard() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isTablet = useMediaQuery(theme.breakpoints.up('sm'));
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch: GET /api/records on python-service.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRecords(await listRecords());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load records'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Logout is client-side: the JWT is stateless, so deleting it ends the session.
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Create: POST /api/records on python-service.
  const handleCreateRecord = async (data) => {
    try {
      const created = await createRecord(data);
      setRecords((rs) => [created, ...rs]);
      notify('Record saved');
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Could not save record'));
    }
  };

  const hasRecords = !loading && !error && records.length > 0;

  return (
    <Box style={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        style={{ borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Toolbar>
          <AppsIcon color="primary" style={{ marginRight: '8px' }} />
          <Typography variant="h6" noWrap style={{ flexGrow: 1 }}>
            RecordHub
          </Typography>
          {isTablet && (
            <Typography variant="body2" color="text.secondary" noWrap style={{ marginRight: '12px' }}>
              {user?.email}
            </Typography>
          )}
          {isDesktop ? (
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <IconButton aria-label="Logout" onClick={handleLogout} edge="end">
              <LogoutIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        style={{ paddingTop: isTablet ? '32px' : '16px', paddingBottom: isTablet ? '32px' : '16px' }}
      >
        <Typography variant="h5" component="h1" style={{ marginBottom: '4px' }}>
          Hello, {user?.name?.split(' ')[0] || 'there'}
        </Typography>
        <Typography variant="body2" color="text.secondary" style={{ marginBottom: '24px' }}>
          Records are saved and fetched by the Python service, using the login token from the Node service.
        </Typography>

        <Card style={{ marginBottom: '32px' }}>
          <CardContent style={{ padding: isTablet ? '24px' : '16px' }}>
            <Typography variant="h6" style={{ marginBottom: '16px' }}>
              New record
            </Typography>
            <RecordForm onSave={handleCreateRecord} />
          </CardContent>
        </Card>

        <div style={{ display: 'flex', marginBottom: '12px', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h6">Your records</Typography>
          {!loading && !error && (
            <Typography variant="body2" color="text.secondary">
              {records.length} total
            </Typography>
          )}
        </div>
        {loading && (
          <Box style={{ display: 'grid', placeItems: 'center', paddingTop: '48px', paddingBottom: '48px' }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={load}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!loading && !error && records.length === 0 && (
          <Paper variant="outlined">
            <EmptyState title="No records yet" description="Use the form above to add your first record." />
          </Paper>
        )}

        {hasRecords && isDesktop && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell style={{ fontWeight: 500 }}>{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.age}</TableCell>
                    <TableCell>
                      <Chip label={r.department} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell style={{ maxWidth: '260px', color: theme.palette.text.secondary }}>
                      <Typography variant="body2" noWrap title={r.description}>
                        {r.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell style={{ whiteSpace: 'nowrap', color: theme.palette.text.secondary }}>
                      {formatDate(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Mobile: one card per record instead of a wide table */}
        {hasRecords && !isDesktop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {records.map((r) => (
              <Card key={r.id}>
                <CardContent>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box style={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" style={{ fontWeight: 600 }} noWrap>
                        {r.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {r.email}
                      </Typography>
                    </Box>
                    <Chip label={r.department} size="small" variant="outlined" />
                  </div>
                  <Typography variant="body2" style={{ marginTop: '8px' }}>
                    Age: {r.age}
                  </Typography>
                  {r.description && (
                    <Typography variant="body2" color="text.secondary" style={{ marginTop: '4px', wordBreak: 'break-word' }}>
                      {r.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" style={{ display: 'block', marginTop: '8px' }}>
                    {formatDate(r.createdAt)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </Box>
  );
}
