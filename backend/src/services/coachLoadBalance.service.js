/**
 * Coach Load Balancing Service
 *
 * Implements center-first, progressive coach activation with composite scoring:
 *   coachScore = (distanceFromCenter × 0.4) + (occupancy × 0.6)
 *
 * Lower score = better coach to recommend next.
 */

const MAX_OCCUPANCY = 0.90;       // Hard cap — stop showing seats above this
const NEARLY_FULL_THRESHOLD = 0.70; // Coaches above this get NEARLY_FULL status
const NEXT_STAGE_THRESHOLD = 0.70;  // A stage's avg occupancy must exceed this to unlock next stage

const DISTANCE_WEIGHT = 0.4;
const OCCUPANCY_WEIGHT = 0.6;

/**
 * Returns integer distance of a coach from the center.
 * @param {number} coachIndex - 0-based index
 * @param {number} totalCoaches
 * @returns {number}
 */
function calcDistanceFromCenter(coachIndex, totalCoaches) {
    const center = (totalCoaches - 1) / 2; // e.g. 8 coaches → center = 3.5
    return Math.abs(coachIndex - center);
}

/**
 * Returns normalized distance score (0–1 range).
 * @param {number} distanceFromCenter
 * @param {number} maxDistance
 * @returns {number}
 */
function normalizeDistance(distanceFromCenter, maxDistance) {
    if (maxDistance === 0) return 0;
    return distanceFromCenter / maxDistance;
}

/**
 * Returns the activation stage (1 = center, higher = outer ends).
 * Divides coaches into 4 bands ordered from center outward.
 * @param {number} distanceFromCenter
 * @param {number} maxDistance
 * @returns {number} 1–4
 */
function calcStage(distanceFromCenter, maxDistance) {
    if (maxDistance === 0) return 1;
    const ratio = distanceFromCenter / maxDistance;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.50) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

/**
 * Parses seatNumber string (e.g. "S1-12", "3A-45") and extracts coachId.
 * @param {string} seatNumber
 * @returns {string|null}
 */
function extractCoachId(seatNumber) {
    if (!seatNumber) return null;
    const dashIdx = seatNumber.lastIndexOf('-');
    if (dashIdx === -1) return null;
    return seatNumber.substring(0, dashIdx); // "S1" from "S1-12"
}

/**
 * Main allocation engine.
 *
 * @param {Array}  coaches              - Coach objects from seatLayout
 * @param {Array}  confirmedPassengers  - CNF passengers from pnr_bookings (with seatNumber)
 * @param {number} passengerCount       - How many seats the user needs (default 1)
 * @returns {Array} Enriched coach list with scoring, status, and groupFit fields
 */
export function computeCoachAllocations(coaches, confirmedPassengers = [], passengerCount = 1) {

    // 1. Build a map of confirmed passenger counts per coachId
    const bookedPerCoach = {};
    for (const p of confirmedPassengers) {
        const coachId = extractCoachId(p.seatNumber);
        if (!coachId) continue;
        bookedPerCoach[coachId] = (bookedPerCoach[coachId] || 0) + 1;
    }

    const totalCoaches = coaches.length;
    const maxDistance = (totalCoaches - 1) / 2;

    // 2. Compute raw metrics for each coach
    const enriched = coaches.map((coach, index) => {
        const totalSeats = coach.totalSeats || coach.seats?.length || 1;
        const bookedSeats = bookedPerCoach[coach.coachId] || 0;
        const freeSeats = Math.max(0, totalSeats - bookedSeats);
        const occupancy = bookedSeats / totalSeats;

        const distanceFromCenter = calcDistanceFromCenter(index, totalCoaches);
        const normalizedDist = normalizeDistance(distanceFromCenter, maxDistance);
        const coachScore = (normalizedDist * DISTANCE_WEIGHT) + (occupancy * OCCUPANCY_WEIGHT);
        const stage = calcStage(distanceFromCenter, maxDistance);

        // Can this coach fit the whole group?
        const groupFit = freeSeats >= passengerCount ? 'FULL_FIT' : (freeSeats > 0 ? 'PARTIAL_FIT' : 'NO_FIT');

        return {
            ...coach,
            _index: index,
            distanceFromCenter: Math.round(distanceFromCenter * 10) / 10,
            bookedSeats,
            freeSeats,
            totalSeats,
            occupancy: Math.round(occupancy * 1000) / 1000,
            coachScore: Math.round(coachScore * 1000) / 1000,
            stage,
            groupFit
        };
    });

    // 3. Determine which stages are unlocked (progressive activation)
    const stageGroups = { 1: [], 2: [], 3: [], 4: [] };
    for (const c of enriched) stageGroups[c.stage].push(c);

    const stageUnlocked = { 1: true, 2: false, 3: false, 4: false };

    for (let stage = 1; stage <= 3; stage++) {
        const group = stageGroups[stage];
        if (group.length === 0) {
            stageUnlocked[stage + 1] = stageUnlocked[stage];
            continue;
        }
        const avgOccupancy = group.reduce((sum, c) => sum + c.occupancy, 0) / group.length;
        stageUnlocked[stage + 1] = avgOccupancy >= NEXT_STAGE_THRESHOLD;
    }

    // 4. Check if ANY visible coach can fit the entire group.
    //    If none can, we fall back to showing partial-fit coaches too.
    const anyFullFitVisible = enriched.some(c =>
        stageUnlocked[c.stage] && c.groupFit === 'FULL_FIT' && c.occupancy < MAX_OCCUPANCY
    );

    // 5. Assign status and visibility
    const result = enriched.map(coach => {
        const isUnlocked = stageUnlocked[coach.stage];

        // Visibility rules:
        // - Normally: only show unlocked-stage coaches
        // - Fallback: if no full-fit coach exists, also show partial-fit coaches from any stage
        const isFallbackCandidate = !anyFullFitVisible && coach.groupFit === 'PARTIAL_FIT';
        const isVisible = isUnlocked || isFallbackCandidate;

        let status;
        if (coach.occupancy >= MAX_OCCUPANCY || coach.freeSeats === 0) {
            status = 'FULL';
        } else if (!anyFullFitVisible && coach.groupFit === 'PARTIAL_FIT') {
            // Only partial seats available for the group in this coach
            status = 'PARTIAL';
        } else if (coach.occupancy >= NEARLY_FULL_THRESHOLD) {
            status = 'NEARLY_FULL';
        } else if (coach.groupFit === 'FULL_FIT' && (coach.stage === 1 || coach.coachScore <= 0.3)) {
            status = 'RECOMMENDED';
        } else {
            status = 'AVAILABLE';
        }

        return {
            coachId: coach.coachId,
            classCode: coach.classCode,
            coachTypeId: coach.coachTypeId,
            totalSeats: coach.totalSeats,
            freeSeats: coach.freeSeats,
            rowStructure: coach.rowStructure ?? null,
            bookedSeats: coach.bookedSeats,
            occupancy: coach.occupancy,
            coachScore: coach.coachScore,
            distanceFromCenter: coach.distanceFromCenter,
            stage: coach.stage,
            groupFit,   // FULL_FIT | PARTIAL_FIT | NO_FIT
            isVisible,
            isFallback: isFallbackCandidate,  // true = this coach only shows because no full-fit exists
            status,     // RECOMMENDED | AVAILABLE | NEARLY_FULL | PARTIAL | FULL
        };
    });

    // 6. Sort:
    //    1st: FULL_FIT visible coaches by coachScore ascending
    //    2nd: PARTIAL_FIT fallback coaches by freeSeats descending (most available first)
    //    Hidden (NO_FIT or locked-stage non-fallback): excluded from visible list
    result.sort((a, b) => {
        if (!a.isVisible && !b.isVisible) return 0;
        if (a.isVisible !== b.isVisible) return a.isVisible ? -1 : 1;

        // Both visible: full-fit before partial
        if (a.groupFit !== b.groupFit) {
            if (a.groupFit === 'FULL_FIT') return -1;
            if (b.groupFit === 'FULL_FIT') return 1;
        }

        // Among PARTIAL_FIT, prefer more free seats
        if (a.groupFit === 'PARTIAL_FIT' && b.groupFit === 'PARTIAL_FIT') {
            return b.freeSeats - a.freeSeats;
        }

        // Among FULL_FIT, lower coachScore is better
        return a.coachScore - b.coachScore;
    });

    return result;
}
