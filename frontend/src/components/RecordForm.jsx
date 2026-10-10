import { useState } from 'react';
import { Alert, Button, CircularProgress, Grid, MenuItem, TextField, useMediaQuery } from '@mui/material';
import { validateRecord } from '../utils/validation';

const DEPARTMENTS = ['Engineering', 'Data', 'Product', 'Design', 'Operations', 'Sales', 'Marketing', 'HR'];

const EMPTY = { name: '', email: '', age: '', department: '', description: '' };

// Two columns on desktop (md+), one stacked column on mobile — via Grid `size`.
// The form clears itself after a successful save.
export default function RecordForm({ onSave }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const isMobile = useMediaQuery('(max-width:599.95px)');

  const handleChange = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateRecord(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      await onSave({
        name: values.name.trim(),
        email: values.email.trim(),
        age: Number(values.age),
        department: values.department,
        description: values.description.trim(),
      });
      setValues(EMPTY);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const bindField = (field) => ({
    value: values[field],
    onChange: handleChange(field),
    error: Boolean(errors[field]),
    helperText: errors[field] || ' ',
    fullWidth: true,
    disabled: submitting,
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <Alert severity="error" style={{ marginBottom: '16px' }}>
          {serverError}
        </Alert>
      )}
      <Grid container columnSpacing={2} rowSpacing={1}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Name" required {...bindField('name')} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Email" type="email" required {...bindField('email')} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Age" type="number" required {...bindField('age')} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Department" select required {...bindField('department')}>
            {DEPARTMENTS.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            label="Description"
            multiline
            minRows={3}
            {...bindField('description')}
          />
        </Grid>
      </Grid>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          style={{ width: isMobile ? '100%' : 'auto', minWidth: '140px' }}
        >
          Save
        </Button>
      </div>
    </form>
  );
}
