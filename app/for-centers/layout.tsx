/**
 * SEO-Optimized Layout for /for-centers
 * Incluye metadata, Open Graph, y Structured Data
 */

import { Metadata } from 'next';
import { generatePageMetadata, generateOrganizationSchema, generateSoftwareApplicationSchema } from '@/lib/seo';

// ============================================
// METADATA (SEO)
// ============================================

export const metadata: Metadata = generatePageMetadata({
  title: 'Software de Gestión para Centros Deportivos y Gimnasios',
  description:
    'RivalFit es la plataforma todo-en-uno para gestionar tu centro deportivo: reservas de clases, pagos online, tienda, analytics y captación de leads. Prueba gratis 14 días. Desde €49/mes.',
  locale: 'es',
  keywords: [
    'gestión gimnasio',
    'software crossfit',
    'app reservas fitness',
    'CRM deportivo',
    'sistema pagos gym',
    'plataforma yoga studio',
  ],
  image: '/og-for-centers.jpg',
  canonical: 'https://rivalfit.app/for-centers',
});

// ============================================
// LAYOUT
// ============================================

export default function ForCentersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured Data (JSON-LD)
  const organizationSchema = generateOrganizationSchema();
  const softwareSchema = generateSoftwareApplicationSchema();

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      {children}
    </>
  );
}
