import React, { useEffect, useRef } from 'react';

const LiquidEther = ({
  colors = ['#10b981', '#059669', '#047857'],
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  resolution = 0.5,
  isBounce = false,
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 3000,
  autoRampDuration = 0.6,
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Fluid simulation state
    const gridSize = Math.floor(Math.max(width, height) * resolution);
    const cellSize = Math.max(width, height) / gridSize;
    
    let velocityX = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    let velocityY = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    let density = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    let mouseX = width / 2;
    let mouseY = height / 2;
    let prevMouseX = mouseX;
    let prevMouseY = mouseY;
    let isMouseDown = false;
    
    let autoX = width / 2;
    let autoY = height / 2;
    let autoAngle = 0;
    let lastInteraction = Date.now();
    let isAutoMode = autoDemo;

    // Mouse event handlers
    const handleMouseMove = (e) => {
      prevMouseX = mouseX;
      prevMouseY = mouseY;
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastInteraction = Date.now();
      isAutoMode = false;
    };

    const handleMouseDown = () => {
      isMouseDown = true;
      lastInteraction = Date.now();
      isAutoMode = false;
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    // Fluid simulation functions
    const addForce = (x, y, dx, dy, radius) => {
      const gridX = Math.floor(x / cellSize);
      const gridY = Math.floor(y / cellSize);
      const gridRadius = Math.floor(radius / cellSize);

      for (let i = -gridRadius; i <= gridRadius; i++) {
        for (let j = -gridRadius; j <= gridRadius; j++) {
          const nx = gridX + i;
          const ny = gridY + j;
          
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            const distance = Math.sqrt(i * i + j * j);
            if (distance < gridRadius) {
              const force = (1 - distance / gridRadius) * mouseForce;
              velocityX[nx][ny] += dx * force;
              velocityY[nx][ny] += dy * force;
              density[nx][ny] += force * 0.5;
            }
          }
        }
      }
    };

    const diffuse = (arr, diff) => {
      const a = diff * gridSize * gridSize;
      const newArr = arr.map(row => [...row]);
      
      for (let k = 0; k < 4; k++) {
        for (let i = 1; i < gridSize - 1; i++) {
          for (let j = 1; j < gridSize - 1; j++) {
            newArr[i][j] = (arr[i][j] + a * (
              newArr[i-1][j] + newArr[i+1][j] +
              newArr[i][j-1] + newArr[i][j+1]
            )) / (1 + 4 * a);
          }
        }
      }
      
      return newArr;
    };

    const advect = (arr, vx, vy) => {
      const newArr = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
      
      for (let i = 1; i < gridSize - 1; i++) {
        for (let j = 1; j < gridSize - 1; j++) {
          let x = i - vx[i][j];
          let y = j - vy[i][j];
          
          x = Math.max(0.5, Math.min(gridSize - 1.5, x));
          y = Math.max(0.5, Math.min(gridSize - 1.5, y));
          
          const i0 = Math.floor(x);
          const j0 = Math.floor(y);
          const i1 = i0 + 1;
          const j1 = j0 + 1;
          
          const sx = x - i0;
          const sy = y - j0;
          
          newArr[i][j] = 
            (1 - sx) * ((1 - sy) * arr[i0][j0] + sy * arr[i0][j1]) +
            sx * ((1 - sy) * arr[i1][j0] + sy * arr[i1][j1]);
        }
      }
      
      return newArr;
    };

    // Animation loop
    const animate = () => {
      // Check if we should resume auto mode
      if (autoDemo && !isAutoMode && Date.now() - lastInteraction > autoResumeDelay) {
        isAutoMode = true;
      }

      // Auto demo movement
      if (isAutoMode) {
        autoAngle += autoSpeed * 0.02;
        autoX = width / 2 + Math.cos(autoAngle) * width * 0.3;
        autoY = height / 2 + Math.sin(autoAngle * 1.3) * height * 0.3;
        
        const dx = autoX - prevMouseX;
        const dy = autoY - prevMouseY;
        
        addForce(autoX, autoY, dx * autoIntensity, dy * autoIntensity, cursorSize);
        
        prevMouseX = autoX;
        prevMouseY = autoY;
      } else if (isMouseDown || Math.abs(mouseX - prevMouseX) > 1 || Math.abs(mouseY - prevMouseY) > 1) {
        const dx = mouseX - prevMouseX;
        const dy = mouseY - prevMouseY;
        
        addForce(mouseX, mouseY, dx, dy, cursorSize);
      }

      // Update fluid simulation
      if (isViscous) {
        velocityX = diffuse(velocityX, viscous / 1000);
        velocityY = diffuse(velocityY, viscous / 1000);
      }
      
      velocityX = advect(velocityX, velocityX, velocityY);
      velocityY = advect(velocityY, velocityX, velocityY);
      density = advect(density, velocityX, velocityY);

      // Decay
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          density[i][j] *= 0.99;
          velocityX[i][j] *= 0.99;
          velocityY[i][j] *= 0.99;
        }
      }

      // Render
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const d = Math.min(density[i][j], 1);
          if (d > 0.01) {
            const colorIndex = Math.floor((i / gridSize + j / gridSize) * colors.length / 2) % colors.length;
            const color = colors[colorIndex];
            
            ctx.fillStyle = `${color}${Math.floor(d * 255).toString(16).padStart(2, '0')}`;
            ctx.fillRect(i * cellSize, j * cellSize, cellSize + 1, cellSize + 1);
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [colors, mouseForce, cursorSize, isViscous, viscous, resolution, autoDemo, autoSpeed, autoIntensity, autoResumeDelay]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: '#000',
      }}
    />
  );
};

export default LiquidEther;