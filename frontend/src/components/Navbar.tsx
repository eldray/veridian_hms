// src/components/Navbar.tsx
import React from 'react';
import { Menu, Bell, User, LogOut, Store } from 'lucide-react';
import { User as UserType } from '../types';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
  user: UserType;
  companyName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onLogout, user, companyName = "PharmacyPOS" }) => {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 lg:hidden transition-all duration-200 mr-4"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{companyName}</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative group">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-xl transition-all duration-200">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="absolute top-full right-0 mt-2 w-80 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <span className="text-xs text-blue-600 font-medium">3 new</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-900">Low Stock Alert</p>
                  <p className="text-xs text-gray-600 mt-1">5 products are running low</p>
                  <p className="text-xs text-gray-500 mt-2">2 min ago</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">New Sale Completed</p>
                  <p className="text-xs text-gray-600 mt-1">Transaction #TRX-0012</p>
                  <p className="text-xs text-gray-500 mt-2">5 min ago</p>
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                className="w-full mt-3 text-xs text-center text-blue-600 hover:text-blue-700 font-medium py-2 cursor-pointer"
              >
                View All Notifications
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            
            <div className="relative group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
                <User className="h-5 w-5 text-white" />
              </div>
              
              <div className="absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Link
                    to="/dashboard/profile"
                    className="w-full block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Profile Settings
                  </Link>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    Account Preferences
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    Help & Support
                  </button>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
