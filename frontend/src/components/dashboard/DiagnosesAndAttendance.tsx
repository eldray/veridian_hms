// src/components/dashboard/DiagnosesAndAttendance.tsx
import { useEffect, useState } from 'react';
import { Heart, Calendar, BarChart3, Users, Shield, CreditCard } from 'lucide-react';
import { getEncounterReport, getTopDiagnoses as apiGetTopDiagnoses } from '../../api';

interface AttendanceStats {
    byType: { outpatient?: number; inpatient?: number; emergency?: number; maternal?: number };
    byPaymentMode: { cash?: number; nhis?: number; private_insurance?: number };
    total: number;
}

export function DiagnosesAndAttendance() {
    const [attendance, setAttendance] = useState<AttendanceStats>({ byType: {}, byPaymentMode: {}, total: 0 });
    const [diagnoses, setDiagnoses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            try {
                setLoading(true);
                const today = new Date().toISOString().split('T')[0];
                const dateRange = { startDate: today, endDate: today };

                const [attendanceRes, diagnosesRes] = await Promise.all([
                    getEncounterReport(dateRange),
                    apiGetTopDiagnoses(dateRange, 5),
                ]);

                if (!active) return;

                const attendanceData = attendanceRes?.data || attendanceRes;
                const diagnosesData = diagnosesRes?.data || diagnosesRes;

                let byType: Record<string, number> = {};
                let byPaymentMode: Record<string, number> = {};
                let total = 0;

                if (Array.isArray(attendanceData)) {
                    total = attendanceData.length;
                    attendanceData.forEach((item: any) => {
                        const t = item.type || item.attendanceType;
                        if (t) byType[t] = (byType[t] || 0) + 1;
                        const m = item.paymentMode;
                        if (m) byPaymentMode[m] = (byPaymentMode[m] || 0) + 1;
                    });
                } else {
                    const patterns = attendanceData?.attendancePatterns || attendanceData?.patterns || {};
                    const summary = attendanceData?.summary || attendanceData?.totals || {};
                    if (patterns.byType) byType = patterns.byType;
                    if (patterns.byPaymentMode) byPaymentMode = patterns.byPaymentMode;
                    total = summary.totalAttendances || summary.total || attendanceData?.total || 0;

                    if (!Object.keys(byType).length && !Object.keys(byPaymentMode).length) {
                        const knownTypes = ['outpatient', 'inpatient', 'emergency', 'maternal'];
                        const knownModes = ['cash', 'nhis', 'private_insurance'];
                        Object.entries(attendanceData || {}).forEach(([k, v]) => {
                            if (typeof v === 'number' && knownTypes.includes(k)) byType[k] = v;
                            if (typeof v === 'number' && knownModes.includes(k)) byPaymentMode[k] = v;
                        });
                        if (!total) total = Object.values(byType).reduce((s, v) => s + v, 0);
                    }
                }

                setAttendance({ byType, byPaymentMode, total });

                const list = Array.isArray(diagnosesData)
                    ? diagnosesData
                    : diagnosesData?.data || diagnosesData?.results || diagnosesData?.diagnoses || [];
                setDiagnoses(list);
            } catch (err) {
                console.error('DiagnosesAndAttendance fetch failed:', err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();
        return () => { active = false; };
    }, []);

    const getName = (d: any) => d.diagnosisName || d.name || d.disease || d.diagnosis || d.title || 'Unknown';
    const getCount = (d: any) => d.totalCases || d.patients || d.count || d.cases || 1;

    const maxCount = diagnoses.length ? Math.max(...diagnoses.slice(0, 5).map(getCount)) : 1;

    const typeConfig: Record<string, { label: string; color: string }> = {
        outpatient: { label: 'Outpatient', color: 'var(--icon-cyan-text)' },
        inpatient: { label: 'Inpatient', color: 'var(--icon-purple-text)' },
        emergency: { label: 'Emergency', color: 'var(--icon-red-text)' },
        maternal: { label: 'Maternal', color: 'var(--icon-pink-text)' },
    };

    const paymentConfig: Record<string, { label: string; Icon: any; color: string }> = {
        cash: { label: 'Cash', Icon: Users, color: 'var(--icon-green-text)' },
        nhis: { label: 'NHIS', Icon: Shield, color: 'var(--icon-cyan-text)' },
        private_insurance: { label: 'Insurance', Icon: CreditCard, color: 'var(--icon-purple-text)' },
    };

    const hasDiagnoses = diagnoses.length > 0;
    const hasAttendance = attendance.total > 0 || Object.keys(attendance.byType).length > 0;

    if (loading) {
        return (
            <div className="rounded-xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', height: '100%' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                    <div className="h-4 w-4 rounded animate-pulse" style={{ background: 'var(--bg-main)' }} />
                    <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--bg-main)' }} />
                </div>
                <div className="p-4 space-y-3 flex-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-7 rounded animate-pulse" style={{ background: 'var(--bg-main)' }} />
                    ))}
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded animate-pulse" style={{ background: 'var(--bg-main)' }} />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasDiagnoses && !hasAttendance) {
        return (
            <div className="rounded-xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', height: '100%' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                    <BarChart3 className="w-4 h-4" style={{ color: 'var(--icon-purple-text)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Insights & activity</p>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No data available today</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                <BarChart3 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--icon-purple-text)' }} />
                <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Insights & activity</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Today's overview</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: 0 }}>

                {/* ── TOP DIAGNOSES ── */}
                {hasDiagnoses && (
                    <div className="mb-4">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Heart className="w-3.5 h-3.5" style={{ color: 'var(--icon-red-text)' }} />
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Top diagnoses</span>
                            <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>today</span>
                        </div>

                        <div className="space-y-2">
                            {diagnoses.slice(0, 5).map((d, i) => {
                                const name = getName(d);
                                const count = getCount(d);
                                const pct = Math.round((count / maxCount) * 100);
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        {/* rank */}
                                        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                                            style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>
                                            {i + 1}
                                        </div>
                                        {/* label + bar */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-[11px] truncate" style={{ color: 'var(--text-primary)', maxWidth: '80%' }}>{name}</span>
                                                <span className="text-[11px] font-semibold flex-shrink-0 ml-2" style={{ color: 'var(--icon-cyan-text)' }}>{count}</span>
                                            </div>
                                            {/* track */}
                                            <div className="w-full rounded-full" style={{ height: 5, background: 'var(--bg-main)' }}>
                                                <div className="rounded-full h-full" style={{ width: `${pct}%`, background: 'var(--icon-cyan-text)', transition: 'width .4s ease' }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── DIVIDER ── */}
                {hasDiagnoses && hasAttendance && (
                    <div className="my-3" style={{ borderTop: '1px solid var(--border-color)' }} />
                )}

                {/* ── ATTENDANCE ── */}
                {hasAttendance && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--icon-cyan-text)' }} />
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Attendance</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}>
                                {attendance.total} total
                            </span>
                        </div>

                        {/* By type — mini stat cards */}
                        {Object.keys(attendance.byType).length > 0 && (
                            <>
                                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                                    style={{ color: 'var(--text-tertiary)' }}>By type</p>
                                <div className="grid gap-2 mb-3"
                                    style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(attendance.byType).length, 3)}, 1fr)` }}>
                                    {Object.entries(attendance.byType).map(([key, value]) => {
                                        const cfg = typeConfig[key];
                                        if (!cfg) return null;
                                        return (
                                            <div key={key} className="rounded-lg px-2 py-2 border"
                                                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                                                <p className="text-[9px] mb-1" style={{ color: 'var(--text-secondary)' }}>{cfg.label}</p>
                                                <p className="text-base font-semibold leading-none" style={{ color: cfg.color }}>{value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* By payment — mini stat cards */}
                        {Object.keys(attendance.byPaymentMode).length > 0 && (
                            <>
                                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5"
                                    style={{ color: 'var(--text-tertiary)' }}>By payment</p>
                                <div className="grid gap-2"
                                    style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(attendance.byPaymentMode).length, 3)}, 1fr)` }}>
                                    {Object.entries(attendance.byPaymentMode).map(([key, value]) => {
                                        const cfg = paymentConfig[key];
                                        if (!cfg) return null;
                                        const Icon = cfg.Icon;
                                        return (
                                            <div key={key} className="rounded-lg px-2 py-2 border"
                                                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                                                <div className="flex items-center gap-1 mb-1">
                                                    <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                                                    <p className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{cfg.label}</p>
                                                </div>
                                                <p className="text-base font-semibold leading-none" style={{ color: cfg.color }}>{value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}