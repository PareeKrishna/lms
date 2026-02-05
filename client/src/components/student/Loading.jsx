import React, { useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const Loading = () => {
  const { path } = useParams();
  const navigate = useNavigate();
  const { fetchUserEnrolledCourses, fetchUserData } = useContext(AppContext);

  useEffect(() => {
    if (!path) return;

    const delayMs = 3000; // Give Stripe webhook time to enroll the user
    const timer = setTimeout(async () => {
      try {
        await Promise.all([
          fetchUserEnrolledCourses?.(),
          fetchUserData?.(),
        ]);
      } catch (_) {
        // Still redirect even if refetch fails
      }
      navigate(`/${path}`, { replace: true });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [path, navigate, fetchUserEnrolledCourses, fetchUserData]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Completing your enrollment...</p>
    </div>
  );
};

export default Loading
