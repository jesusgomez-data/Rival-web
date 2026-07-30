// Tipos de reto que se pueden calcular solos a partir de la actividad real
// del usuario — sin esto, cualquier reto de "entrena X días" dependía de que
// el usuario escribiera su propio progreso a mano (ChallengeProgressUpdate),
// lo cual no tiene sentido: nadie debería tener que autoinformar cuántos
// días entrenó cuando la app ya lo sabe.
export const AUTO_TRACKABLE_GOAL_TYPES = ['streak', 'workouts', 'sessions'];

export function isAutoTrackableChallenge(goalType: string) {
    return AUTO_TRACKABLE_GOAL_TYPES.includes(goalType);
}
