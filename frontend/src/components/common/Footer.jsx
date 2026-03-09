import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";
import { useEffect, useState } from "react";
import { auth } from "../../utils/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";

function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <footer className="mt-auto bg-[#2B2B2B] text-[#FFFFFF] px-6 sm:px-8 pt-12 pb-6">
      <div className="max-w-[1200px] mx-auto">

        {/* BRAND */}
        <div className="text-center mb-12 border-b border-[#B3B3B3]/30 pb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-wide">
            SmartRail
          </h2>

          <p className="text-sm text-[#D4D4D4] mt-2">
            Intelligent Booking • Smart Travel
          </p>

          <p className="text-sm text-[#B3B3B3] max-w-[400px] mx-auto mt-4 leading-relaxed">
            Your smart choice for train travel. Real-time updates and seamless booking experience.
          </p>
        </div>

        {/* NAVIGATION GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 text-center sm:text-left mb-12">

          {/* QUICK ACCESS */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-[#D4D4D4] uppercase tracking-wider">
              Quick Access
            </h3>
            <div className="w-10 h-[2px] bg-[#B3B3B3]/60 mt-2 mb-4 mx-auto sm:mx-0"></div>

            <ul className="space-y-3 text-sm text-[#B3B3B3]">
              <li><a href="/" className="hover:text-white transition">Home</a></li>
              <li><a href="/#about-section" className="hover:text-white transition">About SmartRail</a></li>
              <li><a href="/#schedule-section" className="hover:text-white transition">Check Schedule</a></li>
              <li><a href="/#pnr-section" className="hover:text-white transition">PNR Status</a></li>
              <li><a href="/#support-section" className="hover:text-white transition">Contact Us</a></li>
            </ul>
          </div>

          {/* ACCOUNT */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-[#D4D4D4] uppercase tracking-wider">
              My Account
            </h3>
            <div className="w-10 h-[2px] bg-[#B3B3B3]/60 mt-2 mb-4 mx-auto sm:mx-0"></div>

            <ul className="space-y-3 text-sm text-[#B3B3B3]">
              {isLoggedIn ? (
                <>
                  <li><a href="/my-account" className="hover:text-white transition">My Account</a></li>
                  <li><a href="/notifications" className="hover:text-white transition">Notifications</a></li>
                  <li><a href="/my-bookings" className="hover:text-white transition">My Bookings</a></li>
                </>
              ) : (
                <>
                  <li><span className="cursor-default">My Account</span></li>
                  <li><span className="cursor-default">Notifications</span></li>
                  <li><span className="cursor-default">My Bookings</span></li>
                </>
              )}
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-[#D4D4D4] uppercase tracking-wider">
              Need Help?
            </h3>
            <div className="w-10 h-[2px] bg-[#B3B3B3]/60 mt-2 mb-4 mx-auto sm:mx-0"></div>

            <div className="space-y-4">
              <div className="bg-[#B3B3B3]/10 rounded-lg p-4">
                <p className="text-xs text-[#B3B3B3]">24/7 Helpline</p>
                <p className="text-sm font-semibold mt-1">1800-SMART-RAIL</p>
              </div>

              <div className="bg-[#B3B3B3]/10 rounded-lg p-4">
                <p className="text-xs text-[#B3B3B3]">Email Support</p>
                <p className="text-sm font-semibold mt-1">support@smartrail.com</p>
              </div>
            </div>
          </div>

        </div>

        {/* SOCIAL + COPYRIGHT */}
        <div className="border-t border-[#B3B3B3]/30 pt-6 text-center">

          <div className="flex justify-center gap-6 mb-6">
            <a
              href="https://facebook.com"
              aria-label="Facebook"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#B3B3B3]/10 hover:bg-[#D4D4D4] hover:text-[#2B2B2B] transition"
            >
              <FaFacebookF size={16} />
            </a>

            <a
              href="https://twitter.com"
              aria-label="Twitter"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#B3B3B3]/10 hover:bg-[#D4D4D4] hover:text-[#2B2B2B] transition"
            >
              <FaTwitter size={16} />
            </a>

            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#B3B3B3]/10 hover:bg-[#D4D4D4] hover:text-[#2B2B2B] transition"
            >
              <FaInstagram size={16} />
            </a>
          </div>

          <p className="text-xs sm:text-sm text-[#B3B3B3]">
            © 2026 SmartRail. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
