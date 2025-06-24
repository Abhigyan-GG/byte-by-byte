import React, { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-500 to-blue-500">
      <main className="flex-grow flex items-center justify-center">
        {children}
      </main>
      <footer className="text-center text-white p-4 bg-white/10">
        Made with{' '}
        <a
          href="https://github.com/your-username"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          &lt;3
        </a>
      </footer>
    </div>
  );
};

export default Layout;
