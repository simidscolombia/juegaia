// Storage Utility with Supabase Integration
import { supabase } from './supabaseClient';
// Bingo Logic merged here to prevent circular dependencies

// --- BINGO SYSTEM (SUPABASE CLOUD) ---

export const getGames = async () => {
    const { data, error } = await supabase
        .from('bingo_games')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const createGame = async (name) => {
    const { data, error } = await supabase
        .from('bingo_games')
        .insert([{
            name,
            status: 'WAITING',
            current_number: null,
            called_numbers: []
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateGame = async (gameId, updates) => {
    // Map camelCase to snake_case if needed, but for jsonb/new tables we used snake_case in SQL
    // Let's assume the UI sends camelCase, we might need mapping.
    // However, simplest is to update the calling code or map here.
    // 'currentNumber' -> 'current_number'
    // 'calledNumbers' -> 'called_numbers'
    // 'lastCallTime' -> 'last_call_time'

    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.currentNumber !== undefined) dbUpdates.current_number = updates.currentNumber;
    if (updates.calledNumbers !== undefined) dbUpdates.called_numbers = updates.calledNumbers;
    if (updates.lastCallTime !== undefined) dbUpdates.last_call_time = updates.lastCallTime;
    if (updates.adminWhatsapp !== undefined) dbUpdates.admin_whatsapp = updates.adminWhatsapp;

    const { data, error } = await supabase
        .from('bingo_games')
        .update(dbUpdates)
        .eq('id', gameId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getGame = async (gameId) => {
    const { data, error } = await supabase
        .from('bingo_games')
        .select('*')
        .select();

    if (error) throw error;
    return data?.[0] || null;
};

// Player/Ticket Management
export const createTicket = async (gameId, playerName, cardMatrix, pin, status = 'PAID', phone = '') => {
    // Note: cardMatrix should be passed in. If not, generate it here?
    // The previous code had a "todo" for generation. 
    // We will assume the UI generates it and passes it, or we import logic here.
    // For now, let's assume the UI handles generation to keep this pure storage.

    if (!cardMatrix) {
        // Fallback if not provided (safety)
        cardMatrix = generateBingoCard();
    }

    const { data, error } = await supabase
        .from('bingo_players')
        .insert([{
            game_id: gameId,
            name: playerName,
            card_matrix: cardMatrix,
            pin: pin,
            // Assuming the DB has these columns. If not, this might fail or ignore them.
            // We adding them to support the Storefront feature.
            status: status,
            phone: phone
        }])
        .select();

    if (error) throw error;
    return data?.[0] || null;
};

// Alias for saveTicket if used
export const saveTicket = async (ticket) => {
    // This was used for local storage pushing. 
    // In Supabase, we usually "createTicket" directly.
    // We'll map it to createTicket if possible or just warn.
    console.warn("saveTicket is deprecated, use createTicket");
    return ticket;
};

export const getAllTickets = async () => {
    // Be careful, this gets ALL players from ALL games?
    // Probably not efficient, but for MVP/equivalence:
    const { data, error } = await supabase.from('bingo_players').select('*');
    if (error) throw error;
    return data;
};

export const getTicket = async (ticketId) => {
    const { data, error } = await supabase
        .from('bingo_players')
        .select('*')
        .select();

    if (error) throw error;
    return data?.[0] || null;
};

export const updateTicket = async (ticketId, updates) => {
    const { data, error } = await supabase
        .from('bingo_players')
        .update(updates)
        .eq('id', ticketId)
        .select();

    if (error) throw error;
    return data?.[0] || null;
};

export const getGameTickets = async (gameId) => {
    const { data, error } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('game_id', gameId);

    if (error) throw error;
    return data;
};

export const getTicketsByPhone = async (gameId, phone) => {
    const { data, error } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('phone', phone);

    if (error) throw error;
    return data;
};

export const approveBatchTickets = async (ticketIds) => {
    if (!ticketIds || ticketIds.length === 0) return [];

    // update status for all
    const { data, error } = await supabase
        .from('bingo_players')
        .update({ status: 'PAID' })
        .in('id', ticketIds)
        .select();

    if (error) throw error;
    return data;
};

// --- WALLET & ECONOMY ---

export const getWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error("Error fetching wallet:", error);
        return { balance: 0 }; // Fallback
    }
    return data?.[0] || null;
};

export const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error("Profile fetch error:", error);
    }

    const profile = data || {};

    // Fallback/Merge with Auth Metadata (Google Login usually puts name here)
    if (!profile.full_name && user.user_metadata?.full_name) {
        profile.full_name = user.user_metadata.full_name;
    }
    if (!profile.email) {
        profile.email = user.email;
    }
    // Ensure ID is present
    profile.id = user.id;

    return profile;
};

// Secure Game Creation (Deducts Balance)
export const createGameWithWallet = async (name) => {
    const COST = 10000; // Hardcoded cost per game for now

    const { data, error } = await supabase
        .rpc('create_game_with_wallet', {
            game_name: name,
            cost: COST
        });

    if (error) throw error;
    return data; // Returns { success: true, game_id: ..., new_balance: ... }
};

// Admin Mock Recharge (For Demo)
export const mockRecharge = async (amount) => {
    // In production this connects to Wompi/Stripe
    // Here we use the RPC if available or just manual update if RLS permits (it shouldn't for normal users)
    // But since we are the Admin User and RLS often allows "update own wallet" or we defined a specific RPC:
    /*
    create or replace function public.admin_recharge_wallet(...)
    */
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fallback: Try direct update (Works if RLS allows or if Admin)
    const { data: currentWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    const currentBalance = currentWallet?.[0]?.balance || 0;
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

    if (updateError) {
        // If direct update fails, it might be RLS. we can't do much without SQL console.
        console.error("Recharge failed:", updateError);
        throw new Error("No se pudo recargar. (Error de permisos/RPC missing)");
    }
};

// Events are now handled via Realtime, but keeping constant for ref if needed
export const EVENTS = {
    BINGO_UPDATE: 'bingo_update',
};

// --- BINGO (LOCAL ONLY FOR MVP) ---
// ... (Keeping bingo logic mostly as is, but maybe cleaning it up if needed. 
// actually, let's keep bingo strict local storage to avoid breaking it while focusing on Raffle)

// ... existing bingo functions ... 
// (I will actually read the file and only replace the RAFFLE section, leaving Bingo intact but note they are different systems now)

// --- RAFFLE SYSTEM (SUPABASE CLOUD) ---

export const getRaffles = async () => {
    const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const getRaffle = async (id) => {
    const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

export const createRaffle = async (name, minRange, maxRange, price, lotteryName = 'Manual', digits = 3, image = '', reservationMinutes = 15, drawDate = null, paymentInfo = '') => {
    const { data, error } = await supabase
        .from('raffles')
        .insert([
            {
                name,
                min_number: Number(minRange),
                max_number: Number(maxRange),
                price: Number(price),
                lottery_name: lotteryName,
                digits: Number(digits),
                image,
                reservation_minutes: Number(reservationMinutes),
                draw_date: drawDate,
                payment_info: paymentInfo,
                status: 'OPEN'
            }
        ])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateRaffle = async (raffleId, updates) => {
    // Map updates to Supabase column names if necessary
    const mappedUpdates = { ...updates };
    if (mappedUpdates.minRange !== undefined) {
        mappedUpdates.min_number = Number(mappedUpdates.minRange);
        delete mappedUpdates.minRange;
    }
    if (mappedUpdates.maxRange !== undefined) {
        mappedUpdates.max_number = Number(mappedUpdates.maxRange);
        delete mappedUpdates.maxRange;
    }
    if (mappedUpdates.lotteryName !== undefined) {
        mappedUpdates.lottery_name = mappedUpdates.lotteryName;
        delete mappedUpdates.lotteryName;
    }
    if (mappedUpdates.reservationMinutes !== undefined) {
        mappedUpdates.reservation_minutes = Number(mappedUpdates.reservationMinutes);
        delete mappedUpdates.reservationMinutes;
    }
    if (mappedUpdates.drawDate !== undefined) {
        mappedUpdates.draw_date = mappedUpdates.drawDate;
        delete mappedUpdates.drawDate;
    }

    // Add other mappings as needed (e.g., price, digits, image, status, winnerNumber, winnerName)
    if (mappedUpdates.price !== undefined) mappedUpdates.price = Number(mappedUpdates.price);
    if (mappedUpdates.digits !== undefined) mappedUpdates.digits = Number(mappedUpdates.digits);


    const { data, error } = await supabase
        .from('raffles')
        .update(mappedUpdates)
        .eq('id', raffleId)
        .select()
        .single();

    if (error) throw error;
    if (error) throw error;
    return data;
};

export const deleteRaffle = async (id) => {
    // 1. Security Check: Check for active tickets
    const { count, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('raffle_id', id);

    if (countError) throw countError;

    if (count > 0) {
        throw new Error(`Esta rifa tiene ${count} boletas vendidas/apartadas. No se puede eliminar por seguridad.`);
    }

    // 2. Delete if safe
    const { error } = await supabase
        .from('raffles')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

export const deleteGame = async (id) => {
    // 1. Security Check: Check for players
    const { count, error: countError } = await supabase
        .from('bingo_players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', id);

    if (countError) throw countError;

    if (count > 0) {
        throw new Error(`Este bingo tiene ${count} cartones registrados. No se puede eliminar.`);
    }

    const { error } = await supabase
        .from('bingo_games')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};


export const getRaffleTickets = async (raffleId) => {
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId);

    if (error) throw error;
    return data;
};

export const reserveTicket = async (raffleId, number, clientName, phone) => {
    // 1. Check if available (Optimistic check, DB will enforce unique constraint anyway)
    // For cloud, we try to insert. If it fails due to unique constraint, it's taken.

    // Also check reservation time logic logic could be backend, but for MVP we do client validation or just insert.
    // If ticket exists and is EXPIRED (logic needed), we should delete it or update it?
    // Supabase generic approach: Try insert.

    const { data, error } = await supabase
        .from('tickets')
        .insert([
            {
                raffle_id: raffleId,
                number: Number(number),
                buyer_name: clientName,
                phone: phone,
                status: 'RESERVED'
            }
        ])
        .select();

    if (error) {
        // If error code is unique violation (23505), someone took it.
        // Or we could implement logic: fetch ticket, check if expired, if so delete and claim.
        // For simplicity Phase 14 MVP: If error, it's busy.
        if (error.code === '23505') throw new Error('El número ya fue apartado por otra persona.');
        throw error;
    }
    return data;
};

export const markTicketPaid = async (raffleId, number, buyerName = "Venta Directa", phone = '', paymentDate = null) => {
    // Upsert allows updating if exists (e.g. converting Reservation to Paid)
    // If it doesn't exist, it creates it.
    const { data, error } = await supabase
        .from('tickets')
        .upsert([
            {
                raffle_id: raffleId,
                number: Number(number),
                buyer_name: buyerName,
                phone: phone,
                status: 'PAID',
                payment_date: paymentDate || new Date().toISOString() // New: Payment Date
            }
        ], { onConflict: 'raffle_id, number' }) // Important: Match unique constraint
        .select()
        .single();

    if (error) throw error;
    return data;
};

// 3. Release/Delete Ticket
export const releaseTicket = async (raffleId, number) => {
    const { error } = await supabase
        .from('tickets')
        .delete()
        .match({ raffle_id: raffleId, number: Number(number) });

    if (error) throw error;
};

export const submitPaymentProof = async (raffleId, ticketNumber, file) => {
    // Placeholder for Phase 2: Payment Proof Upload
    // const { data, error } = await supabase.storage.from('proofs').upload(...)
    return true;
};

// Alias for compatibility if used elsewhere, but ideally use markTicketPaid
export const sellRaffleTicket = markTicketPaid;


// --- BINGO LOGIC UTILITIES (Merged) ---

// Column ranges
const B_RANGE = [1, 15];
const I_RANGE = [16, 30];
const N_RANGE = [31, 45];
const G_RANGE = [46, 60];
const O_RANGE = [61, 75];

const RANGES = [B_RANGE, I_RANGE, N_RANGE, G_RANGE, O_RANGE];
const LETTERS = ['B', 'I', 'N', 'G', 'O'];

const getRandomNumbers = (min, max, count) => {
    const nums = new Set();
    while (nums.size < count) {
        nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return Array.from(nums);
};

export const generateBingoCard = () => {
    const card = [];
    RANGES.forEach((range, colIndex) => {
        const isNCol = colIndex === 2;
        const numbers = getRandomNumbers(range[0], range[1], 5);
        if (isNCol) {
            numbers[2] = 'FREE';
        }
        numbers.forEach((num, rowIndex) => {
            let cell = {
                id: `${LETTERS[colIndex]}-${rowIndex}`,
                letter: LETTERS[colIndex],
                number: num,
                row: rowIndex,
                col: colIndex,
                marked: num === 'FREE'
            };
            card.push(cell);
        });
    });
    return card;
};

export const generateBallSequence = () => {
    const balls = [];
    for (let i = 1; i <= 75; i++) {
        balls.push(i);
    }
    for (let i = balls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    return balls;
};

export const checkWin = (cardCells, currentPattern = 'FULL_HOUSE') => {
    const getCell = (r, c) => cardCells.find(cell => cell.row === r && cell.col === c);
    const isMarked = (r, c) => {
        const cell = getCell(r, c);
        return cell && cell.marked;
    };

    if (currentPattern === 'FULL_HOUSE') {
        return cardCells.every(cell => cell.marked);
    }
    if (currentPattern === 'HORIZONTAL_LINE') {
        for (let r = 0; r < 5; r++) {
            if ([0, 1, 2, 3, 4].every(c => isMarked(r, c))) return true;
        }
    }
    if (currentPattern === 'VERTICAL_LINE') {
        for (let c = 0; c < 5; c++) {
            if ([0, 1, 2, 3, 4].every(r => isMarked(r, c))) return true;
        }
    }
    if (currentPattern === 'DIAGONAL') {
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, i))) return true;
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, 4 - i))) return true;
    }
    return false;
};

