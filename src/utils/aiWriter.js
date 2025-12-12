// Simple "AI" Generator for Marketing Copy
const TEMPLATES = [
    "¡Gánate {prize} por solo ${price}! 🤑 Juega con {lottery} este fin de semana. ¡Quedan pocos números! 🏃‍♂️💨",
    "¿Te imaginas estrenando {prize}? 🏍️💨 Solo inviertes ${price} y participa con {lottery}. ¡Aparta tu número de la suerte ya! 🍀",
    "¡Gran Sorteo {name}! 🏆 Apóyanos y gana. Boletas a ${price}. Juega con las {digits} cifras de {lottery}. ¡No te quedes por fuera! 🔥",
    "💰 Oportunidad única: {prize} puede ser tuyo. Juega con {lottery}. Valor boleta: ${price}. ¡Escríbeme para apartar tu número! 📲",
];

export const generateMagicCopy = (raffleName, price, lotteryName, digits) => {
    const prize = raffleName; // We assume raffle name often implies prize or we use placeholder
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

    return template
        .replace('{name}', raffleName)
        .replace('{prize}', raffleName) // Heuristic
        .replace('{price}', price.toLocaleString())
        .replace('{lottery}', lotteryName)
        .replace('{digits}', digits);
};
