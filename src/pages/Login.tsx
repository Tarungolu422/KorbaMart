import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../firebase';
import { ShoppingCart, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white p-10 rounded-3xl border border-stone-200 shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-8">
          <ShoppingCart className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Welcome to KorbaKart</h1>
        <p className="text-stone-500 mb-10">Sign in to start ordering or managing your store.</p>
        
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-white border-2 border-stone-200 rounded-2xl font-bold text-stone-700 hover:bg-stone-50 hover:border-emerald-300 transition-all shadow-sm"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-6 h-6"
            referrerPolicy="no-referrer"
          />
          <span>Continue with Google</span>
        </button>
        
        <div className="mt-8 pt-8 border-t border-stone-100">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">
            Secure Hyperlocal Delivery
          </p>
        </div>
      </motion.div>
    </div>
  );
}
