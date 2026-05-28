'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  Calendar,
  User,
  Stethoscope,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function PatientHistoryRecords() {
  const params = useParams();
  const router = useRouter();
  const { API_BASE_URL } = useAuth();

  const patientId = params.id;
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const abortControllerRef = useRef(null);

  // Fetch patient clinical records
  const fetchPatientHistory = async () => {
    if (!patientId) return;

    try {
      abortControllerRef.current = new AbortController();

      const res = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve patient records.');
      }

      const data = await res.json();
      if (data.success && data.data) {
        setPatient(data.data);
        setError('');
      } else {
        throw new Error(data.message || 'Patient not found.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Fetch error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientHistory();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [patientId]);

  const getStatusBadge = (status) => {
    const baseClass =
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide border';

    switch (status) {
      case 'COMPLETED':
        return (
          <span className={`${baseClass} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`}>
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case 'PENDING':
        return (
          <span className={`${baseClass} bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`}>
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`${baseClass} bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`}>
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20`}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Header Banner */}
        <div className="glass p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 mb-8 flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              Clinical & Medical Records
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">
              Complete diagnostic and appointment history
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="glass p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="inline-block">
              <div className="pulse-loader">
                <div></div>
                <div></div>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">Loading patient records...</p>
          </div>
        ) : !patient ? (
          <div className="glass p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto" />
            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">Patient Not Found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
              The requested patient record could not be retrieved.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Patient Demographics Card */}
            <div className="glass p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Patient Demographics
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {patient.name ?? 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Age</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {patient.age ?? 'N/A'} years
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Gender</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {patient.gender ?? 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 md:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-all">
                    {patient.email ?? 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {patient.phoneNumber ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Medical History Card */}
            <div className="glass p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Clinical Background
                </h2>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                  {patient.medicalHistory
                    ? patient.medicalHistory.toUpperCase()
                    : 'No medical history recorded for this patient.'}
                </p>
              </div>
            </div>

            {/* Appointments Timeline */}
            <div className="glass p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Appointment History
                </h2>
              </div>

              {!patient.appointments || patient.appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No appointment records found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patient.appointments.map((apt, idx) => (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all duration-200"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            {getStatusBadge(apt.status)}
                          </div>

                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Appointment with {apt.doctor?.name ?? 'Unknown Doctor'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-bold">{apt.doctor?.specialization ?? 'N/A'}</span>
                            {apt.reason && ` — Reason: ${apt.reason}`}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Scheduled Date
                          </p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {new Date(apt.appointmentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}