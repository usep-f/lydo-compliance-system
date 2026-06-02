import React, { useState, useMemo } from 'react';
import { Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { SCHEDULED_TYPES } from '../../constants/submissionTypes';
import type { Frequency } from '../../constants/submissionTypes';
import {
  getAllPeriods,
  getPeriodEndDate,
  getGracePeriodEndDate,
  formatPeriodLabel,
} from '../../utils/periodUtils';

interface ComplianceCalendarProps {
  currentYear?: number;
}

interface CalendarEvent {
  docTypeId: string;
  docTypeLabel: string;
  frequency: Frequency;
  periodLabel: string;
  originalEndDate: Date;
  graceEndDate: Date;
  isOriginalDeadline: boolean;
  isGraceDeadline: boolean;
}

const ComplianceCalendar: React.FC<ComplianceCalendarProps> = ({ currentYear = new Date().getFullYear() }) => {
  const [activeDate, setActiveDate] = useState(new Date(currentYear, new Date().getMonth(), 1));
  const [isExpanded, setIsExpanded] = useState(false);

  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();

  const handlePrevMonth = () => {
    setActiveDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setActiveDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Generate all scheduled events for the active year
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    SCHEDULED_TYPES.forEach((dt) => {
      const periods = getAllPeriods(dt.frequency as Frequency, year);
      periods.forEach((period) => {
        const originalEndDate = getPeriodEndDate(period);
        const graceEndDate = getGracePeriodEndDate(period);
        
        events.push({
          docTypeId: dt.id,
          docTypeLabel: dt.label,
          frequency: dt.frequency as Frequency,
          periodLabel: formatPeriodLabel(period),
          originalEndDate,
          graceEndDate,
          isOriginalDeadline: true,
          isGraceDeadline: false,
        });

        events.push({
          docTypeId: dt.id,
          docTypeLabel: dt.label,
          frequency: dt.frequency as Frequency,
          periodLabel: formatPeriodLabel(period),
          originalEndDate,
          graceEndDate,
          isOriginalDeadline: false,
          isGraceDeadline: true,
        });
      });
    });
    return events;
  }, [year]);

  // Filter events for the active month
  const monthEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const evDate = ev.isOriginalDeadline ? ev.originalEndDate : ev.graceEndDate;
      return evDate.getFullYear() === year && evDate.getMonth() === month;
    });
  }, [allEvents, year, month]);

  // Generate calendar grid (with empty slots for offset)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const monthName = activeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get events grouped by day
  const getEventsForDay = (day: number) => {
    return monthEvents.filter((ev) => {
      const evDate = ev.isOriginalDeadline ? ev.originalEndDate : ev.graceEndDate;
      return evDate.getDate() === day;
    });
  };

  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
  const currentDay = todayDate.getDate();

  return (
    <div className="analytics-card" style={{ background: '#fff' }}>
      <div 
        className="chart-card-header chart-header-dark" 
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div>
            <p className="chart-card-title" style={{ color: '#F8FAFC' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94A3B8', fontVariationSettings: "'FILL' 1", marginRight: '8px' }}>
                calendar_month
              </span>
              Compliance Schedules &amp; Deadlines
            </p>
            <p className="chart-card-subtitle" style={{ color: '#94A3B8' }}>
              Track regular period deadlines and 7-day grace periods
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToday();
              }}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#F8FAFC', borderRadius: '6px', padding: '4px 12px', fontSize: '13px',
                fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Today
            </button>
            <div
              style={{
                display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.6)',
                borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevMonth();
                }}
                style={{
                  background: 'none', border: 'none', color: '#F8FAFC', padding: '4px 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back_ios_new</span>
              </button>
              <div style={{ padding: '0 8px', color: '#F8FAFC', fontSize: '14px', fontWeight: 600, minWidth: '110px', textAlign: 'center' }}>
                {monthName}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextMonth();
                }}
                style={{
                  background: 'none', border: 'none', color: '#F8FAFC', padding: '4px 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward_ios</span>
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                background: 'none', border: 'none', color: '#94A3B8', padding: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: '8px', transition: 'transform 0.3s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-0">
        <Row className="g-0">
          {/* Calendar Grid Side */}
          <Col md={7} style={{ borderRight: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} style={{ height: '100px', borderRadius: '8px', background: '#F8FAFC' }} />;
                }
                const dayEvents = getEventsForDay(day);
                const isToday = isCurrentMonth && currentDay === day;

                return (
                  <div
                    key={`day-${day}`}
                    style={{
                      height: '100px',
                      borderRadius: '8px',
                      border: isToday ? '2px solid #006EB7' : '1px solid #E2E8F0',
                      background: isToday ? '#F0F9FF' : '#FFFFFF',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: isToday ? 700 : 500, color: isToday ? '#006EB7' : '#334155', marginBottom: '6px' }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                      {dayEvents.slice(0, 2).map((ev, i) => {
                        const isGrace = ev.isGraceDeadline;
                        return (
                          <OverlayTrigger
                            key={`${ev.docTypeId}-${i}`}
                            placement="top"
                            overlay={
                              <Tooltip id={`tooltip-${day}-${i}`}>
                                <div style={{ textAlign: 'left', padding: '4px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{ev.docTypeLabel}</div>
                                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '6px' }}>{ev.periodLabel}</div>
                                  {isGrace ? (
                                    <div style={{ color: '#FBA100', fontSize: '11px', fontWeight: 600 }}>End of Grace Period</div>
                                  ) : (
                                    <div style={{ color: '#006EB7', fontSize: '11px', fontWeight: 600 }}>Original Deadline</div>
                                  )}
                                </div>
                              </Tooltip>
                            }
                          >
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                cursor: 'default',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                background: isGrace ? '#FEF3C7' : '#E0F2FE',
                                color: isGrace ? '#D97706' : '#0369A1',
                                border: `1px solid ${isGrace ? '#FDE68A' : '#BAE6FD'}`,
                              }}
                            >
                              {ev.docTypeLabel}
                            </div>
                          </OverlayTrigger>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', padding: '2px 4px', textAlign: 'center' }}>
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '20px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#E0F2FE', border: '1px solid #BAE6FD' }} />
                Original Deadline
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FEF3C7', border: '1px solid #FDE68A' }} />
                Grace Period Deadline
              </div>
            </div>
          </Col>

          {/* Upcoming Feed Side */}
          <Col md={5} style={{ padding: '0', background: '#FAFAFA' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A', fontFamily: 'var(--font-headline)' }}>
                Upcoming in {activeDate.toLocaleDateString('en-US', { month: 'long' })}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Sorted chronologically by date</p>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '16px 24px' }}>
              {monthEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px' }}>event_busy</span>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>No deadlines this month</div>
                </div>
              ) : (
                [...monthEvents]
                  .sort((a, b) => {
                    const dateA = a.isOriginalDeadline ? a.originalEndDate : a.graceEndDate;
                    const dateB = b.isOriginalDeadline ? b.originalEndDate : b.graceEndDate;
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((ev, i) => {
                    const evDate = ev.isOriginalDeadline ? ev.originalEndDate : ev.graceEndDate;
                    return (
                      <div
                        key={`feed-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          paddingBottom: '16px',
                          marginBottom: '16px',
                          borderBottom: i < monthEvents.length - 1 ? '1px solid #E2E8F0' : 'none',
                        }}
                      >
                        <div
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            minWidth: '48px',
                            textAlign: 'center',
                            overflow: 'hidden',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div style={{ background: ev.isGraceDeadline ? '#F59E0B' : '#006EB7', color: '#FFF', fontSize: '10px', fontWeight: 700, padding: '2px 0', textTransform: 'uppercase' }}>
                            {evDate.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', padding: '4px 0' }}>
                            {evDate.getDate()}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', lineHeight: 1.3, marginBottom: '4px' }}>
                            {ev.docTypeLabel}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
                            {ev.periodLabel} • {ev.frequency}
                          </div>
                          {ev.isGraceDeadline ? (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '9999px' }}>
                              Final Grace Deadline
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369A1', background: '#E0F2FE', padding: '2px 8px', borderRadius: '9999px' }}>
                              Original Deadline
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </Col>
        </Row>
      </div>
      )}
    </div>
  );
};

export default ComplianceCalendar;
