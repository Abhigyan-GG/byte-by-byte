// src/components/ui/Layout.tsx
import React from 'react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-purple-500 to-blue-400 text-white">
      <main className="flex-1 flex items-center justify-center p-4 w-full">
        <div className="w-full max-w-4xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="text-sm text-white text-center py-4 px-4 bg-black/20 backdrop-blur-sm">
        Made with{' '}
        <a
          href="https://github.com/Abhigyan-GG"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-pink-300 transition-colors duration-200"
        >
          {'<3'}
        </a>
      </footer>
    </div>
  );
};

export default Layout;
