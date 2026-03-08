import { useEffect, useRef, useState } from 'react';

function AboutSection() {
  // Discover is visible immediately
  const [visibleItems, setVisibleItems] = useState(new Set(['step-01']));
  const sectionRef = useRef(null);

  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleItems((prev) => {
            const next = new Set(prev);
            next.add(entry.target.id);
            return next;
          });
        } else {
          setVisibleItems((prev) => {
            const next = new Set(prev);
            next.delete(entry.target.id);
            return next;
          });
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    if (sectionRef.current) {
      const elements = sectionRef.current.querySelectorAll('.animate-on-scroll');
      elements.forEach((el) => observer.observe(el));
    }

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      id: 'step-01',
      number: '01',
      title: 'Discover',
      description: 'Explore optimized routes with real-time data and AI-powered travel insights.'
    },
    {
      id: 'step-02',
      number: '02',
      title: 'Personalize',
      description: 'Select seats intelligently with predictive availability and smart recommendations.'
    },
    {
      id: 'step-03',
      number: '03',
      title: 'Experience',
      description: 'Travel effortlessly with digital tickets, live tracking, and seamless updates.'
    }
  ];

  return (
    <section 
      ref={sectionRef}
      className="relative w-full pt-10 pb-24 px-4 text-white bg-transparent overflow-hidden border-t border-gray-800/20"
    >
      <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-[1fr_2fr] gap-8 lg:gap-16 items-start">
        <div className="pt-4 flex flex-col items-start translate-y-0 opacity-100 transition-all duration-1000">
          <div className="inline-block mb-1">
            <span className="text-xl md:text-2xl font-bold text-gray-400 tracking-[0.1em] uppercase">About</span>
            <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none mt-1">
              SmartRail
            </h2>
            <div className="w-12 h-1 bg-white mt-3 rounded-full"></div>
          </div>
          
          <div className="mt-8 relative group">
            {/* Subtle Watermark Logo - Positioned behind the subheader lines */}
            <img 
              src="/trainnew.png" 
              alt="SmartRail Watermark" 
              className="absolute -top-8 left-0 h-48 w-auto opacity-20 pointer-events-none transition-all duration-700 group-hover:scale-110 group-hover:opacity-30"
            />
            
            <h3 className="text-xl md:text-2xl font-bold max-w-md leading-tight text-white/90 relative z-10">
              Smart Routes. <br />
              Faster Booking. <br />
              <span className="opacity-60">Seamless Journeys.</span>
            </h3>
          </div>
        </div>

        {/* RIGHT COLUMN: REVEAL TEXT BLOCKS */}
        <div className="flex flex-col gap-8 md:pt-4">
          {steps.map((step) => (
            <div
              key={step.id}
              id={step.id}
              className={`
                animate-on-scroll transition-all duration-1000 ease-out border-b-2 border-gray-800/30 pb-8 last:border-0
                ${visibleItems.has(step.id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-28'}
              `}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-6">
                  <span className="text-4xl font-black text-white/30 w-12 shrink-0">
                    {step.number}
                  </span>
                  <h4 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {step.title}
                  </h4>
                </div>
                <p className="text-gray-200 leading-relaxed text-base md:text-lg font-medium pl-[72px]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
