// src/components/ui/Layout.tsx
import React from 'react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-500 to-blue-400 text-white">
      <main className="flex-grow flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="text-sm text-white text-center py-2 bg-black/20">
        Made with{' '}
        <a
          href="https://github.com/YOUR_GITHUB_USERNAME"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-pink-300 transition"
        >
          {'<3'}
        </a>
      </footer>
    </div>
  );
};

export default Layout;
