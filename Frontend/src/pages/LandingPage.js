import React from 'react';
import { Link } from 'react-router-dom';
import Lottie from 'react-lottie';
import animationData from '../animation/87986-data-analysis.json';

function LandingPage() {
  const lottieOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
    // Optionally, update the animation color to match the theme
    // color: '#3F51B5',
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-100">
      <h1 className="text-4xl font-bold text-blue-900 mb-8">Welcome to Semi Log</h1>
      <p className="text-lg text-gray-700 mb-6">
        Discover the power of data analytics with ai.
      </p>
      <Link
        to="/datachat"
        className="bg-blue-500 text-white px-6 py-3 rounded-md font-semibold text-lg hover:bg-blue-600"
      >
        Start Chatting in Semi Log
      </Link>

      <div style={{ width: '300px', height: '300px', marginTop: '50px' }}>
        <Lottie options={lottieOptions} />
      </div>
    </div>
  );
}

export default LandingPage;
