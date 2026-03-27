import { HashRouter, Route, Routes } from 'react-router';
import { NeuroProvider } from './neuro/NeuroProvider';
import { CalibratePage } from './pages/CalibratePage';
import { HomePage } from './pages/HomePage';
import { PlayPage } from './pages/PlayPage';
import { ResultsPage } from './pages/ResultsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <NeuroProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calibrate" element={<CalibratePage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </HashRouter>
    </NeuroProvider>
  );
}
