import React, { useState } from 'react';
import { LogIn, LogOut, UserPlus, X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import type { User } from '../types';

interface AuthPopoverProps {
  onClose: () => void;
  onLogin?: (email: string, password: string) => Promise<boolean>;
  onRegister?: (email: string, password: string) => Promise<boolean>;
  onLogout?: () => void;
  user: User | null;
}

export function AuthPopover({ 
  onClose, 
  onLogin, 
  onRegister,
  onLogout,
  user
}: AuthPopoverProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('请填写所有必填字段');
      return;
    }
    
    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      
      setIsSubmitting(true);
      try {
        const success = await onRegister?.(email, password);
        if (!success) {
          setError('注册失败，该邮箱可能已被注册');
        }
      } catch (err) {
        setError('注册过程中发生错误，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        const success = await onLogin?.(email, password);
        if (!success) {
          setError('登录失败，请检查邮箱和密码');
        }
      } catch (err) {
        setError('登录过程中发生错误，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn"
    >
      <div 
        className="w-full max-w-md rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden transform transition-all animate-slideIn"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user ? '用户信息' : (mode === 'login' ? '登录' : '注册')}
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
            aria-label="关闭"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {user ? (
          <div className="p-5 space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-2xl font-bold mb-4">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user.email}
              </h3>
              {user.name && user.name !== user.email.split('@')[0] && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {user.name}
                </p>
              )}
            </div>
            
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium rounded-md transition-colors flex items-center justify-center mt-6"
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {error && (
              <div className="p-3 mb-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="relative">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-gray-400"
                >
                  邮箱地址
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                    placeholder="your@email.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="relative">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-gray-400"
                >
                  密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-10 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="relative">
                  <label 
                    htmlFor="confirmPassword" 
                    className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-gray-400"
                  >
                    确认密码
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-10 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                className={`w-full py-2.5 px-4 ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700'
                } text-white font-medium rounded-md transition-colors flex items-center justify-center`}
                disabled={isSubmitting}
              >
                {mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    {isSubmitting ? '登录中...' : '登录'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isSubmitting ? '注册中...' : '注册'}
                  </>
                )}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                disabled={isSubmitting}
              >
                {mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}