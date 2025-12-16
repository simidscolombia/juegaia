export const LOTTERY_DATA = [
    { name: "Chontico Día", days: [0, 1, 2, 3, 4, 5, 6], time: "13:00" },
    { name: "Chontico Noche", days: [0, 1, 2, 3, 4, 5], time: "19:00" }, // Domingos varía
    { name: "Paisita Día", days: [0, 1, 2, 3, 4, 5, 6], time: "13:00" },
    { name: "Paisita Noche", days: [0, 1, 2, 3, 4, 5, 6], time: "18:00" },
    { name: "Lotería de Bogotá", days: [4], time: "22:30" }, // Jueves
    { name: "Lotería de Medellín", days: [5], time: "23:00" }, // Viernes
    { name: "Lotería de Boyacá", days: [6], time: "22:40" }, // Sábado
    { name: "Lotería del Valle", days: [3], time: "22:30" }, // Miércoles
    { name: "Lotería de Cundinamarca", days: [1], time: "22:30" }, // Lunes
    { name: "Lotería del Tolima", days: [1], time: "22:30" }, // Lunes
    { name: "Lotería del Huila", days: [2], time: "22:30" }, // Martes
    { name: "Lotería del Meta", days: [3], time: "22:30" }, // Miércoles
    { name: "Lotería de Manizales", days: [3], time: "23:00" }, // Miércoles
    { name: "Lotería del Cauca", days: [6], time: "23:00" }, // Sábado
    { name: "Lotería de Santander", days: [5], time: "23:00" }, // Viernes
    { name: "Lotería del Risaralda", days: [5], time: "23:00" }, // Viernes
    { name: "Lotería del Quindío", days: [4], time: "22:30" }, // Jueves
    { name: "Lotería de la Cruz Roja", days: [2], time: "22:30" }, // Martes
    { name: "Pijao de Oro", days: [0, 1, 2, 3, 4, 5, 6], time: "14:00" },
    { name: "Culona Día", days: [0, 1, 2, 3, 4, 5, 6], time: "14:00" },
    { name: "Culona Noche", days: [0, 1, 2, 3, 4, 5, 6], time: "21:00" },
    { name: "Sinuano Día", days: [0, 1, 2, 3, 4, 5, 6], time: "14:30" },
    { name: "Sinuano Noche", days: [0, 1, 2, 3, 4, 5, 6], time: "22:30" },
    { name: "Caribeña Día", days: [0, 1, 2, 3, 4, 5, 6], time: "14:30" },
    { name: "Caribeña Noche", days: [0, 1, 2, 3, 4, 5, 6], time: "22:30" },
    { name: "Astro Sol", days: [0, 1, 2, 3, 4, 5, 6], time: "14:30" },
    { name: "Astro Luna", days: [0, 1, 2, 3, 4, 5, 6], time: "22:30" },
    { name: "Dorado Mañana", days: [1, 2, 3, 4, 5, 6], time: "11:00" },
    { name: "Dorado Tarde", days: [0, 1, 2, 3, 4, 5, 6], time: "15:30" }
];

export const getLotterySchedule = (name) => {
    return LOTTERY_DATA.find(l => l.name === name);
};

export const COMMON_LOTTERIES = LOTTERY_DATA.map(l => l.name);
