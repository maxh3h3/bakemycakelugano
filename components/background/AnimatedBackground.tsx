'use client';

import { motion } from 'framer-motion';

/**
 * AnimatedBackground Component
 * 
 * Creates an elegant background with animated SVG lines that:
 * - Curl and swirl organically using bezier curves
 * - Grow from their origin then contract (rubber-band effect)
 * - Use spring physics for natural motion
 * - Layer multiple lines at different speeds for depth
 */
export default function AnimatedBackground() {
  // Define multiple curved paths that swirl across the screen
  const paths = [
    {
      // Top-left flowing curve
      d: "M -100 -100 Q 200 100, 400 50 T 900 200 Q 1200 300, 1500 100",
      color: "#f4e4d4",
      opacity: 0.15,
      duration: 8,
      delay: 0,
    },
    {
      // Right-side swirl
      d: "M 1600 -50 Q 1400 200, 1300 400 T 1200 800 Q 1100 1000, 1400 1200",
      color: "#e8d4c4",
      opacity: 0.12,
      duration: 10,
      delay: 1,
    },
    {
      // Bottom wave
      d: "M -100 900 Q 300 850, 500 900 T 1000 850 Q 1300 900, 1600 850",
      color: "#d4c4b4",
      opacity: 0.1,
      duration: 12,
      delay: 2,
    },
    {
      // Center spiral
      d: "M 800 -100 Q 700 200, 600 400 T 500 800 Q 450 1000, 700 1100",
      color: "#c8a882",
      opacity: 0.08,
      duration: 15,
      delay: 3,
    },
    {
      // Left-side elegant curve
      d: "M -50 400 Q 150 350, 300 400 T 600 500 Q 800 550, 1000 500",
      color: "#d4a882",
      opacity: 0.1,
      duration: 9,
      delay: 1.5,
    },
    {
      // Diagonal swirl from top-right
      d: "M 1500 50 Q 1200 150, 900 300 T 400 600 Q 200 750, 100 900",
      color: "#e4c4a4",
      opacity: 0.13,
      duration: 11,
      delay: 2.5,
    },
  ];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-br from-white via-cream-50/30 to-brown-50/20">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 1024"
      >
        {paths.map((path, index) => (
          <motion.path
            key={index}
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity={path.opacity}
            initial={{ pathLength: 0, pathOffset: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              pathOffset: [0, 0, 1],
            }}
            transition={{
              duration: path.duration,
              repeat: Infinity,
              delay: path.delay,
              ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for organic feel
              times: [0, 0.5, 1], // Grow to full, then contract
            }}
          />
        ))}

        {/* Additional decorative short strokes that pulse */}
        {[...Array(8)].map((_, i) => {
          const x = (i * 200) + 100;
          const y = (i % 2 === 0 ? 150 : 700) + (i * 50);
          
          return (
            <motion.circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r="2"
              fill="#c8a882"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.3, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Rubber-band effect lines - these stretch and contract more dramatically */}
        <motion.path
          d="M 200 600 Q 400 550, 600 600 T 1000 600"
          fill="none"
          stroke="#e8d4c4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity={0.15}
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: [0, 1, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.6, 1],
            delay: 0.5,
          }}
        />

        <motion.path
          d="M 800 200 Q 950 250, 1100 200 T 1400 180"
          fill="none"
          stroke="#d4c4b4"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity={0.12}
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: [0, 1, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            delay: 1.2,
          }}
        />
      </svg>

      {/* Subtle radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-white/40" />
    </div>
  );
}
