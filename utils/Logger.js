let logs = [];

const Logger = {
  log: (message) => {
    const logEntry = { timestamp: new Date().toISOString(), message };
    logs.push(logEntry);
    console.log(logEntry);
  },
  getLogs: () => logs,
  clearLogs: () => {
    logs = [];
  },
};

export default Logger;
