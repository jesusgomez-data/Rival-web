export const BENCHMARKS = [
    {
        name: "MURPH",
        title: "MURPH",
        summary: { totalTime: "60:00", scoreType: "TIME", scoreLabel: "MURPH RX TIME" },
        blocks: [
            {
                id: 'murph-main',
                title: 'WOD',
                format: 'FOR TIME',
                config: { timecap: '60:00' },
                exercises: [
                    { id: 'm1', name: '1 MILE RUN', reps: '1', detail: '' },
                    { id: 'm2', name: 'PULL-UPS', reps: '100', detail: '' },
                    { id: 'm3', name: 'PUSH-UPS', reps: '200', detail: '' },
                    { id: 'm4', name: 'AIR SQUATS', reps: '300', detail: '' },
                    { id: 'm5', name: '1 MILE RUN', reps: '1', detail: '' }
                ]
            }
        ]
    },
    {
        name: "FRAN",
        title: "FRAN",
        summary: { totalTime: "10:00", scoreType: "TIME", scoreLabel: "FRAN RX TIME" },
        blocks: [
            {
                id: 'fran-main',
                title: 'WOD',
                format: '21-15-9',
                config: { timecap: '10:00' },
                exercises: [
                    { id: 'f1', name: 'THRUSTERS (95/65 LB)', reps: '21-15-9', detail: '' },
                    { id: 'f2', name: 'PULL-UPS', reps: '21-15-9', detail: '' }
                ]
            }
        ]
    },
    {
        name: "ELIZABETH",
        title: "ELIZABETH",
        summary: { totalTime: "15:00", scoreType: "TIME", scoreLabel: "ELIZABETH RX TIME" },
        blocks: [
            {
                id: 'elizabeth-main',
                title: 'WOD',
                format: '21-15-9',
                config: { timecap: '15:00' },
                exercises: [
                    { id: 'e1', name: 'CLEANS (135/95 LB)', reps: '21-15-9', detail: '' },
                    { id: 'e2', name: 'RING DIPS', reps: '21-15-9', detail: '' }
                ]
            }
        ]
    },
    {
        name: "DIANE",
        title: "DIANE",
        summary: { totalTime: "15:00", scoreType: "TIME", scoreLabel: "DIANE RX TIME" },
        blocks: [
            {
                id: 'diane-main',
                title: 'WOD',
                format: '21-15-9',
                config: { timecap: '15:00' },
                exercises: [
                    { id: 'd1', name: 'DEADLIFTS (225/155 LB)', reps: '21-15-9', detail: '' },
                    { id: 'd2', name: 'HANDSTAND PUSH-UPS', reps: '21-15-9', detail: '' }
                ]
            }
        ]
    },
    {
        name: "CINDY",
        title: "CINDY",
        summary: { totalTime: "20:00", scoreType: "ROUNDS", scoreLabel: "CINDY TOTAL ROUNDS" },
        blocks: [
            {
                id: 'cindy-main',
                title: 'WOD',
                format: 'AMRAP',
                config: { timecap: '20:00' },
                exercises: [
                    { id: 'c1', name: 'PULL-UPS', reps: '5', detail: '' },
                    { id: 'c2', name: 'PUSH-UPS', reps: '10', detail: '' },
                    { id: 'c3', name: 'AIR SQUATS', reps: '15', detail: '' }
                ]
            }
        ]
    },
    {
        name: "THE CHIEF",
        title: "THE CHIEF",
        summary: { totalTime: "15:00", scoreType: "ROUNDS", scoreLabel: "CHIEF TOTAL ROUNDS" },
        blocks: [
            {
                id: 'chief-main',
                title: '5 ROUNDS OF AMRAP 3',
                format: 'AMRAP',
                config: { timecap: '3:00' },
                exercises: [
                    { id: 'tc1', name: 'POWER CLEANS (135/95)', reps: '3', detail: '' },
                    { id: 'tc2', name: 'PUSH-UPS', reps: '6', detail: '' },
                    { id: 'tc3', name: 'AIR SQUATS', reps: '9', detail: '' }
                ]
            }
        ]
    }
];
