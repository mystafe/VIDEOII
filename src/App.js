// client/src/App.js - NIHAI, DINAMIK YAPILANDIRMALI VE İYİLEŞTİRİLMİŞ STİL İLE

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from "socket.io-client";
import './App.css';
import './Spinner.css'; // Spinner stillerini import et

// Yükleme ikonu (spinner) için basit bir component
const Spinner = () => <div className="spinner"></div>;

// Socket bağlantısı component dışında tanımlanır, böylece her render'da yeniden oluşturulmaz.
const socket = io("http://localhost:5001");

function App() {
  // --- Yapılandırma state'leri ---
  const [totalBatches, setTotalBatches] = useState(3);
  const [secondsPerBatch, setSecondsPerBatch] = useState(60);
  const [frameInterval, setFrameInterval] = useState(10);

  // --- Mevcut state'ler ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisType, setAnalysisType] = useState('meeting');
  const [outputLanguage, setOutputLanguage] = useState('Turkish');
  const [analysisStatus, setAnalysisStatus] = useState({
    message: 'Please select a video and configure settings to begin.',
    percent: 0,
    result: '',
    error: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState('');

  // useEffect ve Socket.IO dinleyicileri
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server with Socket ID:', socket.id);
      setSocketId(socket.id);
    });

    socket.on('progressUpdate', (data) => {
      console.log('Progress Update:', data);

      if (data.type === 'status') {
        setAnalysisStatus(prev => ({ ...prev, message: data.message, error: '' }));
      }

      if (data.type === 'progress') {
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

    return () => {
      socket.off('connect');
      socket.off('progressUpdate');
    };
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

  return (
    <div className="App">
      <div className="container">
        <header className="App-header">
          <h1>VIDEOII</h1>
          <p>Smart Video Analysis Platform</p>
        </header>

        <main className="App-main">
          <div className="controls-card">
            <h2><span className="step-number">1</span> Configuration</h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="total-batches">Total Batches</label>
                <input id="total-batches" type="number" value={totalBatches} onChange={(e) => setTotalBatches(e.target.value)} disabled={isLoading} />
              </div>
              <div className="form-group">
                <label htmlFor="seconds-per-batch">Seconds per Batch</label>
                <input id="seconds-per-batch" type="number" value={secondsPerBatch} onChange={(e) => setSecondsPerBatch(e.target.value)} disabled={isLoading} />
              </div>
              <div className="form-group">
                <label htmlFor="frame-interval">Frame Interval (sec)</label>
                <input id="frame-interval" type="number" value={frameInterval} onChange={(e) => setFrameInterval(e.target.value)} disabled={isLoading} />
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
                  <pre>{analysisStatus.result}</pre>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;