import { FaLeaf } from 'react-icons/fa';
import { useEffect, useState } from 'react';

const LeafLoader = ({ size = 70, color = '#16a34a' /* green-600 */ }) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const animate = () => {
      setRotation(prev => (prev + 2) % 360); // Adjust speed by changing increment value
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Center circle (optional) */}
      <div 
        className="absolute rounded-full bg-green-500"
        style={{ 
          width: size * 0.2, 
          height: size * 0.2,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      {/* Rotating leaves */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute origin-center"
          style={{
            transform: `rotate(${i * 45}deg) translate(0, -${size * 0.35}px) rotate(${-rotation}deg)`,
            color,
            fontSize: size * 0.25
          }}
        >
          <FaLeaf 
            style={{
              transform: `rotate(${i % 2 === 0 ? 25 : -25}deg)`, // Alternating leaf angles
              opacity: 0.7 + (i % 3) * 0.1 // Subtle opacity variation
            }} 
          />
        </div>
      ))}
    </div>
  );
};

export default LeafLoader;