import { Box, Typography } from '@mui/material'
import { CreateButton } from 'react-admin'

const EmptyState = () => (
  <Box
    sx={{
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      justifyContent: 'center',
      minHeight: 240,
      textAlign: 'center',
    }}
  >
    <Typography color="text.secondary" variant="h6">
      No payment requests yet.
    </Typography>
    <CreateButton label="Create Request" />
  </Box>
)

export default EmptyState
