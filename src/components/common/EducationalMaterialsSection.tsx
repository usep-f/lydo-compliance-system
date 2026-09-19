import React from 'react';
import { Row, Col, Form, InputGroup, Button, Spinner } from 'react-bootstrap';
import {
  EDUCATIONAL_CATEGORIES,
  type EducationalMaterial,
  type useEducationalMaterials,
} from '../../hooks/useEducationalMaterials';
import EducationalMaterialCard from './EducationalMaterialCard';

interface EducationalMaterialsSectionProps {
  materialsHook: ReturnType<typeof useEducationalMaterials>;
  isAdmin?: boolean;
  onOpenUploadModal?: () => void;
  onEditMaterial?: (material: EducationalMaterial) => void;
  onDeleteMaterial?: (material: EducationalMaterial) => void;
}

const EducationalMaterialsSection: React.FC<EducationalMaterialsSectionProps> = ({
  materialsHook,
  isAdmin = false,
  onOpenUploadModal,
  onEditMaterial,
  onDeleteMaterial,
}) => {
  const {
    filteredMaterials,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
  } = materialsHook;

  return (
    <div className="educational-materials-container">
      {/* Header Banner */}
      <div
        className="p-4 p-md-5 rounded-4 mb-4 text-white position-relative overflow-hidden shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        }}
      >
        <div className="position-relative" style={{ zIndex: 2, maxWidth: '720px' }}>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white bg-opacity-10 text-white mb-3" style={{ fontSize: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              school
            </span>
            <span>LYDO Knowledge Hub & Resource Center</span>
          </div>
          <h2 className="fw-bold text-white mb-2" style={{ fontSize: '24px' }}>
            Educational & Governance Materials
          </h2>
          <p className="text-white text-opacity-75 mb-0" style={{ fontSize: '14px', lineHeight: 1.6 }}>
            Browse policy handbooks, financial guidelines, resolution templates, and training videos curated by the Local Youth Development Office to support your SK governance operations.
          </p>
        </div>

        {/* Decorative background circle */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: '-40px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm mb-4">
        <div className="row g-3 align-items-center mb-3">
          {/* Search Input */}
          <div className="col-12 col-md-6 col-lg-7">
            <InputGroup>
              <InputGroup.Text className="bg-light border-end-0 text-muted">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  search
                </span>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by topic, keywords, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-light border-start-0 ps-0"
                style={{ fontSize: '13px' }}
              />
              {searchQuery && (
                <Button
                  variant="light"
                  className="border border-start-0 text-muted"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    close
                  </span>
                </Button>
              )}
            </InputGroup>
          </div>

          {/* Format / Type Selector */}
          <div className="col-12 col-md-6 col-lg-3">
            <Form.Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-light"
              style={{ fontSize: '13px' }}
            >
              <option value="All">All Formats</option>
              <option value="pdf">PDF Documents (.pdf)</option>
              <option value="docx">Word Documents (.docx)</option>
              <option value="xlsx">Spreadsheets (.xlsx)</option>
              <option value="pptx">Presentations (.pptx)</option>
              <option value="video_link">Video Tutorials</option>
              <option value="external_link">Web Resources</option>
            </Form.Select>
          </div>

          {/* Admin Upload Button */}
          {isAdmin && onOpenUploadModal && (
            <div className="col-12 col-lg-2 text-lg-end">
              <Button
                variant="primary"
                onClick={onOpenUploadModal}
                className="w-100 d-inline-flex align-items-center justify-content-center gap-1 fw-semibold rounded-2 py-2"
                style={{ fontSize: '13px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add
                </span>
                Upload Material
              </Button>
            </div>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="d-flex align-items-center gap-2 overflow-x-auto pb-1 pt-1" style={{ whiteSpace: 'nowrap' }}>
          <span className="text-muted fw-semibold me-1" style={{ fontSize: '12px' }}>
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`btn btn-sm rounded-pill px-3 py-1 fw-medium transition-all ${
              selectedCategory === 'All'
                ? 'btn-primary shadow-sm'
                : 'btn-outline-secondary border-0 bg-light text-dark'
            }`}
            style={{ fontSize: '12px' }}
          >
            All Categories
          </button>
          {EDUCATIONAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm rounded-pill px-3 py-1 fw-medium transition-all ${
                selectedCategory === cat
                  ? 'btn-primary shadow-sm'
                  : 'btn-outline-secondary border-0 bg-light text-dark'
              }`}
              style={{ fontSize: '12px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3 mb-4">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Materials List / Grid */}
      {loading ? (
        <div className="text-center py-5 bg-white rounded-3 border shadow-sm">
          <Spinner animation="border" variant="primary" role="status" className="mb-2" />
          <div className="text-muted fw-medium" style={{ fontSize: '13px' }}>
            Loading educational materials...
          </div>
        </div>
      ) : filteredMaterials.length > 0 ? (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 text-muted" style={{ fontSize: '13px' }}>
            <span>
              Showing <strong className="text-dark">{filteredMaterials.length}</strong> resource
              {filteredMaterials.length === 1 ? '' : 's'}
            </span>
            {(searchQuery || selectedCategory !== 'All' || selectedType !== 'All') && (
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none p-0 text-muted"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedType('All');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          <Row className="g-4">
            {filteredMaterials.map((material) => (
              <Col key={material.id} xs={12} md={6} lg={4}>
                <EducationalMaterialCard
                  material={material}
                  isAdmin={isAdmin}
                  onEdit={onEditMaterial}
                  onDelete={onDeleteMaterial}
                />
              </Col>
            ))}
          </Row>
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-5 px-3 bg-white rounded-3 border shadow-sm my-3">
          <div
            className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: '64px', height: '64px' }}
          >
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>
              {searchQuery || selectedCategory !== 'All' || selectedType !== 'All'
                ? 'search_off'
                : 'menu_book'}
            </span>
          </div>

          <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '16px' }}>
            {searchQuery || selectedCategory !== 'All' || selectedType !== 'All'
              ? 'No matching materials found'
              : 'No educational materials available yet'}
          </h5>

          <p className="text-muted mx-auto mb-3" style={{ fontSize: '13px', maxWidth: '420px' }}>
            {searchQuery || selectedCategory !== 'All' || selectedType !== 'All'
              ? 'Try changing your search terms, clearing category filters, or selecting all formats.'
              : isAdmin
              ? 'You have not uploaded any educational materials yet. Click "Upload Material" to publish guides, handbooks, and video tutorials for SK officials.'
              : 'The LYDO office has not uploaded educational materials yet. Check back soon for compliance guides and training resources.'}
          </p>

          {(searchQuery || selectedCategory !== 'All' || selectedType !== 'All') ? (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedType('All');
              }}
              style={{ fontSize: '13px' }}
            >
              Clear All Filters
            </Button>
          ) : (
            isAdmin && onOpenUploadModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenUploadModal}
                className="d-inline-flex align-items-center gap-1 fw-semibold"
                style={{ fontSize: '13px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  add
                </span>
                Upload First Material
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default EducationalMaterialsSection;
