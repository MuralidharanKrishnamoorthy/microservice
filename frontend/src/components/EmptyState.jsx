import { Box, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/InboxOutlined';

export default function EmptyState({ title, description, action }) {
  return (
    <Box style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' }}>
      <InboxIcon style={{ fontSize: '56px', color: 'rgba(0, 0, 0, 0.38)' }} />
      <Typography variant="h6" style={{ marginTop: '8px' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" style={{ marginTop: '4px', marginBottom: '16px' }}>
        {description}
      </Typography>
      {action}
    </Box>
  );
}
