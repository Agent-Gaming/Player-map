import React from 'react';
import styles from './Positions.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className={styles.paginationRow}>
        {/* Bouton Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.navBtn}
        >
          ←
        </button>

        {/* Numéros de page avec ellipses */}
        <div className={styles.pageNumbers}>
          {(() => {
            const getVisiblePages = () => {
              const pages = [];
              
              // Toujours afficher la première page
              pages.push(1);
              
              // Si on est loin du début, ajouter "..."
              if (currentPage > 3) {
                pages.push('...');
              }
              
              // Pages autour de la page courante
              const start = Math.max(2, currentPage - 1);
              const end = Math.min(totalPages - 1, currentPage + 1);
              
              for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                  pages.push(i);
                }
              }
              
              // Si on est loin de la fin, ajouter "..."
              if (currentPage < totalPages - 2) {
                pages.push('...');
              }
              
              // Toujours afficher la dernière page (si plus d'une page)
              if (totalPages > 1) {
                pages.push(totalPages);
              }
              
              return pages;
            };
            
            const visiblePages = getVisiblePages();
            
            return visiblePages.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className={styles.pageEllipsis}
                  >
                    ...
                  </span>
                );
              }
              
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`${styles.pageNumBtn} ${page === currentPage ? styles.pageNumBtnActive : ''}`}
                >
                  {page}
                </button>
              );
            });
          })()}
        </div>

        {/* Bouton Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.navBtn}
        >
          →
        </button>
    </div>
  );
};

export default Pagination;
