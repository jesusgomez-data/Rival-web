// Bloques/filas que no son un ejercicio real con peso levantado — se cuelan
// en el WOD como "Rest"/"Calentamiento" y a veces traen un numero suelto
// (rondas, minutos...) que parece un peso pero no lo es.
export const NON_EXERCISE_NAMES = /^(rest|descanso|warm[\s-]?up|calentamiento|cooldown|enfriamiento|stretch|estiramiento)s?$/i

export function extractWeightKg(ex: any): number | null {
    const raw = ex?.detail ?? ex?.value
    const unit = String(ex?.unit ?? ex?.weightUnit ?? 'kg').toLowerCase()
    if (unit !== 'kg') return null
    const weight = parseFloat(String(raw).replace(',', '.'))
    if (!Number.isFinite(weight) || weight <= 0 || weight >= 500) return null
    return weight
}
