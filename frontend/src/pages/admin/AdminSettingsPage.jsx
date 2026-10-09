import React, { useState, useEffect } from 'react';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { PICKUP_CONFIG } from '../../config/pickupConfig';
import { useSettings } from '../../context/SettingsContext';
import adminNotificationApi from '../../services/adminNotificationApi';
import { isAudioChimeEnabled, setAudioChimeEnabled, playChimeSound, unlockAudio } from '../../utils/audioChime.js';

/**
 * AdminSettingsPage Component
 * Admin Configuration UI (/admin/settings)
 *
 * Requirements:
 * - Professional settings sections:
 *   1. Restaurant Information
 *   2. Pickup Settings (Strict self-pickup model)
 *   3. Notification Settings (WhatsApp provider status)
 * - Fully responsive and accessible
 */
export default function AdminSettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [providerStatus, setProviderStatus] = useState({
    whatsapp: 'NOT_CONFIGURED',
  });

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoFormData, setInfoFormData] = useState({
    restaurantName: '',
    tagline: '',
    phone: '',
    email: '',
    address: '',
    operatingDays: '',
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSuccessMessage, setInfoSuccessMessage] = useState('');
  const [infoErrorMessage, setInfoErrorMessage] = useState('');

  useEffect(() => {
    if (!isEditingInfo && settings) {
      setInfoFormData({
        restaurantName: settings.restaurantName || RESTAURANT_CONFIG.name,
        tagline: settings.tagline || RESTAURANT_CONFIG.tagline,
        phone: settings.phone || RESTAURANT_CONFIG.contact?.phone || '',
        email: settings.email || RESTAURANT_CONFIG.contact?.email || '',
        address: settings.address || RESTAURANT_CONFIG.contact?.address || '',
        operatingDays: settings.operatingDays || RESTAURANT_CONFIG.operatingHours?.days || '',
      });
    }
  }, [settings, isEditingInfo]);

  const handleStartEdit = () => {
    setInfoFormData({
      restaurantName: settings?.restaurantName || RESTAURANT_CONFIG.name,
      tagline: settings?.tagline || RESTAURANT_CONFIG.tagline,
      phone: settings?.phone || RESTAURANT_CONFIG.contact?.phone || '',
      email: settings?.email || RESTAURANT_CONFIG.contact?.email || '',
      address: settings?.address || RESTAURANT_CONFIG.contact?.address || '',
      operatingDays: settings?.operatingDays || RESTAURANT_CONFIG.operatingHours?.days || '',
    });
    setInfoSuccessMessage('');
    setInfoErrorMessage('');
    setIsEditingInfo(true);
  };

  const handleCancelEdit = () => {
    setInfoFormData({
      restaurantName: settings?.restaurantName || RESTAURANT_CONFIG.name,
      tagline: settings?.tagline || RESTAURANT_CONFIG.tagline,
      phone: settings?.phone || RESTAURANT_CONFIG.contact?.phone || '',
      email: settings?.email || RESTAURANT_CONFIG.contact?.email || '',
      address: settings?.address || RESTAURANT_CONFIG.contact?.address || '',
      operatingDays: settings?.operatingDays || RESTAURANT_CONFIG.operatingHours?.days || '',
    });
    setInfoErrorMessage('');
    setIsEditingInfo(false);
  };

  const handleSaveInfo = async (e) => {
    if (e) e.preventDefault();
    if (!infoFormData.restaurantName.trim()) {
      setInfoErrorMessage('Restaurant Brand Name cannot be empty.');
      return;
    }
    if (!infoFormData.phone.trim()) {
      setInfoErrorMessage('Counter Contact Phone cannot be empty.');
      return;
    }
    if (!infoFormData.address.trim()) {
      setInfoErrorMessage('Physical Store Address cannot be empty.');
      return;
    }

    setIsSavingInfo(true);
    setInfoErrorMessage('');
    setInfoSuccessMessage('');

    try {
      await updateSettings({
        restaurantName: infoFormData.restaurantName.trim(),
        tagline: infoFormData.tagline.trim(),
        phone: infoFormData.phone.trim(),
        email: infoFormData.email.trim(),
        address: infoFormData.address.trim(),
        operatingDays: infoFormData.operatingDays.trim(),
      });
      setInfoSuccessMessage('Restaurant information saved successfully.');
      setIsEditingInfo(false);
      setTimeout(() => {
        setInfoSuccessMessage('');
      }, 5000);
    } catch (err) {
      setInfoErrorMessage(err.message || 'Failed to save restaurant settings. Please try again.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    adminNotificationApi.getProviderStatus().then((res) => {
      if (isMounted && res?.providers) {
        setProviderStatus({
          whatsapp: res.providers.whatsapp || res.providers.WHATSAPP || 'NOT_CONFIGURED',
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const isWhatsAppConnected = providerStatus.whatsapp === 'CONFIGURED';
  const [isChimeEnabled, setIsChimeEnabled] = useState(() => isAudioChimeEnabled());

  const handleToggleChime = () => {
    const nextState = !isChimeEnabled;
    setIsChimeEnabled(nextState);
    setAudioChimeEnabled(nextState);
    if (nextState) {
      unlockAudio();
      playChimeSound();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              Admin Settings
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Settings Foundation
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Operational configuration for restaurant parcel pickup, store details, and system alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Self-Pickup Mode Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Settings Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Restaurant Information */}
          <section aria-labelledby="restaurant-info-heading" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 id="restaurant-info-heading" className="text-sm sm:text-base font-bold text-primary">
                    Restaurant Information
                  </h2>
                  <p className="text-[11px] text-slate-400">Core business identity and customer-facing contact details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingInfo ? (
                  <>
                    <span className="inline-flex items-center justify-center whitespace-nowrap text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                      ACTIVE CONFIG
                    </span>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-primary font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSavingInfo}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={isSavingInfo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-primary font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingInfo ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {infoSuccessMessage && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{infoSuccessMessage}</span>
              </div>
            )}
            {infoErrorMessage && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{infoErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveInfo} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Restaurant Brand Name
                  </label>
                  <input
                    type="text"
                    value={infoFormData.restaurantName}
                    onChange={(e) => setInfoFormData((prev) => ({ ...prev, restaurantName: e.target.value }))}
                    readOnly={!isEditingInfo}
                    className={`w-full px-3 py-2 rounded-xl text-primary font-semibold text-xs transition-colors ${
                      isEditingInfo
                        ? 'bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-accent'
                        : 'bg-slate-50 border border-slate-200 cursor-default'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={infoFormData.tagline}
                    onChange={(e) => setInfoFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                    readOnly={!isEditingInfo}
                    className={`w-full px-3 py-2 rounded-xl text-primary font-semibold text-xs transition-colors ${
                      isEditingInfo
                        ? 'bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-accent'
                        : 'bg-slate-50 border border-slate-200 cursor-default'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Counter Contact Phone
                  </label>
                  <input
                    type="text"
                    value={infoFormData.phone}
                    onChange={(e) => setInfoFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    readOnly={!isEditingInfo}
                    className={`w-full px-3 py-2 rounded-xl text-primary font-semibold text-xs transition-colors ${
                      isEditingInfo
                        ? 'bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-accent'
                        : 'bg-slate-50 border border-slate-200 cursor-default'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={infoFormData.email}
                    onChange={(e) => setInfoFormData((prev) => ({ ...prev, email: e.target.value }))}
                    readOnly={!isEditingInfo}
                    className={`w-full px-3 py-2 rounded-xl text-primary font-semibold text-xs transition-colors ${
                      isEditingInfo
                        ? 'bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-accent'
                        : 'bg-slate-50 border border-slate-200 cursor-default'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Physical Store Address (Pickup Counter)
                </label>
                <textarea
                  value={infoFormData.address}
                  onChange={(e) => setInfoFormData((prev) => ({ ...prev, address: e.target.value }))}
                  readOnly={!isEditingInfo}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-xl text-primary font-semibold text-xs transition-colors ${
                    isEditingInfo
                      ? 'bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-accent'
                      : 'bg-slate-50 border border-slate-200 cursor-default'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Operating Schedule
                </label>
                {isEditingInfo ? (
                  <input
                    type="text"
                    value={infoFormData.operatingDays}
                    onChange={(e) => setInfoFormData((prev) => ({ ...prev, operatingDays: e.target.value }))}
                    placeholder="e.g. Monday – Sunday (All Days)"
                    className="w-full px-3 py-2 rounded-xl text-primary font-semibold text-xs bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-accent transition-colors"
                  />
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-slate-600">
                    <span>Operating Schedule:</span>
                    <span className="font-bold text-primary">
                      {infoFormData.operatingDays || RESTAURANT_CONFIG.operatingHours.days} •{' '}
                      {settings?.openingTime && settings?.closingTime
                        ? `${settings.openingTime} – ${settings.closingTime}`
                        : RESTAURANT_CONFIG.operatingHours.time}
                    </span>
                  </div>
                )}
              </div>

              {isEditingInfo && (
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSavingInfo}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-primary font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingInfo ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* SECTION 2: Pickup Settings */}
          <section aria-labelledby="pickup-settings-heading" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h2 id="pickup-settings-heading" className="text-sm sm:text-base font-bold text-primary">
                    Pickup Settings
                  </h2>
                  <p className="text-[11px] text-slate-400">Strict Self-Pickup scheduling rules and timing parameters</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Pickup Only
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-900 block">Self-Pickup Service</span>
                  <span className="text-[11px] text-emerald-700">Online parcel ordering and counter collection status</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-600 text-white shadow-2xs">
                  Pickup Enabled
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-2.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                <span>
                  <strong>Strict Policy:</strong> Restaurant Self-Pickup Only. Home delivery, delivery fees, and delivery partner integrations are disabled across the system.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Daily Opening Time (Kitchen)
                  </label>
                  <input
                    type="text"
                    defaultValue={`${PICKUP_CONFIG.openingTime} (11:00 AM)`}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-primary font-semibold text-xs cursor-default"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Kitchen Last Order Time
                  </label>
                  <input
                    type="text"
                    defaultValue={`${PICKUP_CONFIG.closingTime} (10:30 PM)`}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-primary font-semibold text-xs cursor-default"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Slot Interval
                  </label>
                  <input
                    type="text"
                    defaultValue={`${PICKUP_CONFIG.slotIntervalMinutes} Minutes`}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-primary font-semibold text-xs cursor-default"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Preparation Buffer
                  </label>
                  <input
                    type="text"
                    defaultValue={`${PICKUP_CONFIG.preparationBufferMinutes} Minutes`}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-primary font-semibold text-xs cursor-default"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Advance Window
                  </label>
                  <input
                    type="text"
                    defaultValue={`${PICKUP_CONFIG.maxDaysAhead} Days Ahead`}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-primary font-semibold text-xs cursor-default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Customer Pickup Disclaimer
                </label>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs leading-relaxed">
                  {PICKUP_CONFIG.pickupNotice}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: Notification Settings (UI Foundation) */}
          <section aria-labelledby="notification-settings-heading" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 id="notification-settings-heading" className="text-sm sm:text-base font-bold text-primary">
                    Notification Settings
                  </h2>
                  <p className="text-[11px] text-slate-400">Customer order alerts and kitchen notification channels</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                UI Foundation
              </span>
            </div>

            <div className="p-5 space-y-3.5 text-xs divide-y divide-slate-100">
              {/* WhatsApp Alerts */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-bold text-primary">WhatsApp Notifications</p>
                  <p className="text-[11px] text-slate-400">
                    Send automated WhatsApp messages when order is Placed, Preparing, or Ready
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isWhatsAppConnected
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-amber-800 bg-amber-50 border-amber-200'
                    }`}
                  >
                    Status: {isWhatsAppConnected ? 'Connected' : 'Not Connected'}
                  </span>
                  <div
                    className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${
                      isWhatsAppConnected ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start cursor-not-allowed'
                    }`}
                    title={isWhatsAppConnected ? 'WhatsApp API Connected' : 'WhatsApp API Not Configured'}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                  </div>
                </div>
              </div>

              {/* Kitchen Sound Alerts */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="font-bold text-primary">Audio Chime on New Orders</p>
                  <p className="text-[11px] text-slate-400">
                    Play notification audio when a customer places a new pickup order
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Browser Chime
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleChime}
                    aria-label={`Toggle Audio Chime ${isChimeEnabled ? 'Off' : 'On'}`}
                    className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                      isChimeEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                    title={isChimeEnabled ? 'Audio Chime Enabled' : 'Audio Chime Disabled'}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="w-8 h-8 rounded-lg bg-accent text-primary flex items-center justify-center font-black text-xs">
              SP
            </div>
            <h3 className="font-bold text-sm text-white">Strict Self-Pickup Compliance</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every order placed on this platform must be picked up at the restaurant counter. Delivery parameters, fees, and tracking are deliberately omitted to maintain business integrity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
