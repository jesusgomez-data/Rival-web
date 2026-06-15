// Tipos de profesional unificados para toda la plataforma.
// Todos usan la misma arquitectura de organizations + professional_services.

export const PROFESSIONAL_TYPES: Record<string, { label: string; icon: string; category: 'fitness' | 'health' | 'wellness' }> = {
    personal_trainer:     { label: 'Entrenador Personal',      icon: '🏋️', category: 'fitness'  },
    physiotherapist:      { label: 'Fisioterapeuta',           icon: '🩺', category: 'health'   },
    nutritionist:         { label: 'Nutricionista',            icon: '🥗', category: 'health'   },
    psychologist:         { label: 'Psicólogo Deportivo',      icon: '🧠', category: 'wellness' },
    doctor:               { label: 'Médico Deportivo',         icon: '⚕️', category: 'health'   },
    osteopath:            { label: 'Osteópata',                icon: '💆', category: 'health'   },
    massage_therapist:    { label: 'Terapeuta de Masaje',      icon: '🙌', category: 'wellness' },
    yoga_instructor:      { label: 'Instructor de Yoga',       icon: '🧘', category: 'fitness'  },
    pilates_instructor:   { label: 'Instructor de Pilates',    icon: '🤸', category: 'fitness'  },
    coach:                { label: 'Coach de Rendimiento',     icon: '🎯', category: 'fitness'  },
    dietitian:            { label: 'Dietista',                 icon: '🥑', category: 'health'   },
    chiropractor:         { label: 'Quiropráctico',            icon: '🦴', category: 'health'   },
    personal_shopper:     { label: 'Personal Shopper Fitness', icon: '👟', category: 'wellness' },
    swimming_coach:       { label: 'Entrenador de Natación',   icon: '🏊', category: 'fitness'  },
    boxing_coach:         { label: 'Entrenador de Boxeo',      icon: '🥊', category: 'fitness'  },
    running_coach:        { label: 'Entrenador de Running',    icon: '🏃', category: 'fitness'  },
    cycling_coach:        { label: 'Entrenador de Ciclismo',   icon: '🚴', category: 'fitness'  },
}

// Tipos que son "profesionales individuales" (no centros/gimnasios)
export const INDIVIDUAL_PROFESSIONAL_TYPES = Object.keys(PROFESSIONAL_TYPES)

// Tipos que son centros/instalaciones (no profesionales individuales)
export const CENTER_TYPES: Record<string, { label: string; icon: string }> = {
    crossfit:   { label: 'CrossFit',         icon: '🏋️' },
    gym:        { label: 'Gimnasio',          icon: '💪' },
    running:    { label: 'Running Club',      icon: '🏃' },
    yoga:       { label: 'Yoga Studio',       icon: '🧘' },
    padel:      { label: 'Pádel',            icon: '🎾' },
    dance:      { label: 'Danza',            icon: '💃' },
    swimming:   { label: 'Natación',         icon: '🏊' },
    boxing:     { label: 'Boxeo / MMA',      icon: '🥊' },
    cycling:    { label: 'Ciclismo / Spin',  icon: '🚴' },
    wellness:   { label: 'Wellness Center',  icon: '🌿' },
    other:      { label: 'Otro',             icon: '🏢' },
}

export const ALL_ORG_TYPES = { ...PROFESSIONAL_TYPES, ...CENTER_TYPES }

export function isProfessional(centerType: string): boolean {
    return centerType in PROFESSIONAL_TYPES
}

export function getTypeLabel(centerType: string): string {
    return ALL_ORG_TYPES[centerType]?.label ?? centerType
}

export function getTypeIcon(centerType: string): string {
    return ALL_ORG_TYPES[centerType]?.icon ?? '🏢'
}

export const SERVICE_MODALITIES = [
    { key: 'presential', label: 'Presencial',   icon: '🏢' },
    { key: 'home',       label: 'A domicilio',  icon: '🏠' },
    { key: 'online',     label: 'Online',       icon: '💻' },
]

export const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:              { label: 'Pendiente',         color: 'yellow'  },
    accepted:             { label: 'Aceptado',          color: 'blue'    },
    rejected:             { label: 'Rechazado',         color: 'red'     },
    paid:                 { label: 'Pagado',            color: 'green'   },
    in_progress:          { label: 'En progreso',       color: 'purple'  },
    completed_by_pro:     { label: 'Completado (pro)',  color: 'indigo'  },
    completed_by_client:  { label: 'Completado (cliente)', color: 'indigo' },
    completed:            { label: 'Completado',        color: 'green'   },
    paid_out:             { label: 'Pagado al pro',     color: 'gray'    },
    cancelled:            { label: 'Cancelado',         color: 'red'     },
    disputed:             { label: 'En disputa',        color: 'orange'  },
}
