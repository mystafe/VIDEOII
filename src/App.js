// client/src/App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from "socket.io-client";
import './App.css';
import './Spinner.css';

const Spinner = () => <div className="spinner"></div>;
const socket = io("http://localhost:5001");

function App() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [superMode, setSuperMode] = useState(false);

  const getInitialState = () => ({
    message: 'Please select a video and configure settings to begin.',
    percent: 0,
    result: '',
    error: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisType, setAnalysisType] = useState('meeting');
  const [outputLanguage, setOutputLanguage] = useState('Turkish');
  const [analysisStatus, setAnalysisStatus] = useState(getInitialState());
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState('');

  const [totalBatches, setTotalBatches] = useState(3);
  const [secondsPerBatch, setSecondsPerBatch] = useState(60);
  const [frameInterval, setFrameInterval] = useState(10);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server with Socket ID:', socket.id);
      setSocketId(socket.id);
    });
    socket.on('progressUpdate', (data) => {
      if (data.type === 'status' || data.type === 'progress') {
        setAnalysisStatus(prev => ({ ...prev, message: data.message, percent: data.percent === undefined ? prev.percent : data.percent, error: '' }));
      }
      if (data.type === 'result') {
        setAnalysisStatus(prev => ({ ...prev, message: 'Analysis complete!', result: data.data, percent: 100 }));
        setIsLoading(false);
      }
      if (data.type === 'error') {
        setAnalysisStatus(prev => ({ ...prev, message: '', error: data.message, percent: 0 }));
        setIsLoading(false);
      }
    });
    return () => { socket.off('connect'); socket.off('progressUpdate'); };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisStatus({ message: `File selected: ${file.name}. Ready to start.`, percent: 0, result: '', error: '' });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !socketId) {
      setAnalysisStatus({ ...analysisStatus, error: 'Please select a file and wait for server connection.' });
      return;
    }
    setIsLoading(true);
    setAnalysisStatus({ message: 'Uploading video...', percent: 0, result: '', error: '' });

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('analysisType', analysisType);
    formData.append('outputLanguage', outputLanguage);
    formData.append('socketId', socketId);
    formData.append('totalBatches', totalBatches);
    formData.append('secondsPerBatch', secondsPerBatch);
    formData.append('frameInterval', frameInterval);

    try {
      const response = await axios.post('http://localhost:5001/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnalysisStatus(prev => ({ ...prev, message: response.data.message }));
    } catch (error) {
      setAnalysisStatus({ ...analysisStatus, error: error.response?.data?.error || 'An upload error occurred.' });
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsLoading(false);
    setSelectedFile(null);
    setAnalysisStatus(getInitialState());
    document.getElementById('file-upload').value = '';
  };

  const handleLogoClick = () => {
    const newClickCount = logoClicks + 1;
    setLogoClicks(newClickCount);
    if (newClickCount >= 5) {
      if (!superMode) {
        setSuperMode(true);
        alert('Super Mode Activated! You can now select extended limits.');
      }
    }
  };

  const handleBatchChange = (e) => {
    let value = parseInt(e.target.value, 10);
    const max = superMode ? 10 : 3;
    if (value > max) value = max;
    if (value < 1) value = 1;
    setTotalBatches(value);
  }

  const handleSecondsChange = (e) => {
    let value = parseInt(e.target.value, 10);
    const max = superMode ? 600 : 60;
    if (value > max) value = max;
    if (value < 1) value = 1;
    setSecondsPerBatch(value);
  }

  return (
    <div className="App">
      <div className="container">
        <header className="App-header">
          <h1 onClick={handleLogoClick} style={{ cursor: 'pointer' }} title="Click me 5 times...">{superMode ? 'VIDEOII (Super Mode)' : 'VIDEOII'}</h1>
          <p>Smart Video Analysis Platform</p>
        </header>

        <main className="App-main">
          {!analysisStatus.result && !analysisStatus.error && (
            <div className="controls-card">
              <h2><span className="step-number">1</span> Configuration</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="total-batches">Total Batches {superMode && '(Max 10)'}</label>
                  <input id="total-batches" type="number" value={totalBatches} onChange={handleBatchChange} min="1" max={superMode ? "10" : "3"} disabled={isLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="seconds-per-batch">Seconds per Batch {superMode && '(Max 600)'}</label>
                  <input id="seconds-per-batch" type="number" value={secondsPerBatch} onChange={handleSecondsChange} min="10" max={superMode ? "600" : "60"} disabled={isLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="frame-interval">Frame Interval (sec)</label>
                  <input id="frame-interval" type="number" value={frameInterval} onChange={(e) => setFrameInterval(e.target.value)} min="1" disabled={isLoading} />
                </div>
                <div className="form-group">
                  <label htmlFor="analysis-type">Analysis Type</label>
                  <select id="analysis-type" value={analysisType} onChange={(e) => setAnalysisType(e.target.value)} disabled={isLoading}>
                    <option value="meeting">Meeting Analysis</option>
                    <option value="general">General Analysis</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="output-language">Report Language</label>
                  <select id="output-language" value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)} disabled={isLoading}>
                    <option value="Turkish">Turkish</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>

              <div className="upload-section">
                <h2><span className="step-number">2</span> Upload Video</h2>
                <input id="file-upload" type="file" accept="video/*" onChange={handleFileChange} disabled={isLoading} />
                <label htmlFor="file-upload" className={`upload-button ${selectedFile ? 'file-selected' : ''}`}>
                  {selectedFile ? selectedFile.name : 'Choose a video file...'}
                </label>
              </div>

              <button className="analyze-button" onClick={handleUpload} disabled={isLoading || !selectedFile}>
                {isLoading ? <Spinner /> : null}
                {isLoading ? 'Analyzing...' : 'Start Analysis'}
              </button>
            </div>
          )}

          {(isLoading || analysisStatus.result || analysisStatus.error) && (
            <div className="status-card">
              <h2><span className="step-number">3</span> Analysis Progress</h2>

              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${analysisStatus.percent}%` }}>
                </div>
              </div>
              <p className="status-message">{analysisStatus.message}</p>

              {analysisStatus.error && <p className="error-message">{analysisStatus.error}</p>}

              {analysisStatus.result && (
                <div className="result-container">
                  <h4>Analysis Report:</h4>
                  <div className="report-content">{analysisStatus.result}</div>
                </div>
              )}

              {(!isLoading) && (
                <button className="reset-button" onClick={handleReset}>
                  Start New Analysis
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;