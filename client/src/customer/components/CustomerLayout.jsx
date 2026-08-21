import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { CustomerUIProvider } from '../../context/CustomerUIContext';

export default function CustomerLayout() {
  return (
    <CustomerUIProvider>
      <div className="min-h-screen flex flex-col bg-[#FFFDF9] text-[#141B20] font-sans">
        <Header />
        <main className="flex-1 flex flex-col justify-start">
          <Outlet />
        </main>
      </div>
    </CustomerUIProvider>
  );
}
