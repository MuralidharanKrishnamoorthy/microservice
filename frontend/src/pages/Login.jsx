import { useContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AppsIcon from '@mui/icons-material/ViewQuilt';
import { AuthContext } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { validateEmail, validatePassword } from '../utils/validation';

// Single /login page. "Register" switches the same form into sign-up mode.
export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const { login, register, sessionExpired } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isWideScreen = useMediaQuery(theme.breakpoints.up('sm'));

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null); // { message, severity }
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const found = {};
    if (isRegister && values.name.trim().length < 2) found.name = 'Name must be at least 2 characters';
    const emailError = validateEmail(values.email);
    if (emailError) found.email = emailError;
    if (isRegister) {
      const pwError = validatePassword(values.password);
      if (pwError) found.password = pwError;
    } else if (!values.password) {
      found.password = 'Password is required';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      if (isRegister) {
        await register(values.name.trim(), values.email.trim(), values.password);
      } else {
        await login(values.email.trim(), values.password);
      }
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setServerError({
        message: getErrorMessage(err),
        // 429 = rate limited by Redis; show as a warning, not a credential error.
        severity: status === 429 ? 'warning' : 'error',
      });
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '32px',
        paddingBottom: '32px',
        background: 'linear-gradient(135deg, #e8eaf6 0%, #f5f6fa 50%, #e0f2f1 100%)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(57,73,171,0.12)' }}>
        <CardContent style={{ padding: isWideScreen ? '32px' : '24px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <AppsIcon color="primary" style={{ fontSize: '44px' }} />
            <Typography variant="h5" component="h1">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRegister ? 'Register to start managing records' : 'Sign in to RecordHub'}
            </Typography>
          </div>

          {sessionExpired && !serverError && (
            <Alert severity="info" style={{ marginBottom: '16px' }}>
              Your session has expired. Please sign in again.
            </Alert>
          )}
          {serverError && (
            <Alert severity={serverError.severity} style={{ marginBottom: '16px' }}>
              {serverError.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isRegister && (
                <TextField
                  label="Name"
                  value={values.name}
                  onChange={handleChange('name')}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                  autoComplete="name"
                  disabled={loading}
                  fullWidth
                />
              )}
              <TextField
                label="Email"
                type="email"
                value={values.email}
                onChange={handleChange('email')}
                error={Boolean(errors.email)}
                helperText={errors.email}
                autoComplete="email"
                autoFocus
                disabled={loading}
                fullWidth
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={handleChange('password')}
                error={Boolean(errors.password)}
                helperText={errors.password || (isRegister ? 'At least 8 characters with a letter and a number' : '')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                disabled={loading}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                fullWidth
              >
                {isRegister ? 'Create account' : 'Login'}
              </Button>
            </div>
          </form>

          <Typography variant="body2" style={{ marginTop: '24px', textAlign: 'center' }} color="text.secondary">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              component="button"
              type="button"
              onClick={() => {
                setIsRegister((r) => !r);
                setErrors({});
                setServerError(null);
              }}
              style={{ verticalAlign: 'baseline' }}
            >
              {isRegister ? 'Sign in' : 'Register'}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
