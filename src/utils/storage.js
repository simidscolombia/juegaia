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
    if (updates.winningPattern !== undefined) dbUpdates.winning_pattern = updates.winningPattern;

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
        .eq('id', gameId)
        .single();

    if (error) {
        console.error("Error fetching game:", error);
        return null;
    }
    return data;
};

// Player/Ticket Management
export const createTicket = async (gameId, playerName, cardMatrix, pin, status = 'PAID', phone = '', userId = null) => {
    // Note: cardMatrix should be passed in. If not, generate it here?
    // The previous code had a "todo" for generation. 
    // We will assume the UI generates it and passes it, or we import logic here.
    // For now, let's assume the UI handles generation to keep this pure storage.

    if (!cardMatrix) {
        // Fallback if not provided (safety)
        cardMatrix = generateBingoCard();
    }

    const payload = {
        game_id: gameId,
        name: playerName,
        card_matrix: cardMatrix,
        pin: pin,
        status: status,
        phone: phone
    };

    if (userId) payload.user_id = userId;

    const { data, error } = await supabase
        .from('bingo_players')
        .insert([payload])
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
        .eq('id', ticketId) // Added missing .eq('id', ticketId)
        .single(); // Added missing .single()

    if (error) throw error;
    return data || null; // Changed to data || null as single() returns object or null
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
    return data || null;
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

// Secure Game Creation (Deducts Balance) - SaaS Version
export const createGameService = async (serviceType, name, config = {}) => {
    // serviceType: 'BINGO' or 'RAFFLE'
    const { data, error } = await supabase
        .rpc('create_game_service', {
            p_service_type: serviceType,
            p_name: name,
            p_config: config
        });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return data; // { success: true, game_id: ... }
};

export const getSystemSettings = async () => {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*');

    if (error) return {};

    // Convert array to object { key: value }
    const settings = {};
    data.forEach(item => {
        settings[item.key] = item.value;
    });
    return settings;
};

export const adminUpdateSettings = async (settings) => {
    // Expects object { key: value }
    const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value)
    }));

    const { error } = await supabase
        .from('system_settings')
        .upsert(updates);

    if (error) throw error;
    return true;
};

// --- SUPER ADMIN USER MANAGEMENT ---

export const getAllProfiles = async () => {
    // Join with Wallets to see balance
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            wallets ( balance )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten structure for easier UI consumption
    return data.map(p => ({
        ...p,
        balance: p.wallets?.balance || 0
    }));
};

export const adminManualRecharge = async (userId, amount, reference = 'ADMIN_MANUAL') => {
    // Uses the same RPC but initiated by Admin
    // We mock a "wompi_id" to indicate it was manual
    const { data, error } = await supabase.rpc('process_recharge_with_mlm', {
        p_user_id: userId,
        p_amount: amount,
        p_reference: `MANUAL-${Date.now()}`,
        p_wompi_id: 'ADMIN-PANEL'
    });

    if (error) throw error;

    // Critical: Check logical success returned by RPC
    if (data && !data.success) {
        throw new Error(data.error || 'Error procesando recarga (Logic Failed)');
    }

    return data;
};

// Legacy Wallet Creation (Deprecated for SaaS RPC but kept for ref if needed)
export const createGameWithWallet = async (name) => {
    console.warn("createGameWithWallet is deprecated. Use createGameService");
    return createGameService('BINGO', name);
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
    const { data: { user } } = await supabase.auth.getUser();

    // If no user, return empty or throw, but for dashboard usually protected.
    // Return empty to avoid crash if called publicly by mistake, though RLS protects too.
    if (!user) return [];

    const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('owner_id', user.id)
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

export const reserveTicket = async (raffleId, numbers, clientName, phone, promiseDate = null, providedPin = null) => {
    // Support single number or array
    const numsToCheck = Array.isArray(numbers) ? numbers : [numbers];

    // Use provided PIN or Generate a SINGLE Random PIN for this batch reservation
    const batchPin = providedPin || Math.floor(1000 + Math.random() * 9000).toString();

    // Prepare rows
    const rows = numsToCheck.map(num => ({
        raffle_id: raffleId,
        number: Number(num),
        buyer_name: clientName,
        phone: phone,
        status: 'RESERVED',
        payment_promise_date: promiseDate || null,
        pin: batchPin // Store the generated/provided PIN
    }));

    const { data, error } = await supabase
        .from('tickets')
        .insert(rows)
        .select();

    if (error) {
        if (error.code === '23505') throw new Error('Uno o más números ya fueron apartados por otra persona.');
        throw error;
    }
    return data;
};

export const markTicketPaid = async (raffleId, number, buyerName = "Venta Directa", phone = '', paymentDate = null) => {
    // 1. Check if it exists to preserve PIN or Generate New One
    const { data: existing } = await supabase
        .from('tickets')
        .select('pin')
        .match({ raffle_id: raffleId, number: Number(number) })
        .maybeSingle();

    const pinToUse = existing?.pin || Math.floor(1000 + Math.random() * 9000).toString();

    // 2. Upsert
    const { data, error } = await supabase
        .from('tickets')
        .upsert([
            {
                raffle_id: raffleId,
                number: Number(number),
                buyer_name: buyerName,
                phone: phone, // Crucial for login
                status: 'PAID',
                pin: pinToUse, // Ensure PIN is set
                payment_date: paymentDate || new Date().toISOString()
            }
        ], { onConflict: 'raffle_id, number' })
        .select()
        .single();

    if (error) throw error;

    // Alert the admin of the PIN if it's a new sale so they can tell the user (Optional, but good UX)
    // We can't alert here easily as it's a utility, but the Dashboard will show it in the list.

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

export const adminUpdateUserRole = async (userId, newRole) => {
    // 1. Update Profile
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw error;
};

export const updateTicketStatus = async (ticketId, newStatus) => {
    const { data, error } = await supabase
        .from('tickets')
        .update({ status: newStatus, payment_date: newStatus === 'PAID' ? new Date().toISOString() : null })
        .eq('id', ticketId)
        .select();

    if (error) throw error;
    return data;
};

export const submitPaymentProof = async (raffleId, ticketNumber, file) => {
    // 1. Upload File
    const fileExt = file.name.split('.').pop();
    const fileName = `${raffleId}_${ticketNumber}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Ensure bucket exists or handle error (we assume 'raffle-proofs' exists)
    const { error: uploadError } = await supabase.storage
        .from('raffle-proofs')
        .upload(filePath, file);

    if (uploadError) throw new Error('Error subiendo imagen: ' + uploadError.message);

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('raffle-proofs')
        .getPublicUrl(filePath);

    // 3. Update Ticket
    const { data, error } = await supabase
        .from('tickets')
        .update({
            payment_proof_url: publicUrl,
            // Optional: We can change status or keep it as RESERVED but with proof
        })
        .match({ raffle_id: raffleId, number: Number(ticketNumber) })
        .select();

    if (error) throw error;
    return publicUrl;
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

export const deleteBingoPlayer = async (playerId) => {
    // Uses the generic ticket deletion or specific table deletion
    const { error } = await supabase
        .from('bingo_players')
        .delete()
        .eq('id', playerId);

    if (error) throw error;
    return true;
};

export const saveRaffleWinner = async (raffleId, winnerNumber) => {
    // 1. Find the ticket that has this number
    const { data: ticket, error: tErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId)
        .eq('number', winnerNumber)
        .single();

    // It's possible no one bought it, so ticket might be null.
    // However, we still save the number.

    const updates = {
        winner_number: winnerNumber,
        status: 'CLOSED'
    };

    if (ticket) {
        updates.winner_ticket_id = ticket.id;
    }

    const { error } = await supabase.from('raffles').update(updates).eq('id', raffleId);
    if (error) throw error;
};

// --- SUPER ADMIN FUNCTIONS ---

export const getAllAllGames = async () => {
    // Fetch ALL bingos and raffles without user filter
    const { data: bingos, error: bErr } = await supabase
        .from('bingo_games')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false });

    if (bErr) throw bErr;

    const { data: raffles, error: rErr } = await supabase
        .from('raffles')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false });

    if (rErr) throw rErr;

    // Normalize and combine
    const allBingos = bingos.map(b => ({ ...b, type: 'BINGO', owner: b.profiles }));
    const allRaffles = raffles.map(r => ({ ...r, type: 'RIFA', owner: r.profiles }));

    return [...allBingos, ...allRaffles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};


export const adminDeleteGame = async (gameId, type) => {
    if (type === 'BINGO') {
        // 1. Delete Players/Tickets for this game
        const { error: tErr } = await supabase.from('bingo_players').delete().eq('game_id', gameId);
        if (tErr) throw tErr;

        // 2. Delete Game
        const { error } = await supabase.from('bingo_games').delete().eq('id', gameId);
        if (error) throw error;
    } else {
        // RAFFLE
        // 1. Delete Tickets
        const { error: tErr } = await supabase.from('tickets').delete().eq('raffle_id', gameId);
        if (tErr) throw tErr;

        // 2. Delete Raffle
        const { error } = await supabase.from('raffles').delete().eq('id', gameId);
        if (error) throw error;
    }
};

export const adminDeleteUser = async (userId) => {
    // SECURE FULL DELETE via RPC (Deletes Auth + Data)
    const { error } = await supabase.rpc('delete_user_full', {
        target_user_id: userId
    });

    if (error) {
        console.error("Delete Error:", error);
        throw new Error("Error eliminando usuario: " + error.message);
    }

    return true;
};



export const verifyGamePin = async (phone, pin) => {
    console.log(`[verifyGamePin] Verifying user: Phone=${phone}, Pin=${pin}`);

    if (!phone || !pin) throw new Error("Teléfono y PIN son requeridos");

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    // 1. Search in Bingo Players
    const { data: bingoData, error: bingoError } = await supabase
        .from('bingo_players')
        .select('*, bingo_games(name)')
        .eq('pin', cleanPin)
        .ilike('phone', `%${cleanPhone}%`)
        .maybeSingle(); // Changed to maybeSingle to avoid PGRST116 error log

    if (bingoError) {
        console.error("[verifyGamePin] Bingo Query Error:", bingoError);
        // Continue to check Raffle, or throw? 
        // If it's a DB error (not just not found), maybe we should throw?
        // But maybeSingle won't return error for "not found". 
        // So if error, it's real.
        throw new Error("Error verificando Bingo: " + bingoError.message);
    }

    if (bingoData) {
        console.log("[verifyGamePin] Found in Bingo:", bingoData);
        return {
            type: 'BINGO',
            gameId: bingoData.game_id,
            ticketId: bingoData.id,
            data: bingoData
        };
    }

    // 2. Search in Raffle Tickets (Strict PIN check)
    const { data: raffleData, error: raffleError } = await supabase
        .from('tickets')
        .select('*, raffles(name)')
        .eq('pin', cleanPin)
        .ilike('phone', `%${cleanPhone}%`) // Ensure phone matches
        .limit(1)
        .maybeSingle();

    if (raffleError) {
        console.error("[verifyGamePin] Raffle Query Error:", raffleError);
        throw new Error("Error verificando Rifa: " + raffleError.message);
    }

    if (raffleData) {
        console.log("[verifyGamePin] Found in Raffle:", raffleData);
        return {
            type: 'RAFFLE',
            gameId: raffleData.raffle_id,
            ticketId: raffleData.id,
            data: raffleData
        };
    }

    console.warn("[verifyGamePin] No match found.");
    throw new Error('Credenciales inválidas. Verifica tu celular y el PIN de 4 dígitos (recibido al reservar).');
};

export const adminUpdateUserReferrer = async (childEmail, parentCode) => {
    // This calls the postgres function we just created logic in db_fix_referral_logic.sql
    // manual_link_referral(p_child_email TEXT, p_parent_code TEXT)

    // We can call it via RPC if we exposed it or just query directly if we made it a function convertible to RPC
    // But since it returns text, let's use rpc()
    const { data, error } = await supabase
        .rpc('manual_link_referral', {
            p_child_email: childEmail,
            p_parent_code: parentCode
        });

    if (error) throw error;

    if (data && typeof data === 'string' && data.startsWith('Error')) {
        throw new Error(data);
    }

    return data;
};


