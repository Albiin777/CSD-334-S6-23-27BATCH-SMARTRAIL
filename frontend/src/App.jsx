import { useState, useEffect } from "react";
import "./App.css";

import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import MiniFooter from "./components/common/MiniFooter";
import Hero from "./components/Hero";
import BookingCard from "./components/Bookingcaard";
import TrainSchedule from "./components/TrainSchedule";
import Pnrstatus from "./components/Pnrstatus";   // ✅ CORRECT
import Auth from "./components/Auth";
import Support from "./pages/Support";
import Results from "./pages/Results";
import Reviews from "./components/Reviews";
import PassengerDetails from "./pages/PassengerDetails";

import AdminDashboard from "./pages/AdminDashboard";
import AdminTrainView from "./pages/AdminTrainView";
import TTEPage from "./pages/TTEPage";
import AllNotifications from "./pages/AllNotifications";

import TrainManagement from "./pages/admin/TrainManagement";
import StationManagement from "./pages/admin/StationManagement";
import TteManagement from "./pages/admin/TteManagement";
import DutyAssignments from "./pages/admin/DutyAssignments";
import ScheduleManagement from "./pages/admin/ScheduleManagement";
import AdminReports from "./pages/admin/AdminReports";
import SeatManagement from "./pages/admin/SeatManagement";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminNotifications from "./pages/admin/AdminNotifications";
import FareEditor from "./pages/admin/FareEditor";

import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import SeatLayout from "./pages/SeatLayout";
import PaymentGateway from "./pages/PaymentGateway";
import AdminLayout from "./layouts/AdminLayout";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
// Keep existing pages
import MyAccount from "./pages/MyAccount";
import MyBookings from "./pages/MyBookings";
import AboutSection from "./components/AboutSection";

import { supabase } from "./utils/supabaseClient";

/* ==================== Icon Components ==================== */
function SearchIcon({ size = 20, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

const CalendarIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SwapIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 3L4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
);

const TrainIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4" y="3" width="16" height="16" rx="2" />
    <path d="M4 11h16" />
    <path d="M12 3v8" />
    <path d="m8 19-2 3" />
    <path d="m18 22-2-3" />
    <path d="M8 15h0" />
    <path d="M16 15h0" />
  </svg>
);

const MapPinIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const UsersIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/* ==================== Main App Component ==================== */
export default function App() {
  const [theme] = useState("dark");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchMode, setSearchMode] = useState("route");
  const [hidden, setHidden] = useState(false);

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Form States
  const [trainNameNumber, setTrainNameNumber] = useState("");
  const [fromStation, setFromStation] = useState("");
  const [toStation, setToStation] = useState("");
  const [date, setDate] = useState("");
  const [classType, setClassType] = useState("AC 3 Tier");
  const [passengers, setPassengers] = useState("1");

  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  const isMiniFooterPage =
    location.pathname.startsWith('/seat-layout') ||
    location.pathname.startsWith('/payment') ||
    location.pathname.startsWith('/results') ||
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/my-account') ||
    location.pathname.startsWith('/my-bookings') ||
    location.pathname.startsWith('/passenger-details') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/tte');

  const swapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const handleSearch = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 700);
    console.log("Searching...", {
      searchMode,
      trainNameNumber,
      fromStation,
      toStation,
      date,
      classType,
      passengers,
    });
  };

  // ✅ Supabase auth state listener
  useEffect(() => {
    // Check for explicit logout from another app (like TTE portal)
    const params = new URLSearchParams(window.location.search);
    const isLogout = params.get('logout') === 'true';

    if (isLogout) {
      supabase.auth.signOut().then(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        // Clean up the URL without a full page reload so it doesn't loop
        window.history.replaceState({}, document.title, "/");
      });
      return; // Exit early so we don't process further auth steps on this mount
    }

    // Check for existing session (only if NOT explicitly logging out)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      
      const validAdmins = ['admin@gmail.com', 'hashlinairah@gmail.com'];
      const validTtes = ['binthalhamza@gmail.com', 'raishahashly15@gmail.com'];
      const email = session?.user?.email?.toLowerCase() || "";

      if (validAdmins.includes(email)) {
        navigate('/admin');
      } else if (validTtes.includes(email) || email.includes('tte')) {
        navigate('/tte');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If we are actively in the middle of logging out, don't trigger the login redirect
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }

      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        const validAdmins = ['admin@gmail.com', 'hashlinairah@gmail.com'];
        const validTtes = ['binthalhamza@gmail.com', 'raishahashly15@gmail.com'];
        const email = session?.user?.email?.toLowerCase() || "";

        if (validAdmins.includes(email)) {
          navigate('/admin');
        } else if (validTtes.includes(email) || email.includes('tte')) {
          navigate('/tte');
        } else {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ensure landing at top (hero) on every page load — do not restore previous scroll.
  useEffect(() => {
    // 1. Force manual scroll restoration to prevent browser from remembering scroll position
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 2. Immediate scroll to top
    window.scrollTo(0, 0);

    // 3. Removed global reload redirect so that specific pages can handle their own recovery / session storage via React Router state.
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] relative">
      <Header user={user} isAuthLoading={isAuthLoading} onLoginClick={() => setIsAuthOpen(true)} />

      {isAuthOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Auth onClose={() => setIsAuthOpen(false)} />
        </div>
      )}

      <div className={`min-h-screen flex flex-col ${isMiniFooterPage ? '' : 'pt-[70px]'}`}>
        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Hero />
                  <BookingCard />
                  <TrainSchedule />
                  <div id="pnr-section" className="scroll-mt-[140px]">
                    <Pnrstatus />
                  </div>
                  <div id="reviews-section" className="scroll-mt-[140px]">
                    <Reviews />
                  </div>
                  <Support autoScroll={false} />
                  <div id="about-section" className="scroll-mt-[120px]">
                    <AboutSection />
                  </div>
                </>
              }
            />

            <Route path="/results" element={<Results />} />
            <Route path="/seat-layout/:trainNumber/:classType" element={<SeatLayout />} />
            <Route path="/passenger-details" element={<PassengerDetails />} />
            <Route path="/payment" element={<PaymentGateway />} />
            <Route path="/notifications" element={<AllNotifications />} />
            <Route path="/my-account" element={<MyAccount />} /> {/* Added new route */}
            <Route path="/my-bookings" element={<MyBookings />} /> {/* Added new route */}

            {/* TTE Route */}
              <Route path="/tte/*" element={<TTEPage />} />
            {/* --- Admin Portal (Nested Routes) --- */}
            <Route path="/admin" element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="trains" element={<TrainManagement />} />
              <Route path="seats" element={<SeatManagement />} />
              <Route path="stations" element={<StationManagement />} />
              <Route path="ttes" element={<TteManagement />} />
              <Route path="assignments" element={<DutyAssignments />} />
              <Route path="fares" element={<FareEditor />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="schedules" element={<ScheduleManagement />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="train/:trainNumber" element={<AdminTrainView />} />
            </Route>
          </Routes>
        </main>
      </div>

      {isMiniFooterPage ? <MiniFooter /> : <Footer />}
    </div>
  );
}

