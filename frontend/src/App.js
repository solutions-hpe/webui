import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = '/api';

function App() {
  const [branch, setBranch] = useState('main');
  const [configContent, setConfigContent] = useState('');
  const [simulations, setSimulations] = useState([]);
  const [arubaStatus, setArubaStatus] = useState({});
  const [showErrorsOnly, setShowErrorsOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastConfigUpdate, setLastConfigUpdate] = useState(null);
  const [lastArubaUpdate, setLastArubaUpdate] = useState(null);
  const [lastSimulationsUpdate, setLastSimulationsUpdate] = useState(null);
  const [arubaClientId, setArubaClientId] = useState('');
  const [arubaClientSecret, setArubaClientSecret] = useState('');
  const [arubaBaseUrl, setArubaBaseUrl] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchSimulations();
    fetchAruba();

    // Background updates with configurable interval
    const interval = setInterval(() => {
      fetchSimulations();
      fetchAruba();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [branch, refreshInterval]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/config/${branch}`);
      setConfigContent(res.data.content);
      setLastConfigUpdate(new Date());
    } catch (error) {
      console.error(error);
    }
  };

  const updateConfig = async () => {
    try {
      await axios.put(`${API_BASE}/config/${branch}`, {
        content: configContent,
        message: 'Updated via dashboard'
      });
      alert('Config updated!');
    } catch (error) {
      console.error(error);
    }
  };

  const clearSimulations = async () => {
    await axios.delete(`${API_BASE}/simulations`);
    setSimulations([]);
    setCurrentPage(1);
  };

  const filteredSimulations = simulations.filter(sim => {
    const hasErrors = sim.errors && sim.errors.length > 0;
    const matchesSearch = searchTerm === '' ||
      (sim.id && sim.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sim.site && sim.site.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sim.status && sim.status.toLowerCase().includes(searchTerm.toLowerCase()));
    return (!showErrorsOnly || hasErrors) && matchesSearch;
  });

  const totalPages = Math.ceil(filteredSimulations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSimulations = filteredSimulations.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchSimulations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/simulations`);
      setSimulations(res.data);
      setLastSimulationsUpdate(new Date());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAruba = async () => {
    try {
      const res = await axios.get(`${API_BASE}/aruba`);
      setArubaStatus(res.data);
      setLastArubaUpdate(new Date());
    } catch (error) {
      console.error(error);
    }
  };

  const saveCredentials = async () => {
    try {
      await axios.post(`${API_BASE}/config/update`, { key: 'ARUBA_CLIENT_ID', value: arubaClientId });
      await axios.post(`${API_BASE}/config/update`, { key: 'ARUBA_CLIENT_SECRET', value: arubaClientSecret });
      await axios.post(`${API_BASE}/config/update`, { key: 'ARUBA_BASE_URL', value: arubaBaseUrl });
      alert('Credentials saved!');
    } catch (error) {
      console.error(error);
      alert('Error saving credentials');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HPE Simulation Dashboard</h1>
        <div style={{ fontSize: '14px', marginTop: '10px' }}>
          <label>Refresh Interval: </label>
          <select value={refreshInterval} onChange={(e) => {
            const value = Number(e.target.value);
            setRefreshInterval(value);
            localStorage.setItem('refreshInterval', value);
          }}>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={600000}>10 minutes</option>
            <option value={1800000}>30 minutes</option>
          </select>
          <button onClick={refreshAllData} style={{ marginLeft: '10px' }}>Refresh Data Now</button>
        </div>
      </header>
      <main>
        <section>
          <h2>Config Editor</h2>
          {lastConfigUpdate && (
            <p style={{ fontSize: '12px', color: '#666' }}>
              Last updated: {lastConfigUpdate.toLocaleString()}
            </p>
          )}
          <label>Branch: <input value={branch} onChange={(e) => setBranch(e.target.value)} /></label>
          {branch !== 'main' ? (
            <>
              <textarea
                value={configContent}
                onChange={(e) => setConfigContent(e.target.value)}
                rows="20"
                cols="80"
                placeholder="Load a non-default branch to edit config"
              />
              <button onClick={updateConfig}>Save Config</button>
            </>
          ) : (
            <p>Configuration editing is disabled for the default branch (main). Select a different branch to edit simulation.conf.</p>
          )}
        </section>
        <section>
          <h2>Simulation Statuses</h2>
          {lastSimulationsUpdate && (
            <p style={{ fontSize: '12px', color: '#666' }}>
              Last updated: {lastSimulationsUpdate.toLocaleString()}
            </p>
          )}
          <div style={{ marginBottom: '10px' }}>
            <button onClick={clearSimulations}>Clear All Statuses</button>
            <button onClick={() => { setShowErrorsOnly(!showErrorsOnly); setCurrentPage(1); }}>
              {showErrorsOnly ? 'Show All Clients' : 'Show Errors Only'}
            </button>
            <input
              type="text"
              placeholder="Search by ID, Site, or Status..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>
          {filteredSimulations.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Tests</th>
                  <th>Current Test</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSimulations.map((sim, i) => (
                  <tr key={i}>
                    <td>{sim.id || sim.simulationId || 'N/A'}</td>
                    <td>{sim.site || sim.wsite || 'N/A'}</td>
                    <td>{sim.status || 'N/A'}</td>
                    <td>{sim.tests ? sim.tests.join(', ') : sim.runningTests || 'N/A'}</td>
                    <td>{sim.currentTest || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No simulation statuses match the current filters.</p>
          )}
          {totalPages > 1 && (
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                Previous
              </button>
              <span style={{ margin: '0 10px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          )}
        </section>
        <section>
          <h2>Aruba Central Status</h2>
          {lastArubaUpdate && (
            <p style={{ fontSize: '12px', color: '#666' }}>
              Last updated: {lastArubaUpdate.toLocaleString()}
            </p>
          )}
          <h3>API Credentials</h3>
          <label>Base URL: <input type="text" value={arubaBaseUrl} onChange={(e) => setArubaBaseUrl(e.target.value)} /></label><br />
          <label>Client ID: <input type="text" value={arubaClientId} onChange={(e) => setArubaClientId(e.target.value)} /></label><br />
          <label>Client Secret: <input type="password" value={arubaClientSecret} onChange={(e) => setArubaClientSecret(e.target.value)} /></label><br />
          <button onClick={saveCredentials}>Save Credentials</button>
          <h3>Hardware</h3>
          {arubaStatus.hardware && arubaStatus.hardware.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {arubaStatus.hardware.map((hw, i) => (
                  <tr key={i}>
                    <td>{hw.device}</td>
                    <td>{hw.status}</td>
                    <td>{hw.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No hardware data.</p>
          )}
          <h3>Alerts</h3>
          {arubaStatus.alerts && arubaStatus.alerts.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Message</th>
                  <th>Severity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {arubaStatus.alerts.map((alert, i) => (
                  <tr key={i}>
                    <td>{alert.id}</td>
                    <td>{alert.message}</td>
                    <td>{alert.severity}</td>
                    <td>{alert.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No alerts.</p>
          )}
          <button onClick={pullAruba}>Pull Aruba</button>
          <button onClick={refreshAllData} style={{ marginLeft: '10px' }}>Refresh All Data</button>
        </section>
      </main>
    </div>
  );
}

export default App;