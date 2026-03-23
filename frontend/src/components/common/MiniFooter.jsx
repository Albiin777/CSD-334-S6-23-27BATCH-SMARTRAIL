export default function MiniFooter() {
    return (
        <div className="w-full text-center py-4 text-gray-500 text-[10px] md:text-xs mt-4">
            <p className="font-medium tracking-wide">© {new Date().getFullYear()} SmartRail • Intelligent Booking • Smart Travel</p>
        </div>
    );
}
