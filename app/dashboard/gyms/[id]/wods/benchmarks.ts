export const BENCHMARKS = [
    {
        name: "MURPH",
        warmup: "1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Air Squats\n1 mile Run\n*With weight vest 20/14lb",
        summary: { totalTime: "60:00", scoreType: "TIME", scoreLabel: "MURPH RX TIME" },
        blocks: [
            {
                id: 'murph-main',
                type: 'wod',
                format: 'ROUNDS FOR TIME',
                config: { rounds: 1, timecap: '60:00' },
                content: "1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Air Squats\n1 mile Run",
                mode: 'text'
            }
        ]
    },
    {
        name: "FRAN",
        summary: { totalTime: "10:00", scoreType: "TIME", scoreLabel: "FRAN RX TIME" },
        blocks: [
            {
                id: 'fran-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '10:00' },
                content: "21-15-9\nThrusters (95/65 lb)\nPull-ups",
                mode: 'text',
                exercises: [
                    { id: 'fran-ex-1', name: 'Thrusters', reps: '21-15-9', value: '43' },
                    { id: 'fran-ex-2', name: 'Pull-ups', reps: '21-15-9' }
                ]
            }
        ]
    },
    {
        name: "CINDY",
        summary: { totalTime: "20:00", scoreType: "ROUNDS", scoreLabel: "CINDY TOTAL ROUNDS" },
        blocks: [
            {
                id: 'cindy-main',
                type: 'wod',
                format: 'AMRAP',
                config: { timecap: '20:00' },
                content: "5 Pull-ups\n10 Push-ups\n15 Air Squats",
                mode: 'text'
            }
        ]
    },
    {
        name: "THE CHIEF",
        summary: { totalTime: "15:00", scoreType: "ROUNDS", scoreLabel: "CHIEF TOTAL ROUNDS" },
        blocks: [
            {
                id: 'chief-main',
                type: 'wod',
                format: 'AMRAP',
                config: { timecap: '3:00' },
                content: "5 Rounds of AMRAP 3:\n3 Power Cleans (135/95)\n6 Push-ups\n9 Air Squats\nRest 1 min between cycles",
                mode: 'text'
            }
        ]
    },
    {
        name: "HELEN",
        summary: { totalTime: "15:00", scoreType: "TIME", scoreLabel: "HELEN RX TIME" },
        blocks: [
            {
                id: 'helen-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '15:00' },
                content: "3 Rounds of:\n400m Run\n21 KB Swings (24/16kg)\n12 Pull-ups",
                mode: 'text'
            }
        ]
    },
    {
        name: "DIANE",
        summary: { totalTime: "10:00", scoreType: "TIME", scoreLabel: "DIANE RX TIME" },
        blocks: [
            {
                id: 'diane-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '10:00' },
                content: "21-15-9\nDeadlifts (225/155lb)\nHandstand Push-ups",
                mode: 'text'
            }
        ]
    },
    {
        name: "LINDA",
        summary: { totalTime: "30:00", scoreType: "TIME", scoreLabel: "LINDA RX TIME" },
        blocks: [
            {
                id: 'linda-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '30:00' },
                content: "10-9-8-7-6-5-4-3-2-1\nDeadlift (1.5x BW)\nBench Press (BW)\nClean (0.75x BW)",
                mode: 'text'
            }
        ]
    },
    {
        name: "GRACE",
        summary: { totalTime: "05:00", scoreType: "TIME", scoreLabel: "GRACE RX TIME" },
        blocks: [
            {
                id: 'grace-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '05:00' },
                content: "30 Clean & Jerks (135/95 lbs)",
                mode: 'text',
                exercises: [{ id: 'grace-ex-1', name: 'Clean & Jerk', reps: '30', value: '61' }]
            }
        ]
    },
    {
        name: "ISABEL",
        summary: { totalTime: "05:00", scoreType: "TIME", scoreLabel: "ISABEL RX TIME" },
        blocks: [
            {
                id: 'isabel-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '05:00' },
                content: "30 Snatches (135/95 lbs)",
                mode: 'text',
                exercises: [{ id: 'isabel-ex-1', name: 'Snatch', reps: '30', value: '61' }]
            }
        ]
    },
    {
        name: "ANNIE",
        summary: { totalTime: "10:00", scoreType: "TIME", scoreLabel: "ANNIE RX TIME" },
        blocks: [
            {
                id: 'annie-main',
                type: 'wod',
                format: 'FOR TIME',
                config: { timecap: '10:00' },
                content: "50-40-30-20-10\nDouble Unders\nSit-ups",
                mode: 'text'
            }
        ]
    }
];
