import React, { useState } from 'react';
import { Table, Pagination, Card } from 'react-bootstrap';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  emptyMessage?: string;
  hover?: boolean;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 6,
  emptyMessage = "No records found.",
  hover = true,
  className = ""
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Track previous data to see if it actually changed (shallow array comparison)
  // This resets the page back to 1 if search filters/datasets change,
  // but keeps the current page active when clicking next/prev pagination buttons.
  const [prevData, setPrevData] = useState<T[]>(data);

  if (data !== prevData) {
    const isDifferent = data.length !== prevData.length || 
      data.some((item, index) => item !== prevData[index]);
    
    if (isDifferent) {
      setCurrentPage(1);
    }
    setPrevData(data);
  }

  // Total pages calculation
  const totalPages = Math.ceil(data.length / pageSize);
  
  // Guard activePage inside valid bounds (e.g. if list shrinks due to filtering)
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

  const startIndex = (activePage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Generate pages to show with ellipsis for responsive pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Number of pages to show around activePage
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= activePage - delta && i <= activePage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className={`card border-0 overflow-hidden ${className}`}>
      {/* Desktop View: Tabular Layout */}
      <div className="d-none d-md-block table-responsive">
        <Table hover={hover} className="mb-0 align-middle">
          <thead className="bg-light text-secondary">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className={`px-4 py-3 border-0 fw-bold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col, colIndex) => {
                    const content = col.render 
                      ? col.render(item) 
                      : col.accessor 
                        ? String(item[col.accessor] ?? '')
                        : '';
                    return (
                      <td key={colIndex} className={`px-4 py-3 ${col.className || ''}`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-5 text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Mobile View: Clean Card-based Layout */}
      <div className="d-md-none bg-light p-3">
        {paginatedData.length > 0 ? (
          paginatedData.map((item, rowIndex) => (
            <Card key={rowIndex} className="mb-3 border-0 shadow-sm rounded-3 overflow-hidden">
              <Card.Body className="p-3">
                {columns.map((col, colIndex) => {
                  const content = col.render 
                    ? col.render(item) 
                    : col.accessor 
                      ? String(item[col.accessor] ?? '')
                      : '';
                  
                  // Render the first column (e.g. Name) as the Card header
                  if (colIndex === 0) {
                    return (
                      <div key={colIndex} className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                        <div className={`fw-bold text-dark fs-6 ${col.className || ''}`}>
                          {content}
                        </div>
                      </div>
                    );
                  }
                  
                  // Check if this column is the Action column (usually buttons)
                  const isAction = col.header.toLowerCase() === 'action';
                  if (isAction) {
                    return (
                      <div key={colIndex} className="d-grid mt-3 pt-2 border-top">
                        {content}
                      </div>
                    );
                  }

                  return (
                    <div key={colIndex} className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-medium">{col.header}</span>
                      <span className={`text-end small ${col.className || ''}`}>{content}</span>
                    </div>
                  );
                })}
              </Card.Body>
            </Card>
          ))
        ) : (
          <div className="text-center py-5 text-muted bg-white rounded border">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Responsive Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center px-4 py-3 border-top bg-light gap-3">
          <div className="text-muted small text-center text-sm-start">
            Showing <strong className="text-dark">{startIndex + 1}</strong> to{" "}
            <strong className="text-dark">
              {Math.min(startIndex + pageSize, data.length)}
            </strong>{" "}
            of <strong className="text-dark">{data.length}</strong> entries
          </div>
          
          <Pagination className="mb-0 shadow-sm flex-wrap justify-content-center">
            <Pagination.Prev 
              disabled={activePage === 1} 
              onClick={() => handlePageChange(activePage - 1)} 
            />
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return <Pagination.Ellipsis key={`ellipsis-${index}`} disabled />;
              }
              const pageNum = page as number;
              return (
                <Pagination.Item 
                  key={pageNum} 
                  active={pageNum === activePage}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Pagination.Item>
              );
            })}
            <Pagination.Next 
              disabled={activePage === totalPages} 
              onClick={() => handlePageChange(activePage + 1)} 
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}
