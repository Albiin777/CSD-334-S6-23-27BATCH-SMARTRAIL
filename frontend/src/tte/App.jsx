import { Routes, Route } from 'react-router-dom';
import { SmartRailProvider } from './hooks/useSmartRail';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PassengerVerify from './pages/PassengerVerify';
import SeatManagement from './pages/SeatManagement';
import IssueTicket from './pages/IssueTicket';
import WaitlistRAC from './pages/WaitlistRAC';
import FinesPenalty from './pages/FinesPenalty';
import NoShowManager from './pages/NoShowManager';
import IncidentReport from './pages/IncidentReport';
import Handover from './pages/Handover';
import Analytics from './pages/Analytics';
import Reviews from './pages/Reviews';
import Complaints from './pages/Complaints';

export default function App() {
    return (
        <SmartRailProvider>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="verify" element={<PassengerVerify />} />
                    <Route path="seats" element={<SeatManagement />} />
                    <Route path="issue-ticket" element={<IssueTicket />} />
                    <Route path="waitlist" element={<WaitlistRAC />} />
                    <Route path="fines" element={<FinesPenalty />} />
                    <Route path="noshow" element={<NoShowManager />} />
                    <Route path="incidents" element={<IncidentReport />} />
                    <Route path="handover" element={<Handover />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="reviews" element={<Reviews />} />
                    <Route path="complaints" element={<Complaints />} />

                </Route>
            </Routes>
        </SmartRailProvider>
    );
}
