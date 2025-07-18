import { useEffect, useRef } from 'react';

const LeafAnimation = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create leaves
    const leafCount = 12;
    const leaves = [];

    for (let i = 0; i < leafCount; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      
      // Random properties
      const size = Math.random() * 20 + 10;
      const posX = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = Math.random() * 10 + 10;
      const rotation = Math.random() * 360;
      
      leaf.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${posX}%;
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        transform: rotate(${rotation}deg);
        opacity: ${Math.random() * 0.7 + 0.3};
      `;
      
      // Random leaf shape
      leaf.innerHTML = `
        <svg viewBox="0 0 100 100">
          <path d="M50 0
                  C70 20, 90 40, 80 60
                  C70 80, 30 85, 20 60
                  C10 35, 30 20, 50 0
                  Z" 
                fill="currentColor"/>
        </svg>
      `;
      
      container.appendChild(leaf);
      leaves.push(leaf);
    }

    // Mouse move interaction
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      leaves.forEach(leaf => {
        const rect = leaf.getBoundingClientRect();
        const x = rect.left + rect.width/2;
        const y = rect.top + rect.height/2;
        const distance = Math.sqrt.Math.pow(clientX - x, 2) + Math.pow(clientY - y, 2)
        
        if (distance < 150) {
          const angle = Math.atan2(clientY - y, clientX - x);
          leaf.style.transform = `translate(${Math.cos(angle) * 5}px, ${Math.sin(angle) * 5}px) rotate(${angle}rad)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="leaf-container fixed right-0 top-0 h-full w-1/4 pointer-events-none"
    />
  );
};

// Add this CSS to your styles:
/*

*/

export default LeafAnimation