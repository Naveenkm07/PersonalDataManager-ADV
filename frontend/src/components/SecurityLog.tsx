import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import SecurityService from '../services/SecurityService';

interface SecurityLogEntry {
  id: string;
  timestamp: string;
  type: 'login' | 'logout' | '2fa' | 'password_change' | 'security_settings' | 'secure_note';
  status: 'success' | 'failure';
  details: string;
  ip?: string;
}

const SecurityLog: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const securityService = SecurityService.getInstance();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    const securityLogs = securityService.getSecurityLogs();
    setLogs(securityLogs);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'success' : 'error';
  };

  const getTypeColor = (type: string) => {
    const typeColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      login: 'primary',
      logout: 'secondary',
      '2fa': 'info',
      password_change: 'warning',
      security_settings: 'default',
      secure_note: 'info'
    };
    return typeColors[type] || 'default';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Security Log
      </Typography>
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>IP Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.type}
                        color={getTypeColor(log.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        color={getStatusColor(log.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{log.details}</TableCell>
                    <TableCell>{log.ip || 'N/A'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={logs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default SecurityLog; 