import React, { useState } from 'react';
import { Table, Pagination } from 'react-bootstrap';

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
  pageSize = 5,
  emptyMessage = "No records found.",
  hover = true,
  className = ""
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Total pages calculation
  const totalPages = Math.ceil(data.length / pageSize);
  
  // Guard activePage inside valid bounds (e.g. if list shrinks due to filtering)
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

  const startIndex = (activePage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className={`border rounded shadow-sm bg-white ${className}`}>
      <div className="table-responsive">
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

      {totalPages > 1 && (
        <div className="d-flex flex-wrap justify-content-between align-items-center px-4 py-3 border-top bg-light gap-3">
          <div className="text-muted small">
            Showing <strong className="text-dark">{startIndex + 1}</strong> to{" "}
            <strong className="text-dark">
              {Math.min(startIndex + pageSize, data.length)}
            </strong>{" "}
            of <strong className="text-dark">{data.length}</strong> entries
          </div>
          
          <Pagination className="mb-0 shadow-sm">
            <Pagination.Prev 
              disabled={activePage === 1} 
              onClick={() => handlePageChange(activePage - 1)} 
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Pagination.Item 
                key={page} 
                active={page === activePage}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Pagination.Item>
            ))}
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
