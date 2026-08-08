import React, { useState, useMemo } from 'react';
import { Modal, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { SCHEDULED_TYPES } from '../../constants/submissionTypes';
import type { Frequency } from '../../constants/submissionTypes';
import {
  getAllPeriods,
  getPeriodEndDate,
  getGracePeriodEndDate,
  formatPeriodLabel,
} from '../../utils/periodUtils';

export interface ComplianceCalendarProps {
  currentYear?: number;
  show: boolean;
  onHide: () => void;
}

export interface CalendarEvent {
  docTypeId: string;
  docTypeLabel: string;
  frequency: Frequency;
  periodLabel: string;
  originalEndDate: Date;
  graceEndDate: Date;
  isOriginalDeadline: boolean;
  isGraceDeadline: boolean;
}

function generateYearEvents(year: number): CalendarEvent[] {
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
}

function filterEventsForMonth(allEvents: CalendarEvent[], year: number, month: number): CalendarEvent[] {
  return allEvents.filter((ev) => {
    const evDate = ev.isOriginalDeadline ? ev.originalEndDate : ev.graceEndDate;
    return evDate.getFullYear() === year && evDate.getMonth() === month;
  });
}

function generateCalendarDays(year: number, month: number): (number | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  // Pad to exactly 42 slots (6 rows x 7 cols) for a completely consistent grid size
  while (days.length < 42) {
    days.push(null);
  }
  return days;
}

const ComplianceCalendar: React.FC<ComplianceCalendarProps> = ({
  currentYear = new Date().getFullYear(),
  show,
  onHide,
}) => {
  const [activeDate, setActiveDate] = useState(new Date(currentYear, new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'grid' | 'feed'>('grid');

  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();

  const handlePrevMonth = () => {
    setActiveDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setActiveDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    const today = new Date();
    setActiveDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  const allEvents = useMemo(() => generateYearEvents(year), [year]);
  const monthEvents = useMemo(
    () => filterEventsForMonth(allEvents, year, month),
    [allEvents, year, month]
  );
  const calendarDays = useMemo(() => generateCalendarDays(year, month), [year, month]);

  const monthName = activeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
    return monthEvents.filter((ev) => {
      const evDate = ev.isOriginalDeadline ? ev.originalEndDate : ev.graceEndDate;
      return evDate.getDate() === day;
    });
  };

  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
  const currentDay = todayDate.getDate();
  const selectedDayEvents = selectedDay !== null ? getEventsForDay(selectedDay) : [];

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      backdrop
      keyboard
      className="compliance-calendar-modal"
      contentClassName="border-0 shadow-lg overflow-hidden rounded-4"
    >
      {/* Modal Header */}
      <div
        className="px-4 py-3 text-white d-flex align-items-center justify-content-between flex-wrap gap-3"
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 p-2"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span className="material-symbols-outlined text-info" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
              calendar_month
            </span>
          </div>
          <div>
            <h4 className="m-0 fw-bold fs-5 text-white font-headline">Compliance Schedules &amp; Deadlines</h4>
            <p className="m-0 text-slate-300 fs-7" style={{ color: '#94A3B8', fontSize: '13px' }}>
              Track regular filing dates and statutory 7-day grace period cutoffs
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            onClick={handleToday}
            className="btn btn-sm btn-outline-light d-flex align-items-center gap-1 font-body fw-semibold px-3"
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.2)',
              fontSize: '12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>today</span>
            Today
          </button>

          <div
            className="d-flex align-items-center rounded-2 px-1"
            style={{
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <button
              onClick={handlePrevMonth}
              className="btn btn-sm text-white p-1 d-flex align-items-center justify-content-center"
              aria-label="Previous Month"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <span
              className="px-3 text-white fw-bold text-center font-headline"
              style={{ minWidth: '130px', fontSize: '14px' }}
            >
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="btn btn-sm text-white p-1 d-flex align-items-center justify-content-center"
              aria-label="Next Month"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>

          <button
            onClick={onHide}
            className="btn btn-sm text-white p-1 ms-2 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              width: '32px',
              height: '32px',
            }}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>
      </div>

      {/* Modal Body */}
      <Modal.Body className="p-0 bg-white">
        {/* Mobile/Tablet Segmented View Switcher */}
        <div className="d-flex d-lg-none bg-light p-2 border-bottom justify-content-center">
          <div className="btn-group w-100" style={{ maxWidth: '400px' }}>
            <button
              className={`btn btn-sm ${activeTab === 'grid' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab('grid')}
            >
              <span className="material-symbols-outlined align-middle me-1" style={{ fontSize: '16px' }}>grid_view</span>
              Calendar Grid
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'feed' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab('feed')}
            >
              <span className="material-symbols-outlined align-middle me-1" style={{ fontSize: '16px' }}>format_list_bulleted</span>
              Deadlines Feed ({monthEvents.length})
            </button>
          </div>
        </div>

        <Row className="g-0">
          {/* Left Column: Interactive Grid */}
          <Col
            lg={7}
            className={`${activeTab === 'grid' ? 'd-block' : 'd-none d-lg-block'} p-3 p-md-4 border-end d-flex flex-column justify-content-between`}
            style={{ backgroundColor: '#FFFFFF', minHeight: '620px', maxHeight: '620px' }}
          >
            <div>
              {/* Weekday Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center fw-bold text-uppercase text-secondary"
                    style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Fixed 6x7 Calendar Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '6px',
                }}
              >
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="rounded-3"
                        style={{ height: '70px', minHeight: '70px', maxHeight: '70px', background: '#F8FAFC', opacity: 0.3 }}
                      />
                    );
                  }
                  const dayEvents = getEventsForDay(day);
                  const isToday = isCurrentMonth && currentDay === day;
                  const isSelected = selectedDay === day;
                  const hasGrace = dayEvents.some((e) => e.isGraceDeadline);
                  const hasOriginal = dayEvents.some((e) => e.isOriginalDeadline);

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      style={{
                        height: '70px',
                        minHeight: '70px',
                        maxHeight: '70px',
                        borderRadius: '8px',
                        border: isSelected
                          ? '2px solid #2563EB'
                          : isToday
                          ? '2px solid #006EB7'
                          : '1px solid #E2E8F0',
                        background: isSelected
                          ? '#EFF6FF'
                          : isToday
                          ? '#F0F9FF'
                          : dayEvents.length > 0
                          ? '#FAFAFA'
                          : '#FFFFFF',
                        padding: '5px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-0.5">
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isToday || isSelected ? 700 : 600,
                            color: isSelected ? '#1D4ED8' : isToday ? '#006EB7' : '#334155',
                          }}
                        >
                          {day}
                        </span>
                      </div>

                      {/* Mobile Dot Indicators */}
                      <div className="d-flex gap-1 d-md-none mt-auto justify-content-center">
                        {hasOriginal && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }} />
                        )}
                        {hasGrace && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />
                        )}
                      </div>

                      {/* Desktop Text Badges */}
                      <div className="d-none d-md-flex flex-column gap-1 flex-grow-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev, i) => {
                          const isGrace = ev.isGraceDeadline;
                          return (
                            <OverlayTrigger
                              key={`${ev.docTypeId}-${i}`}
                              placement="top"
                              overlay={
                                <Tooltip id={`tooltip-${day}-${i}`}>
                                  <div style={{ textAlign: 'left', padding: '4px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>{ev.docTypeLabel}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>{ev.periodLabel}</div>
                                    {isGrace ? (
                                      <div style={{ color: '#FBA100', fontSize: '11px', fontWeight: 600 }}>End of 7-Day Grace Period</div>
                                    ) : (
                                      <div style={{ color: '#38BDF8', fontSize: '11px', fontWeight: 600 }}>Original Due Date</div>
                                    )}
                                  </div>
                                </Tooltip>
                              }
                            >
                              <div
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  background: isGrace ? '#FEF3C7' : '#E0F2FE',
                                  color: isGrace ? '#B45309' : '#0369A1',
                                  border: `1px solid ${isGrace ? '#FDE68A' : '#BAE6FD'}`,
                                }}
                              >
                                {ev.docTypeLabel}
                              </div>
                            </OverlayTrigger>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div style={{ fontSize: '8px', fontWeight: 700, color: '#64748B', textAlign: 'center' }}>
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              {/* Reserved Inspector Card Container (Fixed 100px height prevents modal height jump) */}
              <div style={{ height: '100px', marginTop: '10px' }}>
                {selectedDay !== null ? (
                  <div
                    className="p-3 rounded-3 border shadow-sm h-100 overflow-y-auto"
                    style={{ background: '#F8FAFC', borderColor: '#CBD5E1' }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="m-0 fw-bold text-dark font-headline d-flex align-items-center gap-2" style={{ fontSize: '13px' }}>
                        <span className="material-symbols-outlined text-primary me-1" style={{ fontSize: '16px' }}>event</span>
                        Events on {activeDate.toLocaleDateString('en-US', { month: 'short' })} {selectedDay}, {year}
                      </h6>
                      <button
                        className="btn btn-sm btn-link text-decoration-none text-muted p-0 ms-2"
                        onClick={() => setSelectedDay(null)}
                        style={{ fontSize: '11px' }}
                      >
                        Clear
                      </button>
                    </div>
                    {selectedDayEvents.length === 0 ? (
                      <p className="m-0 mt-2 text-muted" style={{ fontSize: '12px' }}>No deadlines scheduled on this date.</p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {selectedDayEvents.map((ev, i) => (
                          <div
                            key={`sel-${i}`}
                            className="d-flex align-items-center justify-content-between p-2 rounded-2 bg-white border"
                          >
                            <div className="text-truncate me-2" style={{ minWidth: 0 }}>
                              <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '12px' }} title={ev.docTypeLabel}>{ev.docTypeLabel}</div>
                              <div className="text-secondary text-truncate" style={{ fontSize: '10px' }}>
                                {ev.periodLabel} • {ev.frequency}
                              </div>
                            </div>
                            <span
                              className={`badge flex-shrink-0 ${ev.isGraceDeadline ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle'} rounded-pill px-2 py-0.5`}
                              style={{ fontSize: '10px' }}
                            >
                              {ev.isGraceDeadline ? 'Final Grace' : 'Original'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="p-3 rounded-3 border text-center text-muted h-100 d-flex align-items-center justify-content-center"
                    style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}
                  >
                    <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#94A3B8' }}>ads_click</span>
                    <span style={{ fontSize: '12px' }}>Click any date on the grid to inspect details</span>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Right Column: Chronological Feed */}
          <Col
            lg={5}
            className={`${activeTab === 'feed' ? 'd-block' : 'd-none d-lg-block'} bg-light p-3 p-md-4 d-flex flex-column`}
            style={{ minHeight: '620px', maxHeight: '620px' }}
          >
            <div className="mb-3 pb-2 border-bottom flex-shrink-0">
              <h5 className="m-0 fw-bold text-dark font-headline" style={{ fontSize: '15px' }}>
                Upcoming Deadlines for {activeDate.toLocaleDateString('en-US', { month: 'long' })}
              </h5>
              <p className="m-0 text-secondary mt-1" style={{ fontSize: '12px' }}>
                Chronologically ordered for compliance tracking
              </p>
            </div>

            <div className="flex-grow-1 overflow-y-auto pe-1">
              {monthEvents.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: '40px' }}>event_busy</span>
                  <div className="fw-medium mt-2" style={{ fontSize: '14px' }}>No deadlines this month</div>
                  <p className="text-secondary" style={{ fontSize: '12px' }}>Use month controls to inspect other periods.</p>
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
                        className="d-flex align-items-start gap-3 p-3 mb-2 rounded-3 bg-white border shadow-sm"
                      >
                        <div
                          className="rounded-3 text-center overflow-hidden border flex-shrink-0"
                          style={{ minWidth: '48px' }}
                        >
                          <div
                            className={`text-white fw-bold text-uppercase ${ev.isGraceDeadline ? 'bg-warning' : 'bg-primary'}`}
                            style={{ fontSize: '10px', padding: '2px 0' }}
                          >
                            {evDate.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="fw-bold fs-5 text-dark py-1" style={{ lineHeight: 1.1 }}>
                            {evDate.getDate()}
                          </div>
                        </div>
                        <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '13px' }} title={ev.docTypeLabel}>{ev.docTypeLabel}</div>
                          <div className="text-secondary my-1 text-truncate" style={{ fontSize: '12px' }}>
                            {ev.periodLabel} • <span className="text-lowercase">{ev.frequency}</span>
                          </div>
                          <span
                            className={`badge ${ev.isGraceDeadline ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle'} rounded-pill px-2 py-0.5`}
                            style={{ fontSize: '10px' }}
                          >
                            {ev.isGraceDeadline ? 'Final Grace Deadline' : 'Original Deadline'}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
};

export default ComplianceCalendar;

