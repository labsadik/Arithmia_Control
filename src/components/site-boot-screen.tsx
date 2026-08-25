"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://ik.imagekit.io/xvqovhmcyr/arithmia-removebg-preview.png";

const SPLASH_DURATION = 3000;
const EXIT_DURATION = 500;

export function SiteBootScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    let animationFrameId = 0;
    let startTime: number | null = null;

    document.documentElement.classList.add("website-loading");
    document.body.classList.add("website-loading");

    /*
     * ------------------------------------------------------
     * 3 SECOND SMOOTH LOADER
     * ------------------------------------------------------
     */

    const animateProgress = (timestamp: number) => {
      if (!mounted) return;

      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      const rawProgress = Math.min(
        elapsed / SPLASH_DURATION,
        1,
      );

      // Smooth ease-out
      const easedProgress =
        1 - Math.pow(1 - rawProgress, 3);

      setProgress(easedProgress * 100);

      if (rawProgress < 1) {
        animationFrameId =
          requestAnimationFrame(animateProgress);
      }
    };

    animationFrameId =
      requestAnimationFrame(animateProgress);

    /*
     * ------------------------------------------------------
     * CLOSE AFTER 3 SECONDS
     * ------------------------------------------------------
     */

    const closeTimer = window.setTimeout(() => {
      if (!mounted) return;

      setProgress(100);
      setClosing(true);

      window.setTimeout(() => {
        if (!mounted) return;

        setShowSplash(false);

        document.documentElement.classList.remove(
          "website-loading",
        );

        document.body.classList.remove(
          "website-loading",
        );
      }, EXIT_DURATION);
    }, SPLASH_DURATION);

    return () => {
      mounted = false;

      window.clearTimeout(closeTimer);
      cancelAnimationFrame(animationFrameId);

      document.documentElement.classList.remove(
        "website-loading",
      );

      document.body.classList.remove(
        "website-loading",
      );
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

        .signature-path {
          fill: transparent;
          stroke: rgba(15, 23, 42, 0.9);
          stroke-width: 1;
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation:
            signDraw 2s ease-in-out forwards,
            fillIn 0.4s 2s forwards;
        }

        .underline-path {
          fill: transparent;
          stroke: rgba(15, 23, 42, 0.9);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation:
            drawUnderline 0.7s 2.2s ease-out forwards;
        }

        @keyframes signDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fillIn {
          to {
            fill: rgba(15, 23, 42, 0.95);
          }
        }

        @keyframes drawUnderline {
          to {
            stroke-dashoffset: 0;
          }
        }

        .website-loader {
          background:
            radial-gradient(
              circle at center,
              rgba(239, 246, 255, 1) 0%,
              rgba(248, 250, 252, 1) 48%,
              rgba(255, 255, 255, 1) 100%
            );
        }

        .website-loader-content {
          transition:
            opacity 500ms ease,
            transform 500ms ease;
        }

        .website-loader-content-exiting {
          opacity: 0;
          transform: scale(1.035);
        }

        .website-loader.is-exiting {
          pointer-events: none;
          animation: loaderExit 500ms ease forwards;
        }

        @keyframes loaderExit {
          from {
            opacity: 1;
          }

          to {
            opacity: 0;
          }
        }

        .website-loader-logo {
          animation:
            logoEnter 750ms
            cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        @keyframes logoEnter {
          0% {
            opacity: 0;
            transform: scale(0.88);
            filter: blur(8px);
          }

          70% {
            opacity: 1;
            transform: scale(1.03);
            filter: blur(0);
          }

          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        .website-loader-grid {
          background-image:
            linear-gradient(
              to right,
              rgba(37, 99, 235, 0.055) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(37, 99, 235, 0.055) 1px,
              transparent 1px
            );

          background-size: 42px 42px;
        }

        html.website-loading,
        body.website-loading {
          overflow: hidden !important;
          width: 100%;
          height: 100%;
        }

        @media (prefers-reduced-motion: reduce) {
          .website-loader-logo,
          .signature-path,
          .underline-path {
            animation: none !important;
          }

          .website-loader-content {
            transition: none !important;
          }
        }
      `}</style>

      {children}

      {showSplash && (
        <div
          className={cn(
            "website-loader fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden",
            closing && "is-exiting",
          )}
          aria-label="Loading Application"
          role="status"
        >
          {/* Background grid */}
          <div className="website-loader-grid absolute inset-0 opacity-60" />

          {/* Soft background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-[100px]" />
          </div>

          {/* Main content */}
          <div
            className={cn(
              "website-loader-content relative z-10 flex w-full flex-col items-center justify-center px-6",
              closing &&
                "website-loader-content-exiting",
            )}
          >
            {/* Logo */}
            <div className="flex items-center justify-center">
              <img
                src={LOGO_URL}
                alt="Logo"
                className="website-loader-logo h-52 w-52 object-contain sm:h-60 sm:w-60 md:h-64 md:w-64"
                draggable={false}
              />
            </div>

            {/* Developer */}
            <div className="mt-1 flex flex-col items-center">
              <span className="mb-0.5 text-[10px] font-light uppercase tracking-[0.4em] text-slate-500">
                Developed by
              </span>

              <svg
                width="400"
                height="75"
                viewBox="0 0 400 75"
                className="max-w-[90vw] overflow-visible"
              >
                <text
                  x="200"
                  y="38"
                  textAnchor="middle"
                  fontFamily="'Great Vibes', cursive"
                  fontSize="42"
                  className="signature-path"
                >
                  Swastik Naskar
                </text>

                <path
                  d="M 80 48 Q 200 62 320 48"
                  className="underline-path"
                />
              </svg>
            </div>

            {/* Loader */}
            <div className="mt-2 w-80 max-w-[80vw]">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.75)]"
                  style={{
                    width: `${progress}%`,
                    willChange: "width",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}