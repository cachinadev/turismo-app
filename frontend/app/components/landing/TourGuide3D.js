'use client';

import { useEffect, useRef, useState } from 'react';

export default function TourGuide3D() {
  const guideRef = useRef(null);
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {

    setIsWaving(true);
    const timer = setTimeout(() => setIsWaving(false), 2000);

    const handleMouseMove = (e) => {
      const pupils = document.querySelectorAll('.pupil');
      pupils.forEach(pupil => {
        const eye = pupil.parentElement;
        if (!eye) return;
        
        const eyeRect = eye.getBoundingClientRect();
        const eyeCenterX = eyeRect.left + eyeRect.width / 2;
        const eyeCenterY = eyeRect.top + eyeRect.height / 2;
        
        const deltaX = e.clientX - eyeCenterX;
        const deltaY = e.clientY - eyeCenterY;
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.min(5, Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 20);
        
        const pupilX = Math.cos(angle) * distance;
        const pupilY = Math.sin(angle) * distance;
        
        pupil.style.transform = `translate(calc(-50% + ${pupilX}px), calc(-50% + ${pupilY}px))`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={guideRef} className="relative w-full max-w-md mx-auto">
      <div className="relative bg-gradient-to-br from-slate-50 via-white to-white rounded-3xl p-8 shadow-xl border border-white/60">
        

        <div className="relative z-10 space-y-6">
          

          <div className="flex justify-center">
            <div className="relative">
              <div className="relative animate-[gentle-float_4s_ease-in-out_infinite]">
                

                <div className="relative w-28 h-32 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 rounded-[45%_45%_50%_50%] shadow-lg border-2 border-amber-200/30">
                  

                  <div className="absolute -top-2 left-5 w-4 h-12 bg-gradient-to-b from-amber-100 to-amber-50 rounded-t-full shadow-md -rotate-12 border border-amber-200/40" />
                  <div className="absolute -top-2 right-5 w-4 h-12 bg-gradient-to-b from-amber-100 to-amber-50 rounded-t-full shadow-md rotate-12 border border-amber-200/40" />
                  

                  <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-2">
                    <div className="eye-container relative w-8 h-10 bg-white rounded-full shadow-inner border border-gray-200">
                      <div className="pupil absolute w-4 h-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-200" />
                      <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-80" />
                      <div className="absolute bottom-3 left-2 w-1 h-1 bg-white/50 rounded-full" />
                    </div>
                    <div className="eye-container relative w-8 h-10 bg-white rounded-full shadow-inner border border-gray-200">
                      <div className="pupil absolute w-4 h-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-200" />
                      <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-80" />
                      <div className="absolute bottom-3 left-2 w-1 h-1 bg-white/50 rounded-full" />
                    </div>
                  </div>
                  

                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-10 bg-gradient-to-b from-white to-orange-50 rounded-[50%_50%_60%_60%] shadow-sm">
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-3 bg-gray-700 rounded-full" />
                    <svg className="absolute bottom-0 left-1/2 -translate-x-1/2" width="24" height="12" viewBox="0 0 24 12">
                      <path d="M 2 2 Q 12 8 22 2" stroke="#4B5563" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="absolute bottom-8 left-1 w-5 h-3 bg-pink-200/40 rounded-full blur-[2px]" />
                  <div className="absolute bottom-8 right-1 w-5 h-3 bg-pink-200/40 rounded-full blur-[2px]" />
                </div>


                <div className="relative w-16 h-6 mx-auto bg-gradient-to-b from-amber-100 to-amber-50 shadow-sm" />


                <div className="relative w-32 h-28 mx-auto bg-gradient-to-br from-[#0086C0]/90 to-[#0E374A]/90 rounded-2xl shadow-lg border-2 border-white/40">
                  

                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-5 bg-gradient-to-b from-[#0E374A] to-transparent rounded-b-lg" />
                  

                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24">
                    <div className="bg-white/95 rounded-lg p-2 shadow-md border border-blue-100">
                      <div className="text-center">
                        <div className="text-xs font-black bg-gradient-to-r from-[#0086C0] to-[#0E374A] bg-clip-text text-transparent">
                          VICUÑA
                        </div>
                        <div className="text-[8px] text-[#A3B117] font-bold">ADVENTURES</div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 w-6 h-6 bg-white/20 rounded-md border border-white/30" />
                  
                  <div className="absolute bottom-3 right-3 w-6 h-6 bg-[#A3B117] rounded-full flex items-center justify-center shadow-md border border-yellow-200">
                    <span className="text-xs">⭐</span>
                  </div>
                </div>

                {isWaving && (
                  <div className="absolute top-16 -right-10 w-8 h-16 bg-gradient-to-b from-amber-100 to-amber-50 rounded-full shadow-md animate-[wave_0.6s_ease-in-out_4] origin-top border border-amber-200/30">
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xl">👋</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-blue-100">
              <h3 className="text-xl font-bold text-[#0E374A] mb-2" style={{ fontFamily: "'Bree Serif', serif" }}>
                ¡Hola, Soy Tu Guía! 🦙
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Experto local certificado listo para mostrarte
                <span className="text-[#0086C0] font-semibold block mt-1">
                  ¡Lo mejor del Perú auténtico!
                </span>
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <span className="text-xs bg-gradient-to-r from-[#A3B117] to-yellow-400 text-white px-4 py-2 rounded-full font-bold shadow-sm">
              🏆 Certificado
            </span>
            <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-sm">
              ✓ Seguro
            </span>
            <span className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full font-bold shadow-sm">
              ⭐ Top Rated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}